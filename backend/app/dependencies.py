"""Shared async resource providers (DI for FastAPI handlers).

All resources are created ONCE during the lifespan context manager in
main.py and stored on app.state. These provider functions read them
back so handlers can declare them via `Depends(...)`.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated, Any

from fastapi import Depends, Request

from app.config import Settings, get_settings

if TYPE_CHECKING:  # avoid heavy imports at module load
    import asyncpg
    import neo4j
    import redis.asyncio as aioredis

    from app.rag.embedder import LocalEmbedder
    from app.rag.pipeline import RAGPipeline
    from app.rag.reranker import CrossEncoderReranker
    from app.rag.retriever import HybridRetriever


# ════════════════════════════════════════════════════════════════════
# ── Settings ──
# ════════════════════════════════════════════════════════════════════


def settings_dep() -> Settings:
    """Return the singleton Settings instance.

    Wrapper around get_settings() so handlers can write
    `s: Settings = Depends(settings_dep)`.
    """
    return get_settings()


SettingsDep = Annotated[Settings, Depends(settings_dep)]


# ════════════════════════════════════════════════════════════════════
# ── Redis (created in lifespan, stored on app.state.redis) ──
# ════════════════════════════════════════════════════════════════════


def get_redis(request: Request) -> "aioredis.Redis":
    """Return the shared async Redis client.

    Raises if Redis was not initialized (lifespan must have run).
    """
    client = getattr(request.app.state, "redis", None)
    if client is None:
        raise RuntimeError("Redis client not initialized — lifespan did not run.")
    return client


RedisDep = Annotated[Any, Depends(get_redis)]


# ════════════════════════════════════════════════════════════════════
# ── Postgres pool (asyncpg.Pool on app.state.db_pool) ──
# ════════════════════════════════════════════════════════════════════


def get_db_pool(request: Request) -> "asyncpg.Pool":
    """Return the shared asyncpg connection pool.

    Raises if the pool was not initialized.
    """
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise RuntimeError("Postgres pool not initialized — lifespan did not run.")
    return pool


DbPoolDep = Annotated[Any, Depends(get_db_pool)]


# ════════════════════════════════════════════════════════════════════
# ── Neo4j driver (on app.state.neo4j) ──
# ════════════════════════════════════════════════════════════════════


def get_neo4j(request: Request) -> "neo4j.AsyncDriver":
    """Return the shared async Neo4j driver.

    Raises if the driver was not initialized.
    """
    driver = getattr(request.app.state, "neo4j", None)
    if driver is None:
        raise RuntimeError("Neo4j driver not initialized — lifespan did not run.")
    return driver


Neo4jDep = Annotated[Any, Depends(get_neo4j)]


# ════════════════════════════════════════════════════════════════════
# ── Embedder (LocalEmbedder on app.state.embedder) ──
# ════════════════════════════════════════════════════════════════════


def get_embedder(request: Request) -> "LocalEmbedder":
    """Return the shared LocalEmbedder instance.

    Raises if the embedder was not initialized.
    """
    embedder = getattr(request.app.state, "embedder", None)
    if embedder is None:
        raise RuntimeError("Embedder not initialized — lifespan did not run.")
    return embedder


EmbedderDep = Annotated[Any, Depends(get_embedder)]


# ════════════════════════════════════════════════════════════════════
# ── Retriever / Reranker / RAGPipeline (built once in lifespan) ──
# ════════════════════════════════════════════════════════════════════


def get_retriever(request: Request) -> "HybridRetriever":
    """Return the shared HybridRetriever."""
    retriever = getattr(request.app.state, "retriever", None)
    if retriever is None:
        raise RuntimeError(
            "HybridRetriever not initialized — DB pool likely failed at startup."
        )
    return retriever


RetrieverDep = Annotated[Any, Depends(get_retriever)]


def get_reranker(request: Request) -> "CrossEncoderReranker":
    """Return the shared CrossEncoderReranker.

    Always returns the wrapper instance — its ``.available`` flag tells
    callers whether the underlying model loaded successfully.
    """
    reranker = getattr(request.app.state, "reranker", None)
    if reranker is None:
        raise RuntimeError("Reranker not initialized — lifespan did not run.")
    return reranker


RerankerDep = Annotated[Any, Depends(get_reranker)]


def get_rag_pipeline(request: Request) -> "RAGPipeline":
    """Return the shared RAGPipeline orchestrator."""
    pipeline = getattr(request.app.state, "rag_pipeline", None)
    if pipeline is None:
        raise RuntimeError(
            "RAGPipeline not initialized — DB pool likely failed at startup."
        )
    return pipeline


RAGPipelineDep = Annotated[Any, Depends(get_rag_pipeline)]
