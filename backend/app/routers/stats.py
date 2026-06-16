"""Stats endpoints — feed the Observability Wall on the frontend.

``GET /v1/stats``         live service metrics (requests, latency p95,
                          error rate, uptime, active WS sessions, cache).
``GET /v1/stats/github``  GitHub profile stats (1h Redis cache; curated
                          fallback when no token is configured).

Counters are maintained by the request-logging middleware in main.py.
Everything is None/zero-safe so a fresh deploy (or a Redis outage) returns
sensible defaults rather than raising.
"""

from __future__ import annotations

import json
import logging
import time

import httpx
from fastapi import APIRouter, Request

from app.dependencies import SettingsDep
from app.models import (
    IntentCount,
    IntentDistributionResponse,
    StatsTimeseriesPoint,
    StatsTimeseriesResponse,
)

# Redis keys owned by the stats sampler loop / agent router (see main.py,
# routers/agent.py). Kept in sync with those producers.
_STATS_HISTORY_KEY = "stats:history"
_INTENTS_HASH_KEY = "agent:intents"

logger = logging.getLogger(__name__)

router = APIRouter()

_GITHUB_USERNAME = "swarajb-778"
_GITHUB_CACHE_KEY = "stats:github:v1"
_GITHUB_CACHE_TTL = 3600

_GITHUB_FALLBACK = {
    "public_repos": 12,
    "contributions_last_year": 234,
    "top_languages": ["Python", "Go", "TypeScript"],
    "source": "static_fallback",
}


def _as_int(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


@router.get("")
async def stats(request: Request) -> dict[str, float | int]:
    """Live service metrics for the Observability Wall.

    Reads Redis counters + the precomputed p95 latency, and the live
    WebSocket session count from the in-process ConnectionManager.
    """
    state = request.app.state
    redis = getattr(state, "redis", None)
    ws_manager = getattr(state, "ws_manager", None)

    total = today = errors_today = agent_today = 0
    cache_hits = cache_misses = 0
    p95 = p50 = 0.0

    if redis is not None:
        try:
            async with redis.pipeline(transaction=False) as pipe:
                pipe.get("requests:total")
                pipe.get("requests:today")
                pipe.get("requests:errors")
                pipe.get("agent:interactions:today")
                pipe.get("latency:p95")
                pipe.get("cache:hits:today")
                pipe.get("cache:misses:today")
                pipe.get("latency:p50")
                results = await pipe.execute()
            total = _as_int(results[0])
            today = _as_int(results[1])
            errors_today = _as_int(results[2])
            agent_today = _as_int(results[3])
            p95 = float(results[4]) if results[4] else 0.0
            cache_hits = _as_int(results[5])
            cache_misses = _as_int(results[6])
            p50 = float(results[7]) if results[7] else 0.0
        except Exception as exc:  # noqa: BLE001 — degrade to zeros on Redis error
            logger.warning("stats Redis read failed: %s", exc)

    cache_total = cache_hits + cache_misses
    uptime = time.time() - getattr(state, "start_time", time.time())
    active_sessions = len(ws_manager.active) if ws_manager is not None else 0

    return {
        "total_requests": total,
        "requests_today": today,
        "p95_latency_ms": round(p95, 1),
        "p50_latency_ms": round(p50, 1),
        "error_rate": round(errors_today / max(today, 1), 4),
        "uptime_seconds": round(uptime, 1),
        "uptime_percent": 100.0,  # placeholder until incident tracking lands
        "agent_interactions_today": agent_today,
        "active_sessions": active_sessions,
        "cache_hit_rate": round(cache_hits / max(cache_total, 1), 4),
    }


@router.get("/github")
async def github_stats(request: Request, settings: SettingsDep) -> dict:
    """GitHub profile stats, cached in Redis for 1 hour.

    Falls back to curated numbers when no ``GITHUB_TOKEN`` is configured or
    the API call fails.
    """
    redis = getattr(request.app.state, "redis", None)

    if redis is not None:
        try:
            cached = await redis.get(_GITHUB_CACHE_KEY)
            if cached:
                return json.loads(cached)
        except Exception as exc:  # noqa: BLE001
            logger.warning("github stats cache read failed: %s", exc)

    if not settings.GITHUB_TOKEN:
        data = dict(_GITHUB_FALLBACK)
    else:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://api.github.com/users/{_GITHUB_USERNAME}",
                    headers={
                        "Authorization": f"token {settings.GITHUB_TOKEN}",
                        "Accept": "application/vnd.github+json",
                    },
                )
                resp.raise_for_status()
                raw = resp.json()
            data = {
                "public_repos": raw.get("public_repos", 0),
                "followers": raw.get("followers", 0),
                "following": raw.get("following", 0),
                "name": raw.get("name"),
                "bio": raw.get("bio"),
                "source": "github_api",
            }
        except Exception as exc:  # noqa: BLE001 — degrade to curated on any failure
            logger.warning("github stats API call failed: %s", exc)
            data = dict(_GITHUB_FALLBACK)

    if redis is not None:
        try:
            await redis.setex(_GITHUB_CACHE_KEY, _GITHUB_CACHE_TTL, json.dumps(data))
        except Exception as exc:  # noqa: BLE001
            logger.warning("github stats cache write failed: %s", exc)

    return data


@router.get("/timeseries", response_model=StatsTimeseriesResponse)
async def stats_timeseries(request: Request) -> StatsTimeseriesResponse:
    """Rolling p50/p95/request history for the metrics timeseries chart.

    Reads the capped ``stats:history`` list maintained by the background
    sampler in main.py.  Returns an empty list (not an error) when Redis is
    unavailable or no samples have been recorded yet.
    """
    redis = getattr(request.app.state, "redis", None)
    points: list[StatsTimeseriesPoint] = []
    if redis is not None:
        try:
            raw = await redis.lrange(_STATS_HISTORY_KEY, 0, -1)
        except Exception as exc:  # noqa: BLE001
            logger.warning("stats history read failed: %s", exc)
            raw = []
        for item in raw:
            try:
                points.append(StatsTimeseriesPoint(**json.loads(item)))
            except Exception as exc:  # noqa: BLE001 — skip a malformed sample
                logger.debug("skipping malformed history sample: %s", exc)
    return StatsTimeseriesResponse(points=points)


@router.get("/intents", response_model=IntentDistributionResponse)
async def stats_intents(request: Request) -> IntentDistributionResponse:
    """Agent interactions grouped by classified intent (donut source).

    Reads the ``agent:intents`` hash incremented by the agent router on each
    completed ``classify`` step.  Sorted descending; zero-safe.
    """
    redis = getattr(request.app.state, "redis", None)
    intents: list[IntentCount] = []
    if redis is not None:
        try:
            raw = await redis.hgetall(_INTENTS_HASH_KEY)
        except Exception as exc:  # noqa: BLE001
            logger.warning("intents read failed: %s", exc)
            raw = {}
        intents = [IntentCount(name=k, value=_as_int(v)) for k, v in raw.items()]
        intents.sort(key=lambda i: i.value, reverse=True)
    total = sum(i.value for i in intents)
    return IntentDistributionResponse(intents=intents, total=total)
