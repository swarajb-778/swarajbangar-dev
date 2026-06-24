"""Hybrid retrieval: dense (pgvector HNSW) + lexical (Postgres FTS / BM25-style),
fused via Reciprocal Rank Fusion.

Why hybrid:
  Dense embedding search captures semantic matches ("AI engineer" ≈
  "machine learning person") but misses literal entity names ("McKinsey",
  "LangGraph", "RAG") when they tokenize into rare or unseen sub-words.
  Lexical search is the opposite — strong on literal matches, weak on
  paraphrase.  RRF fuses both ranked lists without needing to calibrate
  scores across the two metric spaces.

Why RRF (not weighted sum):
  Cosine similarity and ts_rank_cd live on different scales and their
  distributions shift with query length.  RRF only consumes ranks, so the
  fusion is robust to those scale differences.  Standard k = 60.

Fallback path:
  If ``plainto_tsquery`` returns zero rows (e.g. the query is one rare
  acronym), we fall back to trigram similarity so we still surface
  *something* lexically.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import asyncpg

    from app.config import Settings
    from app.rag.embedder import LocalEmbedder

logger = logging.getLogger(__name__)


class HybridRetriever:
    """Run dense + lexical search in parallel and fuse with RRF."""

    def __init__(
        self,
        db_pool: "asyncpg.Pool",
        embedder: "LocalEmbedder",
        settings: "Settings",
    ) -> None:
        self.db = db_pool
        self.embedder = embedder
        self.settings = settings
        # Configurable weights kept for future tuning — RRF doesn't use
        # them today but a follow-up experiment may switch to weighted
        # rank fusion.
        self.vector_weight = 0.7
        self.bm25_weight = 0.3
        # Standard Reciprocal Rank Fusion constant from the original paper
        # (Cormack et al. 2009).  Dampens the contribution of low-ranked
        # documents.
        self.rrf_k = 60

    # ─── Stage 1a: dense (HNSW) ───────────────────────────────────────

    async def vector_search(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        source_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """ANN search on the embedding column.

        ``<=>`` is pgvector's cosine-distance operator.  We invert it
        (``1 - distance``) so the caller sees a similarity-style score
        where higher is better, matching the convention used by BM25.
        """
        # Pass the embedding as a pgvector string literal to keep the path
        # codec-agnostic.  Avoids depending on register_vector() running on
        # every pooled connection (transaction-mode poolers can shuffle).
        vec_lit = "[" + ",".join(f"{x:.7f}" for x in query_embedding) + "]"
        sql = """
            SELECT id::text, content, source, title, metadata,
                   1 - (embedding <=> $1::vector) AS score
            FROM documents
            WHERE ($2::text IS NULL OR source = $2)
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        """
        rows = await self.db.fetch(sql, vec_lit, source_filter, top_k)
        return [self._row_to_dict(r) for r in rows]

    # ─── Stage 1b: lexical (FTS, trigram fallback) ────────────────────

    async def bm25_search(
        self,
        query: str,
        top_k: int = 10,
        source_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """Postgres FTS ranking; falls back to trigram on zero hits."""
        sql_primary = """
            SELECT id::text, content, source, title, metadata,
                   ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS score
            FROM documents
            WHERE search_vector @@ plainto_tsquery('english', $1)
              AND ($2::text IS NULL OR source = $2)
            ORDER BY score DESC
            LIMIT $3
        """
        rows = await self.db.fetch(sql_primary, query, source_filter, top_k)
        if rows:
            return [self._row_to_dict(r) for r in rows]

        # Fallback: trigram similarity.  Useful for queries that boil down
        # to one rare token where the FTS dictionary stems it away.
        sql_trgm = """
            SELECT id::text, content, source, title, metadata,
                   similarity(content, $1) AS score
            FROM documents
            WHERE similarity(content, $1) > 0.1
              AND ($2::text IS NULL OR source = $2)
            ORDER BY score DESC
            LIMIT $3
        """
        rows = await self.db.fetch(sql_trgm, query, source_filter, top_k)
        if rows:
            logger.info("bm25 fell back to trigram for query=%r", query[:80])
        return [self._row_to_dict(r) for r in rows]

    # ─── Stage 2: fuse ────────────────────────────────────────────────

    async def hybrid_search(
        self,
        query: str,
        top_k: int = 5,
        source_filter: str | None = None,
        candidate_pool: int = 10,
    ) -> dict[str, Any]:
        """End-to-end hybrid retrieval with per-stage timings.

        ``candidate_pool`` is how many hits we ask each retriever for
        before fusion — bigger pool → better recall, more work.
        """
        start = time.perf_counter()

        # 1. Embed
        t0 = time.perf_counter()
        query_emb = await self.embedder.embed_text(query)
        embed_ms = (time.perf_counter() - t0) * 1000

        # 2. Run dense + lexical in parallel.
        t_search = time.perf_counter()
        t_vec_start = time.perf_counter()
        vector_task = asyncio.create_task(
            self.vector_search(
                query_emb, top_k=candidate_pool, source_filter=source_filter
            )
        )
        t_bm25_start = time.perf_counter()
        bm25_task = asyncio.create_task(
            self.bm25_search(
                query, top_k=candidate_pool, source_filter=source_filter
            )
        )
        vec_results = await vector_task
        vector_ms = (time.perf_counter() - t_vec_start) * 1000
        bm25_results = await bm25_task
        bm25_ms = (time.perf_counter() - t_bm25_start) * 1000
        search_ms = (time.perf_counter() - t_search) * 1000

        # 3. Reciprocal Rank Fusion.
        t0 = time.perf_counter()
        scores: dict[str, dict[str, Any]] = {}
        for rank, r in enumerate(vec_results):
            doc_id = r["id"]
            scores.setdefault(
                doc_id,
                {**r, "vector_score": r["score"], "bm25_score": 0.0, "rrf_score": 0.0},
            )
            scores[doc_id]["rrf_score"] += 1.0 / (self.rrf_k + rank + 1)
        for rank, r in enumerate(bm25_results):
            doc_id = r["id"]
            if doc_id in scores:
                scores[doc_id]["bm25_score"] = r["score"]
            else:
                scores[doc_id] = {
                    **r,
                    "vector_score": 0.0,
                    "bm25_score": r["score"],
                    "rrf_score": 0.0,
                }
            scores[doc_id]["rrf_score"] += 1.0 / (self.rrf_k + rank + 1)

        fused = sorted(
            scores.values(), key=lambda x: x["rrf_score"], reverse=True
        )
        fusion_ms = (time.perf_counter() - t0) * 1000

        total_ms = (time.perf_counter() - start) * 1000

        return {
            "results": fused[:top_k],
            "query_embedding": query_emb,
            "timings": {
                "embed_ms": embed_ms,
                "vector_search_ms": vector_ms,
                "bm25_search_ms": bm25_ms,
                "search_parallel_ms": search_ms,
                "fusion_ms": fusion_ms,
                "total_ms": total_ms,
            },
            "counts": {
                "vector": len(vec_results),
                "bm25": len(bm25_results),
                "fused": len(fused),
                "returned": min(len(fused), top_k),
            },
        }

    # ─── Internals ────────────────────────────────────────────────────

    @staticmethod
    def _row_to_dict(row: Any) -> dict[str, Any]:
        """Normalize an asyncpg Record into a plain dict.

        ``metadata`` is stored as JSONB; asyncpg returns it as a string
        until we parse it (no codec registered server-side via pgbouncer).
        """
        import json

        d = dict(row)
        meta = d.get("metadata")
        if isinstance(meta, str):
            try:
                d["metadata"] = json.loads(meta)
            except (TypeError, ValueError):
                d["metadata"] = {}
        elif meta is None:
            d["metadata"] = {}
        return d
