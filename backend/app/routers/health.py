"""Health and readiness endpoints.

GET /health  →  liveness: always 200 if the process is alive.
GET /ready   →  readiness: 200 only if all dependencies respond.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app import __version__
from app.models import HealthResponse, ReadyResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def healthcheck(request: Request) -> HealthResponse:
    """Liveness probe. Returns 200 if the FastAPI process is alive.

    Bypassed by the rate limiter (see HEALTH_PATHS in main.py).
    """
    start = getattr(request.app.state, "start_time", time.time())
    return HealthResponse(
        status="ok",
        version=__version__,
        uptime_seconds=time.time() - start,
    )


@router.get("/ready", response_model=ReadyResponse, responses={503: {"model": ReadyResponse}})
async def readycheck(request: Request) -> JSONResponse:
    """Readiness probe. 200 if Postgres + Redis + Neo4j all respond, else 503.

    Each dependency is probed independently so the response reports which
    one is failing — useful when triaging from /docs or curl.
    """
    deps: dict[str, bool] = {"postgres": False, "redis": False, "neo4j": False}

    # ─── Postgres ──
    pool = getattr(request.app.state, "db_pool", None)
    if pool is not None:
        try:
            async with pool.acquire() as conn:
                await conn.execute("SELECT 1")
            deps["postgres"] = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("ready: postgres probe failed: %s", exc)

    # ─── Redis ──
    redis = getattr(request.app.state, "redis", None)
    if redis is not None:
        try:
            await redis.ping()
            deps["redis"] = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("ready: redis probe failed: %s", exc)

    # ─── Neo4j ──
    neo4j_driver = getattr(request.app.state, "neo4j", None)
    if neo4j_driver is not None:
        try:
            await neo4j_driver.verify_connectivity()
            deps["neo4j"] = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("ready: neo4j probe failed: %s", exc)

    all_ok = all(deps.values())
    body = ReadyResponse(
        status="ready" if all_ok else "degraded",
        dependencies=deps,
    )
    return JSONResponse(
        content=body.model_dump(),
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
