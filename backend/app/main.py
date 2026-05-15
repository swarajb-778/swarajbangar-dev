"""FastAPI application entry point.

Responsibilities:
  - Lifespan: create + tear down asyncpg pool, redis client, neo4j driver,
    pre-load the embedding + reranker models into memory.
  - Middleware: CORS, request logging (with Redis counters), per-IP rate
    limiting via Redis sliding window.
  - Routers: health, rag, agent, ws, stats.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.config import get_settings
from app.routers import agent, health, rag, stats, ws

logger = logging.getLogger("swarajbangar.api")


def _sanitize_dsn(dsn: str) -> str:
    """Make a Postgres DSN safe for Python 3.13's stricter URL parser.

    Python 3.13 tightened URL host validation and now rejects unencoded
    ``@``, ``[``, ``]`` inside the password portion.  We find the password by
    splitting on the LAST ``@`` (the user:pass / host boundary) and
    re-encode it idempotently: ``unquote`` first so an already-encoded
    password ("Pa%23ss") stays correct, then ``quote`` so any raw special
    chars get encoded.  Net effect: ``unencoded → encoded``, already
    ``encoded → encoded`` (no-op round-trip).
    """
    import re
    from urllib.parse import quote, unquote

    m = re.match(r"^(postgresql|postgres)://([^:@]+):(.+)@([^@]+)$", dsn)
    if m:
        scheme, user, password, rest = m.groups()
        decoded = unquote(password)
        return f"{scheme}://{user}:{quote(decoded, safe='')}@{rest}"
    return dsn


# ════════════════════════════════════════════════════════════════════
# ── Lifespan: own all shared resources ──
# ════════════════════════════════════════════════════════════════════


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create resources on startup, close them on shutdown.

    All long-lived clients live on app.state so request handlers can
    pull them via the providers in app.dependencies.
    """
    settings = get_settings()
    boot_start = time.monotonic()

    app.state.start_time = time.time()
    app.state.settings = settings

    # ─── Lazy imports keep cold-start fast and let `python -m py_compile`
    #     succeed even without the heavy ML deps installed. ──
    import asyncpg
    import neo4j
    import redis.asyncio as aioredis
    from sentence_transformers import CrossEncoder

    from app.rag.embedder import LocalEmbedder

    # Postgres connection pool (Supabase pgbouncer)
    try:
        app.state.db_pool = await asyncpg.create_pool(
            dsn=_sanitize_dsn(settings.DATABASE_URL),
            min_size=1,
            max_size=settings.database_pool_size,
            command_timeout=10,
        )
        logger.info("postgres pool ready (max_size=%d)", settings.database_pool_size)
    except Exception as exc:  # noqa: BLE001
        logger.warning("postgres pool failed to start: %s — continuing without DB", exc)
        app.state.db_pool = None

    # Redis client (decode_responses=False — we may store binary later)
    try:
        app.state.redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        await app.state.redis.ping()
        logger.info("redis ready")
    except Exception as exc:  # noqa: BLE001
        logger.warning("redis unavailable: %s — rate limiting and caching disabled", exc)
        app.state.redis = None

    # Neo4j async driver
    app.state.neo4j = neo4j.AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    try:
        await app.state.neo4j.verify_connectivity()
        logger.info("neo4j ready")
    except Exception as exc:  # noqa: BLE001 — degrade gracefully if Neo4j is down
        logger.warning("neo4j connectivity check failed: %s", exc)

    # Pre-load models (cached in Docker image layer; first run downloads them).
    # LocalEmbedder owns the SentenceTransformer model and exposes async
    # embed_text / embed_batch with Redis caching.
    app.state.embedder = LocalEmbedder(
        model_name=settings.EMBEDDING_MODEL,
        redis_client=app.state.redis,
    )

    try:
        app.state.reranker = CrossEncoder(settings.RERANKER_MODEL)
        logger.info("reranker loaded: %s", settings.RERANKER_MODEL)
    except Exception as exc:  # noqa: BLE001 — reranker is optional
        logger.warning("reranker failed to load (continuing without): %s", exc)
        app.state.reranker = None

    logger.info("backend ready in %.1fs", time.monotonic() - boot_start)

    try:
        yield
    finally:
        # ─── Shutdown ──
        logger.info("backend shutting down")
        if hasattr(app.state, "db_pool"):
            await app.state.db_pool.close()
        if hasattr(app.state, "redis"):
            await app.state.redis.aclose()
        if hasattr(app.state, "neo4j"):
            await app.state.neo4j.close()


# ════════════════════════════════════════════════════════════════════
# ── App factory ──
# ════════════════════════════════════════════════════════════════════


settings = get_settings()
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(
    title="swarajbangar.dev API",
    version=__version__,
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)


# ════════════════════════════════════════════════════════════════════
# ── Middleware (registration order is reverse of execution order) ──
# ════════════════════════════════════════════════════════════════════


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


# ─── Rate limiting (per-IP sliding window via Redis ZADD/ZREMRANGEBYSCORE) ──
RATE_LIMITS: dict[str, int] = {
    "/v1/agent/orchestrate": 30,  # per minute
    "/v1/rag/query": 20,
    "/v1/stats": 60,
    "_default": 100,
}
HEALTH_PATHS = frozenset({"/health", "/ready", "/", "/docs", "/openapi.json"})


def _limit_for_path(path: str) -> int:
    for prefix, limit in RATE_LIMITS.items():
        if prefix != "_default" and path.startswith(prefix):
            return limit
    return RATE_LIMITS["_default"]


@app.middleware("http")
async def rate_limit_and_log(request: Request, call_next):
    """Combined: rate limit by IP, then log request + bump Redis counters.

    Both concerns share access to Redis, so combining them avoids two
    round trips per request.
    """
    redis = getattr(request.app.state, "redis", None)
    path = request.url.path
    client_ip = request.client.host if request.client else "unknown"

    # ─── Rate limiting (skip for health + docs) ──
    if redis is not None and path not in HEALTH_PATHS:
        limit = _limit_for_path(path)
        window_s = 60
        now_ms = int(time.time() * 1000)
        key = f"rl:{client_ip}:{path}"

        try:
            async with redis.pipeline(transaction=False) as pipe:
                pipe.zremrangebyscore(key, 0, now_ms - window_s * 1000)
                pipe.zadd(key, {str(now_ms): now_ms})
                pipe.zcard(key)
                pipe.expire(key, window_s + 1)
                _, _, count, _ = await pipe.execute()

            if count > limit:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": f"Rate limit: {limit}/minute"},
                    headers={"Retry-After": str(window_s)},
                )
        except Exception as exc:  # noqa: BLE001 — fail open if Redis is down
            logger.warning("rate limiter Redis call failed (fail open): %s", exc)

    # ─── Process request ──
    started = time.monotonic()
    response = await call_next(request)
    elapsed_ms = (time.monotonic() - started) * 1000.0

    # ─── Logging + counters ──
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        path,
        response.status_code,
        elapsed_ms,
    )

    if redis is not None and path not in HEALTH_PATHS:
        try:
            async with redis.pipeline(transaction=False) as pipe:
                pipe.incr("requests:total")
                pipe.incr("requests:today")
                pipe.expire("requests:today", 86_400)
                if response.status_code >= 400:
                    pipe.incr("requests:errors")
                await pipe.execute()
        except Exception as exc:  # noqa: BLE001
            logger.debug("metrics counter failed: %s", exc)

    return response


# ════════════════════════════════════════════════════════════════════
# ── Routers ──
# ════════════════════════════════════════════════════════════════════


app.include_router(health.router, tags=["health"])
app.include_router(rag.router, prefix="/v1/rag", tags=["rag"])
app.include_router(agent.router, prefix="/v1/agent", tags=["agent"])
app.include_router(ws.router, prefix="/v1", tags=["ws"])
app.include_router(stats.router, prefix="/v1/stats", tags=["stats"])


# ════════════════════════════════════════════════════════════════════
# ── Root ──
# ════════════════════════════════════════════════════════════════════


@app.get("/", include_in_schema=False)
async def root() -> dict[str, object]:
    """API entry point — discovery + version info."""
    return {
        "name": "swarajbangar.dev API",
        "version": __version__,
        "docs": "/docs",
        "endpoints": [
            "health",
            "ready",
            "v1/rag/query",
            "v1/agent/orchestrate",
        ],
    }
