"""Redis-backed session history.

A conversation's recent messages live in a Redis list keyed by session id,
capped at 50 entries and expiring after 24h.  This is the short-term memory
the orchestrator loads at the start of a turn (so follow-up questions have
the preceding exchange) — distinct from the long-term entity graph in
graph.py.

All methods no-op gracefully when Redis is unavailable so a cache outage
never breaks a conversation; it just loses cross-turn recall for that run.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_MAX_MESSAGES = 50
_TTL_SECONDS = 86_400  # 24h


def _key(session_id: str) -> str:
    return f"session:{session_id}:messages"


class SessionManager:
    """Rolling per-session message history in Redis."""

    def __init__(self, redis: "aioredis.Redis | None") -> None:
        self.redis = redis

    async def get_history(self, session_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Return the last ``limit`` messages (oldest→newest)."""
        if self.redis is None:
            return []
        try:
            raw = await self.redis.lrange(_key(session_id), -limit, -1)
        except Exception as exc:  # noqa: BLE001
            logger.warning("get_history failed for %s: %s", session_id, exc)
            return []
        history: list[dict[str, Any]] = []
        for item in raw:
            try:
                history.append(json.loads(item))
            except (TypeError, ValueError):
                continue
        return history

    async def add_message(self, session_id: str, role: str, content: str) -> None:
        """Append a message, trim to the last 50, refresh the 24h TTL."""
        if self.redis is None:
            return
        msg = {
            "role": role,
            "content": content,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        try:
            key = _key(session_id)
            async with self.redis.pipeline(transaction=False) as pipe:
                pipe.rpush(key, json.dumps(msg))
                pipe.ltrim(key, -_MAX_MESSAGES, -1)
                pipe.expire(key, _TTL_SECONDS)
                await pipe.execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning("add_message failed for %s: %s", session_id, exc)

    async def get_session_metadata(self, session_id: str) -> dict[str, Any]:
        """Return lightweight metadata (message count) for a session."""
        count = 0
        if self.redis is not None:
            try:
                count = await self.redis.llen(_key(session_id))
            except Exception as exc:  # noqa: BLE001
                logger.warning("get_session_metadata failed for %s: %s", session_id, exc)
        return {"session_id": session_id, "message_count": count}

    async def clear_session(self, session_id: str) -> None:
        """Delete a session's message history (Neo4j cleared separately)."""
        if self.redis is None:
            return
        try:
            await self.redis.delete(_key(session_id))
        except Exception as exc:  # noqa: BLE001
            logger.warning("clear_session failed for %s: %s", session_id, exc)
