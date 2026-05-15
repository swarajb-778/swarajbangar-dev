"""Stats endpoints — feeds the Observability Wall on the frontend.

Reads counters maintained by the request-logging middleware.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import RedisDep

router = APIRouter()


@router.get("")
async def stats(redis: RedisDep) -> dict[str, int | float]:
    """Aggregate counters: total requests, today, errors.

    Returns zeros for any missing key — never raises on a fresh deploy.
    """
    keys = ["requests:total", "requests:today", "requests:errors"]
    values = await redis.mget(*keys)
    total, today, errors = (int(v or 0) for v in values)
    error_rate = (errors / total) if total else 0.0
    return {
        "requests_total": total,
        "requests_today": today,
        "requests_errors": errors,
        "error_rate": round(error_rate, 4),
    }
