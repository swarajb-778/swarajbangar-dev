"""Neo4j knowledge graph — entity extraction + relationship memory.

The graph stores two kinds of nodes:
  - ``Entity`` (name unique) — a technology / company / concept / person /
    project, with a ``type`` and recency timestamps.
  - ``Session`` (session_id unique) — one conversation.

And the edges that make it useful:
  - ``(Session)-[:DISCUSSED]->(Entity)`` — what a conversation touched,
    with a running ``count`` and the ``context`` it first came up in.
  - ``(Entity)-[:RELATED_TO]->(Entity)`` — co-occurrence within a turn,
    plus the seeded domain relationships (USED_AT / IMPLEMENTS / …).

Entity extraction uses Haiku with a strict JSON contract, cached by text
hash in Redis (1h).  If the LLM is unavailable or returns garbage, a
keyword fallback keeps memory working with zero API dependency.

Every method is defensive: a Neo4j outage degrades to empty results /
no-ops rather than raising, so the agent keeps answering even when its
long-term memory is down.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import neo4j
    import redis.asyncio as aioredis
    from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

_EXTRACT_MODEL = "claude-haiku-4-5-20251001"
_ENTITY_CACHE_TTL = 3600  # 1 hour
_VALID_TYPES = {"technology", "company", "concept", "person", "project"}


# Keyword fallback table — grounded in the resume corpus.
_KNOWN_ENTITIES: dict[str, str] = {
    "Python": "technology", "Go": "technology", "Rust": "technology",
    "Java": "technology", "TypeScript": "technology", "JavaScript": "technology",
    "Kafka": "technology", "Redis": "technology", "Docker": "technology",
    "Kubernetes": "technology", "LangGraph": "technology", "LangChain": "technology",
    "pgvector": "technology", "Neo4j": "technology", "PyTorch": "technology",
    "React": "technology", "Next.js": "technology", "FastAPI": "technology",
    "Apache Spark": "technology", "Spring Boot": "technology",
    "Amazon": "company", "Meshi.io": "company", "Softgenio": "company",
    "Softgenio Technology": "company", "Black Box Corporation": "company",
    "Collaborito": "project", "RapidOrch": "project", "SwarajOS": "project",
    "RAG": "concept", "CQRS": "concept", "Event Sourcing": "concept",
    "RAG Pipeline": "concept", "Event-Driven Architecture": "concept",
}


def _fallback_keyword_extraction(text: str) -> list[dict[str, str]]:
    """Match known entity names against ``text`` (case-insensitive)."""
    lowered = text.lower()
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    for name, type_ in _KNOWN_ENTITIES.items():
        if name.lower() in lowered and name not in seen:
            found.append({"name": name, "type": type_})
            seen.add(name)
    return found


class KnowledgeGraph:
    """Entity + relationship memory over a Neo4j async driver."""

    def __init__(
        self,
        driver: "neo4j.AsyncDriver",
        anthropic: "AsyncAnthropic",
        redis: "aioredis.Redis | None",
    ) -> None:
        self.driver = driver
        self.anthropic = anthropic
        self.redis = redis

    # ─── Schema ──────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """Create constraints + indexes (idempotent)."""
        statements = [
            "CREATE CONSTRAINT entity_name IF NOT EXISTS "
            "FOR (e:Entity) REQUIRE e.name IS UNIQUE",
            "CREATE CONSTRAINT session_id IF NOT EXISTS "
            "FOR (s:Session) REQUIRE s.session_id IS UNIQUE",
            "CREATE INDEX entity_type IF NOT EXISTS "
            "FOR (e:Entity) ON (e.type)",
        ]
        async with self.driver.session() as s:
            for stmt in statements:
                await s.run(stmt)
        logger.info("knowledge graph schema ready")

    # ─── Entity extraction ───────────────────────────────────────────

    async def extract_entities(self, text: str) -> list[dict[str, str]]:
        """Extract named entities from ``text`` (Haiku + cache + fallback)."""
        cache_key = f"entities:v1:{hashlib.sha256(text.encode()).hexdigest()[:16]}"
        if self.redis is not None:
            try:
                cached = await self.redis.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as exc:  # noqa: BLE001
                logger.debug("entity cache read failed: %s", exc)

        prompt = (
            "Extract named entities from this text. Return ONLY valid JSON, "
            "no markdown fences. Format:\n"
            '[{"name": "...", "type": "..."}]\n\n'
            "Valid types: technology, company, concept, person, project.\n"
            "Only include entities clearly named. Skip pronouns and generic terms.\n\n"
            f"Text: {text[:2000]}"
        )

        entities: list[dict[str, str]]
        try:
            response = await self.anthropic.messages.create(
                model=_EXTRACT_MODEL,
                max_tokens=400,
                temperature=0,
                messages=[{"role": "user", "content": prompt}],
            )
            body = re.sub(
                r"^```(?:json)?\s*|\s*```$",
                "",
                response.content[0].text.strip(),
            ).strip()
            parsed = json.loads(body)
            entities = parsed if isinstance(parsed, list) else []
            # Validate + normalize: keep only well-formed, typed entries.
            entities = [
                {"name": str(e["name"]).strip(), "type": str(e.get("type", "")).strip()}
                for e in entities
                if isinstance(e, dict)
                and e.get("name")
                and e.get("type") in _VALID_TYPES
            ]
            if not entities:
                entities = _fallback_keyword_extraction(text)
        except Exception as exc:  # noqa: BLE001 — any failure → keyword fallback
            logger.warning("entity extraction failed (%s); using keyword fallback", exc)
            entities = _fallback_keyword_extraction(text)

        if self.redis is not None:
            try:
                await self.redis.setex(cache_key, _ENTITY_CACHE_TTL, json.dumps(entities))
            except Exception as exc:  # noqa: BLE001
                logger.debug("entity cache write failed: %s", exc)

        return entities

    # ─── Writes ──────────────────────────────────────────────────────

    async def store_interaction(
        self,
        session_id: str,
        user_message: str,
        agent_response: str,
    ) -> None:
        """Persist a turn: upsert session, entities, and co-occurrence edges."""
        combined = f"User: {user_message}\nAssistant: {agent_response}"
        entities = await self.extract_entities(combined)
        ctx = user_message[:200]

        try:
            async with self.driver.session() as s:
                await s.run(
                    "MERGE (sess:Session {session_id: $sid}) "
                    "SET sess.last_active = datetime()",
                    sid=session_id,
                )
                for e in entities:
                    await s.run(
                        "MERGE (n:Entity {name: $name}) "
                        "SET n.type = $type, n.last_mentioned = datetime() "
                        "WITH n MATCH (sess:Session {session_id: $sid}) "
                        "MERGE (sess)-[d:DISCUSSED]->(n) "
                        "ON CREATE SET d.first_at = datetime(), d.count = 1, d.context = $ctx "
                        "ON MATCH SET d.last_at = datetime(), d.count = d.count + 1",
                        name=e["name"], type=e["type"], sid=session_id, ctx=ctx,
                    )
                # Co-occurrence edges between entities mentioned together.
                # Match one endpoint then the other via a WITH boundary so
                # Neo4j doesn't plan a cartesian product (both names are
                # unique-indexed, so each MATCH is a single-node lookup).
                for i, e1 in enumerate(entities):
                    for e2 in entities[i + 1:]:
                        await s.run(
                            "MATCH (a:Entity {name: $n1}) "
                            "WITH a MATCH (b:Entity {name: $n2}) "
                            "MERGE (a)-[r:RELATED_TO]->(b) "
                            "ON CREATE SET r.context = $ctx, r.count = 1 "
                            "ON MATCH SET r.count = r.count + 1",
                            n1=e1["name"], n2=e2["name"], ctx=ctx,
                        )
        except Exception as exc:  # noqa: BLE001 — memory write is best-effort
            logger.warning("store_interaction failed for session %s: %s", session_id, exc)

    # ─── Reads ───────────────────────────────────────────────────────

    async def get_session_context(self, session_id: str, limit: int = 5) -> str:
        """Return a one-line summary of what this session has discussed."""
        try:
            async with self.driver.session() as s:
                result = await s.run(
                    "MATCH (sess:Session {session_id: $sid})-[d:DISCUSSED]->(e:Entity) "
                    "RETURN e.name AS name, e.type AS type, "
                    "coalesce(d.last_at, d.first_at) AS last "
                    "ORDER BY last DESC LIMIT $limit",
                    sid=session_id, limit=limit,
                )
                records = [dict(r) async for r in result]
        except Exception as exc:  # noqa: BLE001
            logger.warning("get_session_context failed for %s: %s", session_id, exc)
            return ""

        if not records:
            return ""
        names = ", ".join(f"{r['name']} ({r['type']})" for r in records)
        return f"Previously discussed: {names}."

    async def find_related_entities(
        self,
        entity_name: str,
        depth: int = 2,
    ) -> list[dict[str, Any]]:
        """Return entities reachable from ``entity_name`` within ``depth`` hops."""
        # depth is interpolated (not a bind param) because Neo4j doesn't allow
        # parameterized variable-length bounds; clamp it to a safe small range.
        depth = max(1, min(int(depth), 4))
        try:
            async with self.driver.session() as s:
                result = await s.run(
                    f"MATCH (e:Entity {{name: $name}})-[r*1..{depth}]-(related:Entity) "
                    "RETURN DISTINCT related.name AS name, related.type AS type, "
                    "[rel IN r | type(rel)] AS path LIMIT 20",
                    name=entity_name,
                )
                return [dict(r) async for r in result]
        except Exception as exc:  # noqa: BLE001
            logger.warning("find_related_entities failed for %s: %s", entity_name, exc)
            return []

    async def clear_session(self, session_id: str) -> None:
        """Remove a session node and its DISCUSSED edges (entities persist)."""
        try:
            async with self.driver.session() as s:
                await s.run(
                    "MATCH (sess:Session {session_id: $sid}) DETACH DELETE sess",
                    sid=session_id,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("clear_session failed for %s: %s", session_id, exc)
