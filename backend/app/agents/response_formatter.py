"""Response synthesis — the graph's penultimate node.

Most execute_* nodes already set ``agent_response`` directly, so this is
largely a finalizer: it wraps any error that surfaced upstream into a
friendly message, stamps run metadata for the X-ray UI, and guarantees a
non-empty response.
"""

from __future__ import annotations

import time
from typing import Any

from app.agents.state import AgentState, append_step


async def synthesize_response(state: AgentState, deps: dict[str, Any]) -> AgentState:
    """Finalize the response and record accounting metadata."""
    t0 = time.perf_counter()

    # If an upstream node recorded an error, wrap it gracefully.
    if state.get("error"):
        state["agent_response"] = (
            f"I ran into an issue: {state['error']}. "
            "Try rephrasing, or use the terminal — type `help` for options."
        )
    elif not state.get("agent_response"):
        state["agent_response"] = (
            "I'm not sure how to answer that yet — try rephrasing, or type "
            "`help` in the terminal to see what I can do."
        )

    meta = state.setdefault("metadata", {})
    meta["intent"] = state.get("intent")
    meta["selected_agent"] = state.get("selected_agent")
    meta["confidence"] = state.get("intent_confidence")

    append_step(
        state,
        "synthesize",
        "complete",
        {
            "chars": len(state.get("agent_response") or ""),
            "intent": meta.get("intent"),
            "agent": meta.get("selected_agent"),
        },
        (time.perf_counter() - t0) * 1000,
    )
    return state
