"""Experience Navigator — the sub-agent for questions about Swaraj.

Pipeline within the node:
  1. Decide which tools to call (vector_search always; github_search when
     the query is about projects/tech/skills; graph_traverse on follow-ups).
  2. Run them in parallel.
  3. Fold the results into a single context block.
  4. Generate a grounded, cited answer with Sonnet.

Each tool call and the generation are recorded as pipeline steps so the
frontend X-ray panel can show the full reasoning trace.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import Counter
from typing import Any

from app.agents.budget import (
    BUDGET_EXCEEDED_MESSAGE,
    budget_available,
    record_tokens,
)
from app.agents.state import AgentState, append_step
from app.tools.github_search import github_search
from app.tools.graph_traverse import graph_traverse
from app.tools.vector_search import vector_search

logger = logging.getLogger(__name__)

_SONNET_MODEL = "claude-sonnet-4-5"
_MAX_TOKENS = 800
_TEMPERATURE = 0.2

# Signals that the query is about code / projects / specific tech — any of
# these makes github_search worth running alongside vector_search.
_TECH_KEYWORDS = {
    "python", "go", "golang", "rust", "java", "typescript", "javascript",
    "react", "nextjs", "next.js", "fastapi", "spring", "kafka", "redis",
    "pgvector", "postgres", "neo4j", "langgraph", "langchain", "pytorch",
    "docker", "kubernetes", "terraform", "aws", "embedding", "embeddings",
    "rag", "llm", "agent", "agents", "crdt", "websocket", "grpc",
}
_PROJECT_SIGNALS = {
    "build", "built", "building", "project", "projects", "made", "make",
    "create", "created", "develop", "developed", "ship", "shipped",
    "repo", "repos", "repository", "code", "tool", "tools", "open-source",
    "opensource", "github", "use", "uses", "using", "work", "worked",
}

SYSTEM_PROMPT = (
    "You are the Experience Navigator, a specialized agent within SwarajOS. "
    "Answer questions about Swaraj Bangar's professional experience, skills, "
    "and projects. Use ONLY the provided context. Always cite sources using "
    "[Source: type] format (e.g., [Source: resume], [Source: GitHub]). Be "
    "specific with numbers, dates, and technical details. If the context "
    "doesn't cover the question, say so honestly and suggest what the user "
    "could ask instead."
)


def _wants_github(query: str, intent: str | None) -> bool:
    """Decide whether to also run github_search for this query."""
    q = query.lower()
    if intent in ("skills_query", "project_query"):
        return True
    if any(k in q for k in _TECH_KEYWORDS):
        return True
    return any(k in q for k in _PROJECT_SIGNALS)


def _extract_focus_entity(messages: list[dict[str, Any]]) -> str | None:
    """Heuristic: most common capitalized token in the latest assistant turn.

    Good enough to seed graph_traverse on a follow-up ("what about that?")
    without a full entity-linking pass.
    """
    for msg in reversed(messages):
        if msg.get("role") != "assistant":
            continue
        words = re.findall(r"\b[A-Z][a-zA-Z0-9.+-]{2,}\b", msg.get("content", ""))
        # Drop sentence-initial noise words that just happen to be capitalized.
        stop = {"The", "This", "That", "These", "Those", "Source", "Swaraj", "He"}
        words = [w for w in words if w not in stop]
        if words:
            return Counter(words).most_common(1)[0][0]
    return None


def _summarize_result(result: Any) -> str:
    """One-line summary of a tool result for the tool_calls trace."""
    if isinstance(result, Exception):
        return f"error: {result}"
    if not isinstance(result, dict):
        return str(result)[:120]
    if "chunks" in result:
        return f"{result.get('count', 0)} chunks"
    if "repos" in result:
        return f"{len(result['repos'])} repos ({result.get('source', '?')})"
    if "related" in result:
        return f"{result.get('count', 0)} related entities"
    return "ok"


def _result_count(result: Any) -> int:
    if isinstance(result, Exception) or not isinstance(result, dict):
        return 0
    if "chunks" in result:
        return result.get("count", 0)
    if "repos" in result:
        return len(result["repos"])
    if "related" in result:
        return result.get("count", 0)
    return 0


async def execute_experience(state: AgentState, deps: dict[str, Any]) -> AgentState:
    """Answer an experience/skills/project query with tools + Sonnet."""
    anthropic = deps["anthropic"]
    redis = deps.get("redis")
    settings = deps["settings"]
    query = state["current_message"]
    intent = state.get("intent")

    # ─── 1. Decide which tools to call ──
    tool_names: list[str] = ["vector_search"]
    tasks: list[Any] = [vector_search.ainvoke({"query": query, "top_k": 5})]

    if _wants_github(query, intent):
        tool_names.append("github_search")
        tasks.append(github_search.ainvoke({"query": query}))

    focus = None
    if state.get("conversation_context") and state.get("messages"):
        focus = _extract_focus_entity(state["messages"])
        if focus:
            tool_names.append("graph_traverse")
            tasks.append(graph_traverse.ainvoke({"entity": focus}))

    # ─── 2. Run tools in parallel ──
    t0 = time.perf_counter()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    tool_latency = (time.perf_counter() - t0) * 1000
    per_tool_latency = tool_latency / max(1, len(tool_names))

    # ─── Record tool_calls + steps ──
    for name, result in zip(tool_names, results):
        is_err = isinstance(result, Exception)
        state.setdefault("tool_calls", []).append(
            {
                "tool": name,
                "output_summary": _summarize_result(result),
                "latency_ms": per_tool_latency,
                "error": str(result) if is_err else None,
            }
        )
        append_step(
            state,
            "tool_call",
            "error" if is_err else "complete",
            {
                "tool": name,
                "input": query[:80],
                "result_count": _result_count(result),
                **({"focus": focus} if name == "graph_traverse" and focus else {}),
            },
            per_tool_latency,
        )

    # ─── 3. Build context for the LLM ──
    context_parts: list[str] = []
    for name, result in zip(tool_names, results):
        if isinstance(result, Exception):
            continue
        if name == "vector_search":
            for c in result.get("chunks", []):
                context_parts.append(f"[{c['source']}] {c['content']}")
            state["retrieved_chunks"] = result.get("chunks", [])
        elif name == "github_search":
            for repo in result.get("repos", []):
                context_parts.append(
                    f"[GitHub] {repo['name']} ({repo.get('language')}): "
                    f"{repo.get('description')}"
                )
        elif name == "graph_traverse":
            for r in result.get("related", []):
                context_parts.append(
                    f"[Graph] {r['name']} ({r.get('type')}) — "
                    f"{r['relationship']}: {r.get('context', '')}"
                )

    context_text = "\n\n".join(context_parts) if context_parts else "(no context retrieved)"

    # ─── 4. Generate response with Sonnet (budget-guarded) ──
    if not await budget_available(redis, settings):
        state["agent_response"] = BUDGET_EXCEEDED_MESSAGE
        append_step(
            state,
            "generate",
            "complete",
            {"model": _SONNET_MODEL, "method": "budget_fallback"},
            0.0,
        )
        return state

    user_msg = f"Context:\n{context_text}\n\nQuestion: {query}"
    t0 = time.perf_counter()
    try:
        response = await anthropic.messages.create(
            model=_SONNET_MODEL,
            max_tokens=_MAX_TOKENS,
            temperature=_TEMPERATURE,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        gen_ms = (time.perf_counter() - t0) * 1000
        state["agent_response"] = "".join(
            b.text for b in response.content if getattr(b, "type", None) == "text"
        ).strip()
        usage = response.usage
        total = usage.input_tokens + usage.output_tokens
        state.setdefault("metadata", {})["total_tokens"] = (
            state.get("metadata", {}).get("total_tokens", 0) + total
        )
        await record_tokens(redis, settings, total)
        append_step(
            state,
            "generate",
            "complete",
            {
                "model": response.model,
                "input_tokens": usage.input_tokens,
                "output_tokens": usage.output_tokens,
            },
            gen_ms,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("experience generate failed: %s", exc)
        state["error"] = f"generation failed: {exc}"
        state["agent_response"] = (
            "I found relevant context but hit a snag generating the answer. "
            "Try again in a moment."
        )
        append_step(
            state,
            "generate",
            "error",
            {"model": _SONNET_MODEL, "error": str(exc)},
            (time.perf_counter() - t0) * 1000,
        )

    return state
