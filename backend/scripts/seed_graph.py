"""Seed the Neo4j knowledge graph with baseline entity relationships.

Idempotent: every node and edge is MERGE'd, so re-running converges to the
same graph rather than duplicating.  Entities are typed; relationships carry
a short ``context`` string explaining the connection.

Run with:
    python -m scripts.seed_graph
"""

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402

# ─── Entity catalogue: name → type ──
# Drawn from the resume corpus (companies, the stack, key concepts/projects).
ENTITIES: dict[str, str] = {
    # technologies
    "Python": "technology",
    "Go": "technology",
    "Java": "technology",
    "TypeScript": "technology",
    "Kafka": "technology",
    "Redis": "technology",
    "Docker": "technology",
    "Kubernetes": "technology",
    "LangGraph": "technology",
    "LangChain": "technology",
    "pgvector": "technology",
    "Neo4j": "technology",
    "PyTorch": "technology",
    "React": "technology",
    "Next.js": "technology",
    "FastAPI": "technology",
    "Apache Spark": "technology",
    # companies
    "Amazon": "company",
    "Meshi.io": "company",
    "Softgenio Technology": "company",
    "Black Box Corporation": "company",
    # concepts
    "RAG Pipeline": "concept",
    "Event Sourcing": "concept",
    "CQRS": "concept",
    "Event-Driven Architecture": "concept",
    # projects
    "Collaborito": "project",
    "RapidOrch": "project",
}

# ─── Relationships: (source, REL_TYPE, target, context) ──
RELATIONSHIPS: list[tuple[str, str, str, str]] = [
    ("Python", "USED_AT", "Amazon", "primary language for SDE work"),
    ("Python", "USED_AT", "Meshi.io", "agent platform implementation"),
    ("Java", "USED_AT", "Amazon", "payment platform services"),
    ("Kafka", "USED_AT", "Amazon", "event-driven microservices migration"),
    ("Kafka", "IMPLEMENTS", "Event-Driven Architecture", "core messaging primitive"),
    ("LangGraph", "USED_AT", "Meshi.io", "multi-agent orchestrator"),
    ("LangGraph", "RELATED_TO", "LangChain", "successor framework"),
    ("LangChain", "USED_AT", "Meshi.io", "agent component library"),
    ("pgvector", "USED_AT", "Meshi.io", "production RAG pipeline storage"),
    ("pgvector", "IMPLEMENTS", "RAG Pipeline", "vector storage layer"),
    ("Neo4j", "USED_AT", "Meshi.io", "knowledge graph for agent memory"),
    ("Redis", "USED_AT", "Amazon", "caching layer"),
    ("Redis", "USED_AT", "Meshi.io", "session and event bus"),
    ("Kubernetes", "USED_AT", "Amazon", "container orchestration"),
    ("Docker", "USED_AT", "Amazon", "deployment unit"),
    ("Docker", "USED_AT", "Meshi.io", "deployment unit"),
    ("PyTorch", "USED_AT", "Amazon", "ML model training"),
    ("React", "USED_AT", "Black Box Corporation", "frontend stack"),
    ("Next.js", "USED_AT", "Black Box Corporation", "SSR framework"),
    ("React", "RELATED_TO", "Next.js", "Next.js builds on React"),
    ("Apache Spark", "USED_AT", "Softgenio Technology", "batch data processing"),
    ("CQRS", "RELATED_TO", "Event Sourcing", "complementary patterns"),
    ("Event Sourcing", "RELATED_TO", "Kafka", "common implementation"),
    ("Event-Driven Architecture", "USED_AT", "Amazon", "auth decisioning backbone"),
    ("RAG Pipeline", "RELATED_TO", "pgvector", "storage backend"),
    ("RAG Pipeline", "RELATED_TO", "LangChain", "orchestration framework"),
    ("RAG Pipeline", "USED_AT", "Meshi.io", "hybrid retrieval for the agent"),
    ("FastAPI", "USED_AT", "Meshi.io", "agent + RAG API surface"),
    ("FastAPI", "USED_AT", "Softgenio Technology", "internal services"),
    ("Go", "USED_AT", "Softgenio Technology", "high-throughput services"),
    ("Go", "IMPLEMENTS", "RapidOrch", "single-binary workflow engine"),
    ("TypeScript", "USED_AT", "Black Box Corporation", "typed frontend"),
    ("TypeScript", "IMPLEMENTS", "Collaborito", "collaborative editor"),
    ("Collaborito", "RELATED_TO", "Redis", "presence + persistence channel"),
    ("RapidOrch", "RELATED_TO", "Apache Spark", "alternative to heavy schedulers"),
    ("Neo4j", "IMPLEMENTS", "Event-Driven Architecture", "agent memory writes on each turn"),
    ("LangGraph", "IMPLEMENTS", "RAG Pipeline", "drives retrieval as a graph node"),
    ("Kafka", "RELATED_TO", "CQRS", "command/query split over the log"),
]


async def main() -> None:
    import os

    import neo4j

    settings = get_settings()
    # Allow pointing at a local container when the configured Aura instance
    # is unavailable: NEO4J_URI_OVERRIDE / NEO4J_USER_OVERRIDE /
    # NEO4J_PASSWORD_OVERRIDE.
    uri = os.environ.get("NEO4J_URI_OVERRIDE", settings.NEO4J_URI)
    user = os.environ.get("NEO4J_USER_OVERRIDE", settings.NEO4J_USER)
    password = os.environ.get("NEO4J_PASSWORD_OVERRIDE", settings.NEO4J_PASSWORD)
    driver = neo4j.AsyncGraphDatabase.driver(uri, auth=(user, password))

    try:
        await driver.verify_connectivity()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: cannot connect to Neo4j at {uri}: {exc}")
        await driver.close()
        sys.exit(1)

    async with driver.session() as s:
        # Constraints (idempotent) so MERGE dedupes on name.
        await s.run(
            "CREATE CONSTRAINT entity_name IF NOT EXISTS "
            "FOR (e:Entity) REQUIRE e.name IS UNIQUE"
        )
        await s.run(
            "CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)"
        )

        # Upsert entities.
        for name, type_ in ENTITIES.items():
            await s.run(
                "MERGE (e:Entity {name: $name}) "
                "SET e.type = $type, e.seeded = true",
                name=name, type=type_,
            )

        # Upsert relationships. Endpoints are MERGE'd too so a relationship
        # naming an entity not in the catalogue still creates a typed node.
        for src, rel, dst, ctx in RELATIONSHIPS:
            await s.run(
                f"MERGE (a:Entity {{name: $src}}) "
                f"MERGE (b:Entity {{name: $dst}}) "
                f"MERGE (a)-[r:{rel}]->(b) "
                f"ON CREATE SET r.context = $ctx, r.count = 1 "
                f"ON MATCH SET r.context = $ctx",
                src=src, dst=dst, ctx=ctx,
            )

        # Report actual counts from the DB (post-dedup).
        entity_count = (await (await s.run("MATCH (e:Entity) RETURN count(e) AS c")).single())["c"]
        rel_count = (await (await s.run("MATCH ()-[r]->() RETURN count(r) AS c")).single())["c"]

    await driver.close()
    print(f"Created {entity_count} entities, {rel_count} relationships")


if __name__ == "__main__":
    asyncio.run(main())
