"""Daily token-budget guard.

A soft cap on Anthropic token spend per UTC day, enforced via a single
Redis counter (``budget:tokens:today``).  The counter is created with a
TTL that expires at the next UTC midnight, so it rolls over on its own
without a cron.

Usage pattern (per LLM call):

    if not await budget_available(redis, settings):
        return BUDGET_EXCEEDED_MESSAGE          # graceful fallback
    resp = await anthropic.messages.create(...)
    await record_tokens(redis, settings, resp.usage.input_tokens
                                       + resp.usage.output_tokens)

The guard fails OPEN: if Redis is unavailable we allow the call rather
than block the whole agent on a cache outage.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import redis.asyncio as aioredis

    from app.config import Settings

logger = logging.getLogger(__name__)

_BUDGET_KEY = "budget:tokens:today"

BUDGET_EXCEEDED_MESSAGE = (
    "I've had a busy day and hit my daily compute budget! Try again "
    "tomorrow, or use the terminal — type `help` to see what's available "
    "right now (it runs entirely client-side, no budget required)."
)


def _seconds_until_utc_midnight() -> int:
    """Seconds from now until the next 00:00 UTC."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return max(1, int((tomorrow - now).total_seconds()))


async def budget_available(
    redis: "aioredis.Redis | None",
    settings: "Settings",
) -> bool:
    """True if today's token usage is still under the daily cap.

    Fails open (returns True) when Redis is unavailable or the budget is
    disabled (DAILY_TOKEN_BUDGET <= 0).
    """
    if settings.DAILY_TOKEN_BUDGET <= 0:
        return True
    if redis is None:
        return True
    try:
        used_raw = await redis.get(_BUDGET_KEY)
        used = int(used_raw) if used_raw else 0
        return used < settings.DAILY_TOKEN_BUDGET
    except Exception as exc:  # noqa: BLE001 — budget is best-effort
        logger.warning("budget check failed, allowing call: %s", exc)
        return True


async def record_tokens(
    redis: "aioredis.Redis | None",
    settings: "Settings",
    tokens: int,
) -> None:
    """Add ``tokens`` to today's counter, (re)setting the midnight TTL.

    We INCRBY then ensure a TTL exists.  Using a pipeline keeps it to one
    round-trip; the EXPIRE is set every call but only "sticks" meaningfully
    on the first write of the day (subsequent EXPIREs just refresh it to
    the same midnight boundary, which is harmless).
    """
    if tokens <= 0 or redis is None or settings.DAILY_TOKEN_BUDGET <= 0:
        return
    try:
        ttl = _seconds_until_utc_midnight()
        async with redis.pipeline(transaction=True) as pipe:
            pipe.incrby(_BUDGET_KEY, tokens)
            pipe.expire(_BUDGET_KEY, ttl)
            await pipe.execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("budget record failed: %s", exc)
