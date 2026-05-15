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
