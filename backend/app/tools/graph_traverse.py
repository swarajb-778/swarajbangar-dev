"""graph_traverse tool — query the Neo4j knowledge graph for relationships.

Used for follow-up context: once a turn has established a focus entity
(a company, technology, or project), this surfaces related entities and
how they connect.  Degrades to an empty result when the graph isn't
populated or Neo4j is unreachable.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.tools import tool

from app.tools.registry import get_global_neo4j

logger = logging.getLogger(__name__)

_CYPHER = """
MATCH (e:Entity {name: $entity})-[r]-(related:Entity)
WHERE $rel_type IS NULL OR type(r) = $rel_type
RETURN related.name AS name,
       related.type AS type,
       type(r)      AS relationship,
       r.context    AS context
LIMIT 10
"""


@tool
async def graph_traverse(
    entity: str,
    relationship_type: str | None = None,
) -> dict[str, Any]:
    """Query the knowledge graph for relationships between technologies,
    companies, and concepts. Use this for follow-up context — e.g. "what
    else did he use alongside Kafka?" once Kafka is the focus entity.
    """
    neo4j = get_global_neo4j()
    if neo4j is None:
        return {"related": [], "count": 0, "note": "Knowledge graph not available"}

    try:
        async with neo4j.session() as session:
            result = await session.run(
                _CYPHER, entity=entity, rel_type=relationship_type
            )
            records = [dict(r) async for r in result]
        return {"related": records, "count": len(records)}
    except Exception as exc:  # noqa: BLE001 — graph is best-effort context
        logger.warning("graph_traverse failed for entity=%r: %s", entity, exc)
        return {"related": [], "count": 0, "note": f"Graph query failed: {exc}"}
