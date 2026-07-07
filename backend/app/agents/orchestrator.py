"""SwarajOS orchestrator — the LangGraph state machine.

Flow:

    START
      └─> classify          (intent + confidence)
            └─> route       (pick sub-agent, record reason)
                  ├─ experience_query/skills_query/project_query ─> execute_experience
                  ├─ code_review                                  ─> execute_code_review
                  ├─ system_design                                ─> execute_system_design
                  ├─ off_topic                                    ─> execute_off_topic (guardrail)
                  └─ general_chat/meta_question/(default)         ─> execute_general
                        └─> synthesize  (finalize + metadata)
                              └─> store_memory  (persist; stub for now)
                                    └─> END

Dependency injection:
  Node functions are pure w.r.t. the graph — they receive ``(state, config)``
  and pull runtime clients from ``config["configurable"]["deps"]``.  This
  keeps non-serializable clients (OpenAI, Redis, …) out of the state and
  lets us compile the graph once at import time.

Streaming:
  ``run_agent`` drives ``compiled_graph.astream(..., stream_mode="values")``.
  Pipeline steps stream live as nodes complete (the reasoning trace the
  frontend X-ray renders).  The final answer is then chunked into
  ``AgentTokenEvent``s with a small inter-chunk delay to produce a typing
  effect — true token-level streaming from OpenAI is a later prompt.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, AsyncGenerator

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from app.agents.budget import (
    BUDGET_EXCEEDED_MESSAGE,
    budget_available,
    record_tokens,
)
from app.agents.experience_agent import execute_experience
from app.agents.intent_classifier import classify_intent
from app.agents.prompts import (
    GENERAL_SYSTEM_PROMPT,
    META_SYSTEM_PROMPT,
    OFF_TOPIC_MESSAGE,
)
from app.agents.response_formatter import synthesize_response
from app.agents.state import AgentState, append_step
from app.llm import chat_completion
from app.models import AgentDoneEvent, AgentStepEvent, AgentTokenEvent

logger = logging.getLogger(__name__)

_GENERATE_MAX_TOKENS = 1024
_GENERATE_TEMPERATURE = 0.4

# Maps each intent to the node that handles it.
_INTENT_TO_NODE: dict[str, str] = {
    "experience_query": "execute_experience",
    "skills_query": "execute_experience",
    "project_query": "execute_experience",
    "code_review": "execute_code_review",
    "system_design": "execute_system_design",
    "general_chat": "execute_general",
    "meta_question": "execute_general",
    "off_topic": "execute_off_topic",
}
_DEFAULT_NODE = "execute_general"


# ════════════════════════════════════════════════════════════════════
# ── Dependency access ──
# ════════════════════════════════════════════════════════════════════


def _deps_from_config(config: "RunnableConfig | None") -> dict[str, Any]:
    """Extract the injected deps dict from a LangGraph config."""
    if not config:
        return {}
    return (config.get("configurable") or {}).get("deps", {}) or {}


# ════════════════════════════════════════════════════════════════════
# ── Nodes ──
# ════════════════════════════════════════════════════════════════════


async def _classify_node(state: AgentState, config: "RunnableConfig") -> AgentState:
    """Run intent classification."""
    deps = _deps_from_config(config)
    return await classify_intent(
        state,
        openai=deps["openai"],
        redis=deps.get("redis"),
        settings=deps["settings"],
    )


async def _route_node(state: AgentState, config: "RunnableConfig") -> AgentState:
    """Choose the sub-agent for this intent and record the decision."""
    t0 = time.perf_counter()
    intent = state.get("intent") or "general_chat"
    target = _INTENT_TO_NODE.get(intent, _DEFAULT_NODE)
    # Friendly agent label for the trace / UI.
    agent_label = {
        "execute_experience": "Experience Navigator",
        "execute_code_review": "Code Reviewer",
        "execute_system_design": "System Designer",
        "execute_general": "Conversational Agent",
        "execute_off_topic": "Guardrail",
    }[target]
    state["selected_agent"] = agent_label
    append_step(
        state,
        "route",
        "complete",
        {
            "intent": intent,
            "selected_agent": agent_label,
            "node": target,
            "reason": state.get("routing_reason"),
        },
        (time.perf_counter() - t0) * 1000,
    )
    return state


def _route_decision(state: AgentState) -> str:
    """Conditional-edge function: map intent → node name."""
    intent = state.get("intent") or "general_chat"
    return _INTENT_TO_NODE.get(intent, _DEFAULT_NODE)


async def _execute_experience_node(
    state: AgentState, config: "RunnableConfig"
) -> AgentState:
    """Delegate to the Experience Navigator sub-agent.

    The agent runs vector_search (+ github_search / graph_traverse as
    warranted) in parallel, then generates a grounded, cited answer.
    """
    deps = _deps_from_config(config)
    return await execute_experience(state, deps)


async def _execute_general_node(
    state: AgentState, config: "RunnableConfig"
) -> AgentState:
    """Handle general_chat and meta_question with the OpenAI answer model."""
    t0 = time.perf_counter()
    deps = _deps_from_config(config)
    openai = deps["openai"]
    redis = deps.get("redis")
    settings = deps["settings"]
    model = settings.OPENAI_MODEL
    intent = state.get("intent") or "general_chat"

    # Budget guard before the (paid) generation call.
    if not await budget_available(redis, settings):
        state["agent_response"] = BUDGET_EXCEEDED_MESSAGE
        append_step(
            state,
            "generate",
            "complete",
            {"model": model, "method": "budget_fallback"},
            (time.perf_counter() - t0) * 1000,
        )
        return state

    system_prompt = (
        META_SYSTEM_PROMPT if intent == "meta_question" else GENERAL_SYSTEM_PROMPT
    )

    history = [
        {"role": m["role"], "content": m["content"]}
        for m in state.get("messages", [])
    ]
    answer = ""
    try:
        answer, tokens = await chat_completion(
            openai,
            model=model,
            system=system_prompt,
            history=history,
            user=state["current_message"],
            max_tokens=_GENERATE_MAX_TOKENS,
            temperature=_GENERATE_TEMPERATURE,
        )
        try:
            await record_tokens(redis, settings, tokens)
            state.setdefault("metadata", {})["total_tokens"] = (
                state.get("metadata", {}).get("total_tokens", 0) + tokens
            )
        except Exception:  # noqa: BLE001
            pass
    except Exception as exc:  # noqa: BLE001
        logger.warning("general node LLM call failed: %s", exc)
        answer = (
            "I hit a snag reaching my language model just now. Try again in "
            "a moment, or explore the Lab while I recover."
        )

    state["agent_response"] = answer
    append_step(
        state,
        "generate",
        "complete",
        {"model": model, "intent": intent, "chars": len(answer)},
        (time.perf_counter() - t0) * 1000,
    )
    return state


async def _execute_off_topic_node(
    state: AgentState, config: "RunnableConfig"
) -> AgentState:
    """Guardrail: templated refusal for off-topic questions — zero LLM cost."""
    t0 = time.perf_counter()
    state["agent_response"] = OFF_TOPIC_MESSAGE
    append_step(
        state,
        "generate",
        "complete",
        {"model": "guardrail", "method": "off_topic_refusal"},
        (time.perf_counter() - t0) * 1000,
    )
    return state


async def _execute_code_review_node(
    state: AgentState, config: "RunnableConfig"
) -> AgentState:
    """Placeholder — real code review lands in Phase 4."""
    t0 = time.perf_counter()
    state["agent_response"] = (
        "Code review is coming in Phase 4 — I'll soon be able to walk "
        "through your snippet line by line. For now, try asking about "
        "Swaraj's projects or experience."
    )
    append_step(
        state,
        "generate",
        "complete",
        {"agent": "code_review", "status": "placeholder"},
        (time.perf_counter() - t0) * 1000,
    )
    return state


async def _execute_system_design_node(
    state: AgentState, config: "RunnableConfig"
) -> AgentState:
    """Placeholder — interactive system design lands in Phase 4."""
    t0 = time.perf_counter()
    state["agent_response"] = (
        "Interactive system design is coming in Phase 4 — I'll be able to "
        "sketch architectures with you live. For now, check out the Chaos "
        "Lab and Case Studies to see how Swaraj approaches systems at scale."
    )
    append_step(
        state,
        "generate",
        "complete",
        {"agent": "system_design", "status": "placeholder"},
        (time.perf_counter() - t0) * 1000,
    )
    return state


async def _synthesize_node(state: AgentState, config: "RunnableConfig") -> AgentState:
    """Finalize the response (delegates to response_formatter)."""
    deps = _deps_from_config(config)
    return await synthesize_response(state, deps)


async def _store_memory_node(state: AgentState, config: "RunnableConfig") -> AgentState:
    """Persist the turn to memory.

    Stub for now — the Neo4j + Redis session writer is wired in a later
    prompt.  We still emit a ``memory`` step so the trace shows the full
    intended pipeline.
    """
    t0 = time.perf_counter()
    append_step(
        state,
        "memory",
        "complete",
        {"persisted": False, "note": "memory writer wired in a later prompt"},
        (time.perf_counter() - t0) * 1000,
    )
    return state


# ════════════════════════════════════════════════════════════════════
# ── Graph assembly (compiled once at import) ──
# ════════════════════════════════════════════════════════════════════


def _build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("classify", _classify_node)
    graph.add_node("route", _route_node)
    graph.add_node("execute_experience", _execute_experience_node)
    graph.add_node("execute_general", _execute_general_node)
    graph.add_node("execute_off_topic", _execute_off_topic_node)
    graph.add_node("execute_code_review", _execute_code_review_node)
    graph.add_node("execute_system_design", _execute_system_design_node)
    graph.add_node("synthesize", _synthesize_node)
    graph.add_node("store_memory", _store_memory_node)

    graph.add_edge(START, "classify")
    graph.add_edge("classify", "route")
    graph.add_conditional_edges(
        "route",
        _route_decision,
        {
            "execute_experience": "execute_experience",
            "execute_code_review": "execute_code_review",
            "execute_system_design": "execute_system_design",
            "execute_general": "execute_general",
            "execute_off_topic": "execute_off_topic",
        },
    )
    for node in (
        "execute_experience",
        "execute_general",
        "execute_off_topic",
        "execute_code_review",
        "execute_system_design",
    ):
        graph.add_edge(node, "synthesize")
    graph.add_edge("synthesize", "store_memory")
    graph.add_edge("store_memory", END)

    return graph.compile()


compiled_graph = _build_graph()


# ════════════════════════════════════════════════════════════════════
# ── Entrypoint ──
# ════════════════════════════════════════════════════════════════════

# Size of the synthetic typing-effect chunks emitted at the SSE layer.
_TYPING_CHUNK_CHARS = 20
_TYPING_CHUNK_DELAY_S = 0.02


async def run_agent(
    message: str,
    session_id: str,
    deps: dict[str, Any],
    context: dict[str, Any] | None = None,
) -> AsyncGenerator[AgentStepEvent | AgentTokenEvent | AgentDoneEvent, None]:
    """Run a message through the orchestrator, yielding events as they happen.

    ``deps`` must contain ``openai`` and ``settings``; ``redis``,
    ``rag_pipeline`` and ``ws_manager`` are optional.  Yields:
      - ``AgentStepEvent`` for each reasoning step as it completes,
      - ``AgentTokenEvent`` chunks of the final answer (typing effect),
      - a final ``AgentDoneEvent`` with accounting.
    """
    start = time.perf_counter()
    # Sanitize caller-supplied history at the trust boundary: only
    # user/assistant roles, capped count and length.
    raw_history = (context or {}).get("messages") or []
    safe_history = [
        {"role": str(m["role"]), "content": str(m["content"])[:2000]}
        for m in raw_history[-8:]
        if isinstance(m, dict)
        and m.get("role") in ("user", "assistant")
        and m.get("content")
    ]
    state: AgentState = {
        "messages": safe_history,
        "current_message": message,
        "session_id": session_id,
        "pipeline_steps": [],
        "tool_calls": [],
        "retrieved_chunks": [],
        "metadata": {"started_at": time.time()},
    }

    ws_manager = deps.get("ws_manager")
    run_config: dict[str, Any] = {"configurable": {"deps": deps}}

    last_yielded_step = 0
    final_state: AgentState = state

    # ─── Stream reasoning steps live as nodes complete ──
    async for event in compiled_graph.astream(
        state, config=run_config, stream_mode="values"
    ):
        final_state = event
        steps = event.get("pipeline_steps", [])
        for step in steps[last_yielded_step:]:
            try:
                yield AgentStepEvent(**step)
            except Exception as exc:  # noqa: BLE001 — never let a bad step kill the stream
                logger.warning("skipping malformed step %r: %s", step, exc)
            # Best-effort push to any WebSocket subscriber.
            if ws_manager is not None:
                try:
                    await ws_manager.send_step(session_id, dict(step))
                except Exception as exc:  # noqa: BLE001
                    logger.debug("ws send_step failed: %s", exc)
        last_yielded_step = len(steps)

    # ─── Emit the final answer as typing-effect token chunks ──
    answer = final_state.get("agent_response") or ""
    for i in range(0, len(answer), _TYPING_CHUNK_CHARS):
        chunk = answer[i : i + _TYPING_CHUNK_CHARS]
        yield AgentTokenEvent(text=chunk)
        if ws_manager is not None:
            try:
                await ws_manager.send_token(session_id, chunk)
            except Exception as exc:  # noqa: BLE001
                logger.debug("ws send_token failed: %s", exc)
        await asyncio.sleep(_TYPING_CHUNK_DELAY_S)

    # ─── Done ──
    total_ms = (time.perf_counter() - start) * 1000
    yield AgentDoneEvent(
        total_latency_ms=total_ms,
        tokens_used=final_state.get("metadata", {}).get("total_tokens", 0),
        model=getattr(deps.get("settings"), "OPENAI_MODEL", ""),
    )
