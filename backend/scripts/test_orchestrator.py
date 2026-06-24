"""Manually exercise the SwarajOS orchestrator from the CLI.

Usage:
    python -m scripts.test_orchestrator "Hi there"
    python -m scripts.test_orchestrator "What did Swaraj build at McKinsey?"
    python -m scripts.test_orchestrator --rag "Tell me about ThoughtWorks"

Builds the deps the orchestrator needs (Anthropic client, optional Redis,
settings), runs ``run_agent``, and pretty-prints every event it yields:
reasoning steps, streamed token chunks, and the final accounting.

``--rag`` additionally wires the real RAG pipeline into the experience
node so experience queries return grounded answers (slower: loads the
embedder + reranker + connects to Supabase).
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path
from typing import Any

# Allow both ``python -m scripts.test_orchestrator`` and direct execution.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.models import AgentDoneEvent, AgentStepEvent, AgentTokenEvent  # noqa: E402

# ─── Terminal colors (no dependency) ──
RESET = "\x1b[0m"
DIM = "\x1b[90m"
CYAN = "\x1b[36m"
GREEN = "\x1b[32m"
YELLOW = "\x1b[33m"
PURPLE = "\x1b[35m"


async def _build_deps(skip_retriever: bool) -> tuple[dict, Any]:
    """Construct the deps dict the orchestrator expects.

    Returns ``(deps, pool)`` — the asyncpg pool is returned separately so
    the caller can close it on exit.  Unless ``skip_retriever`` is set we
    build the hybrid retriever (pool + embedder) and register it in the
    agent-tools global registry, since the Experience Navigator reaches it
    via the ``vector_search`` tool rather than through ``deps``.
    """
    from anthropic import AsyncAnthropic

    settings = get_settings()
    deps: dict = {
        "settings": settings,
        "anthropic": AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY),
        "redis": None,
        "ws_manager": None,
    }
    pool = None

    # Optional Redis — enables intent caching + budget tracking.
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(
            "redis://localhost:6379/0", encoding="utf-8", decode_responses=True
        )
        await client.ping()
        deps["redis"] = client
        print(f"{DIM}redis: connected (localhost:6379){RESET}")
    except Exception as exc:  # noqa: BLE001
        print(f"{DIM}redis: unavailable ({exc}); caching/budget disabled{RESET}")

    if not skip_retriever:
        print(f"{DIM}building retriever (loads embedder + connects to Supabase)…{RESET}")
        pool = await _register_retriever(settings)

    # Optional Neo4j — enables the graph_traverse tool + memory layer.
    # NEO4J_URI_OVERRIDE / NEO4J_USER_OVERRIDE / NEO4J_PASSWORD_OVERRIDE let
    # you point at a local container when the configured Aura instance is
    # unavailable (e.g. NEO4J_URI_OVERRIDE=bolt://localhost:7687).
    import os

    try:
        import neo4j as neo4j_driver

        from app.memory.graph import KnowledgeGraph
        from app.memory.session import SessionManager
        from app.tools import registry as tool_registry

        uri = os.environ.get("NEO4J_URI_OVERRIDE", settings.NEO4J_URI)
        user = os.environ.get("NEO4J_USER_OVERRIDE", settings.NEO4J_USER)
        password = os.environ.get("NEO4J_PASSWORD_OVERRIDE", settings.NEO4J_PASSWORD)

        driver = neo4j_driver.AsyncGraphDatabase.driver(uri, auth=(user, password))
        await driver.verify_connectivity()
        tool_registry.set_neo4j(driver)

        kg = KnowledgeGraph(driver=driver, anthropic=deps["anthropic"], redis=deps["redis"])
        await kg.initialize()
        deps["knowledge_graph"] = kg
        deps["neo4j"] = driver
        print(f"{DIM}neo4j: connected ({uri}){RESET}")
    except Exception as exc:  # noqa: BLE001
        print(f"{DIM}neo4j: unavailable ({exc}); graph_traverse + graph memory disabled{RESET}")

    # Session history (Redis) — independent of Neo4j.
    from app.memory.session import SessionManager as _SM

    deps["session_manager"] = _SM(redis=deps["redis"])

    return deps, pool


async def _register_retriever(settings):
    """Build the HybridRetriever and register it globally. Returns the pool."""
    import asyncpg

    from app.main import _sanitize_dsn
    from app.rag.embedder import LocalEmbedder
    from app.rag.retriever import HybridRetriever
    from app.tools import registry as tool_registry

    pool = await asyncpg.create_pool(
        dsn=_sanitize_dsn(settings.DATABASE_URL),
        min_size=1,
        max_size=2,
        command_timeout=30,
        statement_cache_size=0,
    )
    embedder = LocalEmbedder(model_name=settings.EMBEDDING_MODEL)
    retriever = HybridRetriever(pool, embedder, settings)
    tool_registry.set_retriever(retriever)

    # Reranker is what surfaces embedding-diluted chunks (e.g. the McKinsey
    # role) for the vector_search tool.
    from app.rag.reranker import CrossEncoderReranker

    tool_registry.set_reranker(CrossEncoderReranker(model_name=settings.RERANKER_MODEL))
    return pool


async def main(message: str, skip_retriever: bool, session_id: str) -> None:
    from app.agents.orchestrator import run_agent

    deps, pool = await _build_deps(skip_retriever)

    print()
    print(f"{CYAN}━━━ query ━━━{RESET}  {message!r}  {DIM}(session={session_id}){RESET}")
    print()

    answer_parts: list[str] = []
    step_n = 0
    start = time.perf_counter()

    async for event in run_agent(message, session_id=session_id, deps=deps):
        if isinstance(event, AgentStepEvent):
            step_n += 1
            lat = f"{event.latency_ms:.0f}ms" if event.latency_ms is not None else "-"
            print(
                f"{PURPLE}[step {step_n}]{RESET} {GREEN}{event.type:<10}{RESET}"
                f" {event.status:<9} {DIM}{lat:>8}{RESET}  {event.data}"
            )
        elif isinstance(event, AgentTokenEvent):
            answer_parts.append(event.text)
        elif isinstance(event, AgentDoneEvent):
            answer = "".join(answer_parts)
            print()
            print(f"{YELLOW}━━━ answer ━━━{RESET}")
            print(answer)
            print()
            print(
                f"{CYAN}━━━ done ━━━{RESET}  "
                f"latency={event.total_latency_ms:.0f}ms  "
                f"tokens={event.tokens_used}  model={event.model}"
            )

    # Sanity: confirm we actually streamed something.
    wall = (time.perf_counter() - start) * 1000
    print(f"{DIM}wall-clock: {wall:.0f}ms{RESET}")

    # Clean up connections we opened.
    redis = deps.get("redis")
    if redis is not None:
        await redis.aclose()
    if pool is not None:
        await pool.close()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test the SwarajOS orchestrator.")
    parser.add_argument("message", help="The user message to run through the graph.")
    parser.add_argument(
        "--no-retriever",
        action="store_true",
        help="Skip building the retriever (faster; experience queries won't "
        "have grounded context).",
    )
    parser.add_argument(
        "--session",
        default="cli-test",
        help="Session id for memory continuity across runs (default: cli-test).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    asyncio.run(main(args.message, args.no_retriever, args.session))
