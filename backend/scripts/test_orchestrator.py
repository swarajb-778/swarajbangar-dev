"""Manually exercise the SwarajOS orchestrator from the CLI.

Usage:
    python -m scripts.test_orchestrator "Hi there"
    python -m scripts.test_orchestrator "What did Swaraj build at Amazon?"
    python -m scripts.test_orchestrator --rag "Tell me about Meshi.io"

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


async def _build_deps(use_rag: bool) -> dict:
    """Construct the deps dict the orchestrator expects."""
    from anthropic import AsyncAnthropic

    settings = get_settings()
    deps: dict = {
        "settings": settings,
        "anthropic": AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY),
        "redis": None,
        "rag_pipeline": None,
        "ws_manager": None,
    }

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

    if use_rag:
        print(f"{DIM}building RAG pipeline (loads models + connects to Supabase)…{RESET}")
        deps["rag_pipeline"] = await _build_rag_pipeline(settings, deps["anthropic"])

    return deps


async def _build_rag_pipeline(settings, anthropic):
    """Wire the real RAG pipeline for --rag runs."""
    import asyncpg

    from app.main import _sanitize_dsn
    from app.rag.embedder import LocalEmbedder
    from app.rag.pipeline import RAGPipeline
    from app.rag.reranker import CrossEncoderReranker
    from app.rag.retriever import HybridRetriever

    pool = await asyncpg.create_pool(
        dsn=_sanitize_dsn(settings.DATABASE_URL),
        min_size=1,
        max_size=2,
        command_timeout=30,
        statement_cache_size=0,
    )
    embedder = LocalEmbedder(model_name=settings.EMBEDDING_MODEL)
    reranker = CrossEncoderReranker(model_name=settings.RERANKER_MODEL)
    retriever = HybridRetriever(pool, embedder, settings)
    return RAGPipeline(retriever, reranker, settings, anthropic)


async def main(message: str, use_rag: bool) -> None:
    from app.agents.orchestrator import run_agent

    deps = await _build_deps(use_rag)

    print()
    print(f"{CYAN}━━━ query ━━━{RESET}  {message!r}")
    print()

    answer_parts: list[str] = []
    step_n = 0
    start = time.perf_counter()

    async for event in run_agent(message, session_id="cli-test", deps=deps):
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

    # Clean up Redis connection if we opened one.
    redis = deps.get("redis")
    if redis is not None:
        await redis.aclose()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test the SwarajOS orchestrator.")
    parser.add_argument("message", help="The user message to run through the graph.")
    parser.add_argument(
        "--rag",
        action="store_true",
        help="Wire the real RAG pipeline into the experience node.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    asyncio.run(main(args.message, args.rag))
