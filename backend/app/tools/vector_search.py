"""vector_search tool — hybrid RAG over Swaraj's embedded documents.

This tool runs a higher-recall retrieval than the bare
``HybridRetriever.hybrid_search`` used elsewhere:

  1. Dense vector search (pgvector cosine) AND lexical search in parallel.
  2. Lexical search uses an **OR-joined** ``to_tsquery`` rather than
     ``plainto_tsquery``.  plainto ANDs every term, so a natural-language
     question like "What did Swaraj build at McKinsey?" becomes
     ``swaraj & build & amazon`` — which matches no single chunk (the
     corpus rarely contains all three) and silently returns nothing.
     OR semantics let a strong keyword ("amazon") pull its chunk in.
  3. Reciprocal Rank Fusion merges the two ranked lists.
  4. A cross-encoder reranker (when registered) re-scores the fused pool.
     This is what rescues large, embedding-diluted chunks (e.g. the whole
     McKinsey role section) that rank low on raw cosine but are clearly the
     best answer once query+doc are scored together.

Resources (db pool, embedder, reranker) come from the global tool
registry so the LangChain @tool signature stays clean.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any

from langchain_core.tools import tool

from app.tools.registry import get_global_reranker, get_global_retriever

logger = logging.getLogger(__name__)

# Candidate pool size pulled from each retriever before fusion/rerank.
_POOL = 20
_RRF_K = 60

# Minimal English stopword set — enough to keep the OR tsquery focused on
# content words (entities, technologies) rather than question scaffolding.
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "build", "built", "by",
    "did", "do", "does", "for", "from", "has", "have", "he", "her", "him",
    "his", "how", "i", "in", "is", "it", "its", "make", "made", "me", "of",
    "on", "or", "she", "tell", "that", "the", "their", "them", "they",
    "this", "to", "use", "used", "uses", "using", "was", "what", "when",
    "where", "which", "who", "why", "with", "you", "your",
}


def _vector_literal(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.7f}" for x in vec) + "]"


def _or_tsquery(query: str) -> str | None:
    """Build an OR-joined tsquery string from a natural-language query."""
    terms = []
    for raw in query.lower().split():
        term = re.sub(r"[^a-z0-9]", "", raw)
        if term and len(term) > 2 and term not in _STOPWORDS:
            terms.append(term)
    return " | ".join(dict.fromkeys(terms)) if terms else None


def _norm_row(row: Any) -> dict[str, Any]:
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        try:
            d["metadata"] = json.loads(meta)
        except (TypeError, ValueError):
            d["metadata"] = {}
    return d


async def _vector_rows(db: Any, lit: str, source_filter: str | None, k: int) -> list[dict]:
    sql = """
        SELECT id::text AS id, content, source, title, metadata,
               1 - (embedding <=> $1::vector) AS score
        FROM documents
        WHERE ($2::text IS NULL OR source = $2)
        ORDER BY embedding <=> $1::vector
        LIMIT $3
    """
    rows = await db.fetch(sql, lit, source_filter, k)
    return [_norm_row(r) for r in rows]


async def _bm25_rows(
    db: Any, raw_query: str, or_tq: str | None, source_filter: str | None, k: int
) -> list[dict]:
    if or_tq:
        sql = """
            SELECT id::text AS id, content, source, title, metadata,
                   ts_rank_cd(search_vector, to_tsquery('english', $1)) AS score
            FROM documents
            WHERE search_vector @@ to_tsquery('english', $1)
              AND ($2::text IS NULL OR source = $2)
            ORDER BY score DESC
            LIMIT $3
        """
        try:
            rows = await db.fetch(sql, or_tq, source_filter, k)
            if rows:
                return [_norm_row(r) for r in rows]
        except Exception as exc:  # noqa: BLE001 — malformed tsquery → trigram
            logger.warning("OR tsquery failed (%s); falling back to trigram", exc)

    # Trigram fallback for queries that tokenize away under FTS.
    sql_trgm = """
        SELECT id::text AS id, content, source, title, metadata,
               similarity(content, $1) AS score
        FROM documents
        WHERE similarity(content, $1) > 0.1
          AND ($2::text IS NULL OR source = $2)
        ORDER BY score DESC
        LIMIT $3
    """
    rows = await db.fetch(sql_trgm, raw_query, source_filter, k)
    return [_norm_row(r) for r in rows]


def _rrf_fuse(vec_rows: list[dict], bm25_rows: list[dict]) -> list[dict]:
    scores: dict[str, dict[str, Any]] = {}
    for rank, r in enumerate(vec_rows):
        d = scores.setdefault(r["id"], {**r, "vector_score": r["score"], "bm25_score": 0.0, "rrf": 0.0})
        d["rrf"] += 1.0 / (_RRF_K + rank + 1)
    for rank, r in enumerate(bm25_rows):
        if r["id"] in scores:
            scores[r["id"]]["bm25_score"] = r["score"]
        else:
            scores[r["id"]] = {**r, "vector_score": 0.0, "bm25_score": r["score"], "rrf": 0.0}
        scores[r["id"]]["rrf"] += 1.0 / (_RRF_K + rank + 1)
    return sorted(scores.values(), key=lambda x: x["rrf"], reverse=True)


@tool
async def vector_search(
    query: str,
    source_filter: str | None = None,
    top_k: int = 5,
) -> dict[str, Any]:
    """Search Swaraj's embedded documents (resume, projects, case studies)
    for information relevant to a query. Returns the top matching chunks
    with relevance scores and source labels.

    Use this for any factual question about Swaraj's background.
    ``source_filter`` may be one of: resume, case_study, about, project, blog.
    """
    retriever = get_global_retriever()
    if retriever is None:
        logger.warning("vector_search invoked but no retriever registered")
        return {"chunks": [], "count": 0, "latency_ms": 0.0, "note": "Retriever not available"}

    t0 = time.perf_counter()
    db = retriever.db
    embedder = retriever.embedder

    query_vec = await embedder.embed_text(query)
    lit = _vector_literal(query_vec)
    or_tq = _or_tsquery(query)

    vec_rows, bm25_rows = await asyncio.gather(
        _vector_rows(db, lit, source_filter, _POOL),
        _bm25_rows(db, query, or_tq, source_filter, _POOL),
    )

    fused = _rrf_fuse(vec_rows, bm25_rows)
    pool = fused[: _POOL]

    # Rerank the fused pool when a cross-encoder is registered — this is
    # what surfaces the right chunk for entity queries.
    reranker = get_global_reranker()
    if reranker is not None and getattr(reranker, "available", False) and pool:
        rr = await reranker.rerank(query, pool, top_k=top_k)
        results = rr["results"]
        score_key = "reranker_score"
    else:
        results = pool[:top_k]
        score_key = "rrf"

    chunks = [
        {
            "content": c.get("content", ""),
            "source": c.get("source", "unknown"),
            "title": c.get("title"),
            "score": float(c.get(score_key, c.get("rrf", 0.0)) or 0.0),
        }
        for c in results
    ]
    return {
        "chunks": chunks,
        "count": len(chunks),
        "latency_ms": (time.perf_counter() - t0) * 1000,
    }
