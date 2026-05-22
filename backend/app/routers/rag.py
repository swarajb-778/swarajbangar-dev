"""RAG endpoints — query, embed, document summary, 3D embedding explorer.

POST /v1/rag/query           hybrid search → rerank → Claude answer
POST /v1/rag/embed           one-shot embedding for the explorer demo
GET  /v1/rag/documents       per-source chunk counts
GET  /v1/rag/embeddings/3d   UMAP projection of all chunks (cached in Redis)
"""

import asyncio
import hashlib
import json
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.dependencies import (
    DbPoolDep,
    EmbedderDep,
)
from app.models import (
    RAGDocumentSummary,
    RAGDocumentsResponse,
    RAGEmbedRequest,
    RAGEmbedResponse,
    RAGEmbedding3DPoint,
    RAGEmbeddings3DResponse,
    RAGQueryRequest,
    RAGQueryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ════════════════════════════════════════════════════════════════════
# ── /query — end-to-end RAG with Redis response cache ──
# ════════════════════════════════════════════════════════════════════

_QUERY_CACHE_TTL_SECONDS = 300
_QUERY_CACHE_PREFIX = "ragq:v1:"


def _query_cache_key(req: RAGQueryRequest) -> str:
    """Stable hash of the inputs that determine the response.

    ``show_pipeline`` is intentionally excluded — it only controls
    presentation of an identical underlying answer.  Including it would
    cache the same answer twice.
    """
    payload = json.dumps(
        {
            "q": req.query,
            "k": req.top_k,
            "src": req.source_filter,
        },
        sort_keys=True,
    ).encode()
    return _QUERY_CACHE_PREFIX + hashlib.sha256(payload).hexdigest()


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    summary="Run a hybrid-search + rerank + Claude query.",
)
async def rag_query(
    req: RAGQueryRequest,
    response: Response,
    request: Request,
) -> RAGQueryResponse:
    """Hybrid RAG query.

    Response is cached in Redis for 5 minutes keyed by (query, top_k,
    source_filter).  The ``X-Cache-Hit`` header indicates whether the
    response came from cache; the frontend uses it to render a small
    indicator on the X-ray panel.
    """
    pipeline = getattr(request.app.state, "rag_pipeline", None)
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG pipeline unavailable (DB pool not initialized).",
        )

    redis = getattr(request.app.state, "redis", None)
    cache_key = _query_cache_key(req)

    # ─── Cache lookup ──
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis get failed for rag query cache: %s", exc)
            cached = None
        if cached:
            try:
                payload = json.loads(cached)
                cached_has_pipeline = bool(payload.get("pipeline"))
                # Only serve cache hit when the cached shape matches what
                # the caller asked for (compact vs. with-pipeline).
                # Otherwise fall through to a fresh run so we can produce
                # the requested shape.
                if (not req.show_pipeline) or cached_has_pipeline:
                    if not req.show_pipeline:
                        payload["pipeline"] = []
                    response.headers["X-Cache-Hit"] = "1"
                    return RAGQueryResponse.model_validate(payload)
            except Exception as exc:  # noqa: BLE001
                logger.warning("cached rag query was malformed: %s", exc)

    response.headers["X-Cache-Hit"] = "0"

    # ─── Run the pipeline ──
    try:
        result = await pipeline.query(
            query=req.query,
            top_k=req.top_k,
            show_pipeline=req.show_pipeline,
            source_filter=req.source_filter,
        )
    except Exception as exc:
        logger.exception("rag pipeline failed for query=%r", req.query[:80])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG pipeline error: {exc}",
        ) from exc

    # ─── Cache the result we just produced.  If the caller asked for
    #     show_pipeline=False, we cache the compact form; a later
    #     show_pipeline=True hit will then bypass the cache and recompute.
    #     That's the simple trade-off — easy to reason about, and the
    #     X-ray UI is the only consumer of the heavy shape.
    if redis is not None:
        try:
            await redis.setex(
                cache_key,
                _QUERY_CACHE_TTL_SECONDS,
                json.dumps(result.model_dump(mode="json")),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis setex failed for rag query cache: %s", exc)

    return result


# ════════════════════════════════════════════════════════════════════
# ── /embed — one-shot embedding for the explorer demo ──
# ════════════════════════════════════════════════════════════════════


@router.post(
    "/embed",
    response_model=RAGEmbedResponse,
    summary="Return the 384-dim embedding for an input string.",
)
async def rag_embed(req: RAGEmbedRequest, embedder: EmbedderDep) -> RAGEmbedResponse:
    """Single-shot embedding for the frontend embedding-explorer demo.

    The embedder caches by SHA-256 of input text in Redis (30-day TTL),
    so repeated calls with the same string are effectively free.
    """
    t0 = time.perf_counter()
    vector = await embedder.embed_text(req.text)
    latency_ms = (time.perf_counter() - t0) * 1000
    return RAGEmbedResponse(
        embedding=vector,
        dimensions=embedder.dimensions,
        model=embedder.model_name,
        latency_ms=round(latency_ms, 2),
    )


# ════════════════════════════════════════════════════════════════════
# ── /documents — per-source summary ──
# ════════════════════════════════════════════════════════════════════


@router.get(
    "/documents",
    response_model=RAGDocumentsResponse,
    summary="Corpus summary grouped by source.",
)
async def list_documents(db: DbPoolDep) -> RAGDocumentsResponse:
    """Per-source chunk count + most recent ingestion timestamp."""
    sql = """
        SELECT source,
               COUNT(*)        AS chunk_count,
               MAX(created_at) AS latest_update
        FROM documents
        GROUP BY source
        ORDER BY source
    """
    rows = await db.fetch(sql)
    summaries = [
        RAGDocumentSummary(
            source=r["source"],
            chunk_count=r["chunk_count"],
            latest_update=r["latest_update"],
        )
        for r in rows
    ]
    total = sum(s.chunk_count for s in summaries)
    return RAGDocumentsResponse(documents=summaries, total_chunks=total)


# ════════════════════════════════════════════════════════════════════
# ── /embeddings/3d — UMAP projection (Redis-cached) ──
# ════════════════════════════════════════════════════════════════════

_UMAP_CACHE_PREFIX = "rag3d:v1:"
# UMAP runs on full corpus and is slow (~3-8s for our size).  Cache
# indefinitely; auto-bust when the corpus version key changes.
_UMAP_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days hard cap


async def _corpus_version_key(db: Any) -> str:
    """Cheap fingerprint of the corpus.

    Combines row count + most-recent ``created_at`` so any ingestion
    automatically invalidates the cached projection without us needing
    a webhook from the ingest script.
    """
    row = await db.fetchrow(
        "SELECT COUNT(*) AS n, MAX(created_at) AS ts FROM documents"
    )
    return f"{row['n']}:{row['ts'].isoformat() if row['ts'] else 'empty'}"


async def _compute_umap_3d(
    db: Any, embedder: Any
) -> list[RAGEmbedding3DPoint]:
    """Pull every chunk's embedding and reduce to 3D via UMAP."""
    import numpy as np  # local import keeps cold-start trim
    import umap  # type: ignore[import-not-found]

    rows = await db.fetch(
        """
        SELECT id::text AS id,
               source,
               LEFT(content, 160) AS text_preview,
               embedding::text    AS embedding_text
        FROM documents
        WHERE embedding IS NOT NULL
        ORDER BY id
        """
    )
    if not rows:
        return []

    # ``embedding::text`` returns ``[0.1,0.2,...]``; parse to ndarray.
    def parse(s: str) -> list[float]:
        return [float(x) for x in s.strip("[]").split(",")]

    vectors = np.array([parse(r["embedding_text"]) for r in rows], dtype="float32")

    # n_neighbors must be < n_samples.  Clamp for tiny corpora.
    n_neighbors = min(15, max(2, len(rows) - 1))
    reducer = umap.UMAP(
        n_components=3,
        n_neighbors=n_neighbors,
        min_dist=0.1,
        metric="cosine",
        random_state=42,
    )
    # UMAP is sync + CPU-bound; off-load to a thread so we don't block
    # the event loop for several seconds during the cold compute.
    loop = asyncio.get_event_loop()
    coords = await loop.run_in_executor(None, lambda: reducer.fit_transform(vectors))

    points: list[RAGEmbedding3DPoint] = []
    for r, xyz in zip(rows, coords):
        points.append(
            RAGEmbedding3DPoint(
                id=r["id"],
                x=float(xyz[0]),
                y=float(xyz[1]),
                z=float(xyz[2]),
                text_preview=r["text_preview"] or "",
                source=r["source"],
            )
        )
    return points


@router.get(
    "/embeddings/3d",
    response_model=RAGEmbeddings3DResponse,
    summary="UMAP-projected embeddings for the 3D explorer.",
)
async def embeddings_3d(
    request: Request,
    db: DbPoolDep,
    embedder: EmbedderDep,
) -> RAGEmbeddings3DResponse:
    """Return all documents projected to 3D via UMAP.

    Cached in Redis keyed by a corpus fingerprint (row count + last
    created_at).  Any new ingestion auto-invalidates the cache; explicit
    bust isn't required.  Without Redis we degrade to recompute-every-time
    rather than 503'ing (the demo is still usable, just slow).
    """
    redis = getattr(request.app.state, "redis", None)
    version = await _corpus_version_key(db)
    cache_key = _UMAP_CACHE_PREFIX + hashlib.sha256(version.encode()).hexdigest()

    if redis is not None:
        try:
            cached = await redis.get(cache_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis get failed for umap cache: %s", exc)
            cached = None
        if cached:
            try:
                payload = json.loads(cached)
                points = [RAGEmbedding3DPoint(**p) for p in payload]
                return RAGEmbeddings3DResponse(points=points, cached=True)
            except Exception as exc:  # noqa: BLE001
                logger.warning("cached umap projection was malformed: %s", exc)

    points = await _compute_umap_3d(db, embedder)

    if redis is not None:
        try:
            await redis.setex(
                cache_key,
                _UMAP_CACHE_TTL_SECONDS,
                json.dumps([p.model_dump() for p in points]),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis setex failed for umap cache: %s", exc)

    return RAGEmbeddings3DResponse(points=points, cached=False)
