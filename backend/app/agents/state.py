"""Shared state for the SwarajOS LangGraph.

``AgentState`` is the single object that flows through every node in the
graph.  LangGraph tracks each top-level key as a channel; nodes receive
the current state and return updates that get merged back (default
reducer = overwrite).

Design notes:
  - Required keys (messages / current_message / session_id) are always
    present from the entrypoint.  Everything a node *produces* is
    ``NotRequired`` so the schema reads as "filled in as we go".
  - ``pipeline_steps`` is the reasoning trace the SSE/WebSocket layer
    streams to the frontend X-ray panel.  Nodes append to it via the
    ``append_step`` helper in this module so the shape stays consistent.
  - Runtime dependencies (anthropic client, redis, etc.) are NOT stored
    here — they're injected per-run via LangGraph's ``config`` parameter
    (see orchestrator._deps_from_config).  Keeping non-serializable
    clients out of the state keeps the graph checkpoint-friendly later.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, NotRequired, TypedDict


class AgentState(TypedDict):
    """The state object threaded through the orchestration graph."""

    # ─── Always present (set by run_agent) ──
    messages: list[dict[str, Any]]  # full conversation history
    current_message: str            # the user's latest message
    session_id: str

    # ─── Classification ──
    intent: NotRequired[str | None]
    intent_confidence: NotRequired[float]
    selected_agent: NotRequired[str | None]
    routing_reason: NotRequired[str | None]

    # ─── Execution artifacts ──
    tool_calls: NotRequired[list[dict[str, Any]]]
    retrieved_chunks: NotRequired[list[dict[str, Any]]]
    agent_response: NotRequired[str | None]

    # ─── Reasoning trace (streamed to the frontend) ──
    pipeline_steps: NotRequired[list[dict[str, Any]]]

    # ─── Memory ──
    conversation_context: NotRequired[str]  # summary pulled from Neo4j/Redis

    # ─── Bookkeeping ──
    error: NotRequired[str | None]
    metadata: NotRequired[dict[str, Any]]


def append_step(
    state: AgentState,
    step_type: str,
    status: str,
    data: dict[str, Any],
    latency_ms: float | None = None,
) -> None:
    """Append a reasoning step to ``state['pipeline_steps']`` in place.

    ``step_type`` must be one of the values allowed by
    ``app.models.AgentStepType`` (classify / route / tool_call / retrieve /
    generate / synthesize / memory) so the event validates downstream.
    """
    state.setdefault("pipeline_steps", []).append(
        {
            "type": step_type,
            "status": status,
            "data": data,
            "latency_ms": latency_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
