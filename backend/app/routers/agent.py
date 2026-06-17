"""Agent orchestration endpoint — Server-Sent Events.

``POST /v1/agent/orchestrate`` runs a message through the LangGraph
orchestrator (``run_agent``) and streams the result as SSE:

  - ``event: step``   — one per pipeline step (classify / route / tool_call
                        / generate / synthesize / memory) as it completes
  - ``event: token``  — answer text, chunked for a typing effect
  - ``event: done``   — final accounting (latency, tokens, model)
  - ``event: error``  — terminal error with a code

The same ``session_id`` is used to push the reasoning trace over the
WebSocket (see app/routers/ws.py), so a browser can correlate the answer
stream with the live X-ray panel.
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.agents.orchestrator import run_agent
from app.models import (
    AgentChatRequest,
    AgentDoneEvent,
    AgentStepEvent,
    AgentTokenEvent,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _build_deps(request: Request) -> dict:
    """Assemble the deps bundle run_agent needs from app.state.

    Optional resources (redis, neo4j, rag_pipeline, ws_manager) are read
    defensively so a partially-degraded backend (e.g. Redis down) still
    serves the endpoint rather than 500-ing on a missing dependency.
    """
    state = request.app.state
    return {
        "settings": getattr(state, "settings", None),
        "anthropic": getattr(state, "anthropic", None),
        "embedder": getattr(state, "embedder", None),
        "retriever": getattr(state, "retriever", None),
        "reranker": getattr(state, "reranker", None),
        "rag_pipeline": getattr(state, "rag_pipeline", None),
        "ws_manager": getattr(state, "ws_manager", None),
        "session_manager": getattr(state, "session_manager", None),
        "knowledge_graph": getattr(state, "knowledge_graph", None),
        "redis": getattr(state, "redis", None),
        "neo4j": getattr(state, "neo4j", None),
    }


@router.post("/orchestrate")
async def orchestrate(req: AgentChatRequest, request: Request) -> EventSourceResponse:
    """Stream a SwarajOS agent run as Server-Sent Events."""
    deps = _build_deps(request)
    session_id = str(req.session_id)
    redis = deps.get("redis")

    async def event_generator():
        try:
            async for event in run_agent(
                req.message, session_id, deps, context=req.context
            ):
                if isinstance(event, AgentStepEvent):
                    # Tally intent distribution for the observability donut as
                    # soon as classification completes (best-effort; never
                    # blocks or breaks the stream).
                    if (
                        redis is not None
                        and event.type == "classify"
                        and event.status == "complete"
                    ):
                        intent = event.data.get("intent")
                        if intent:
                            try:
                                await redis.hincrby("agent:intents", intent, 1)
                            except Exception as exc:  # noqa: BLE001
                                logger.debug("intent counter failed: %s", exc)
                    yield {"event": "step", "data": event.model_dump_json()}
                elif isinstance(event, AgentTokenEvent):
                    yield {"event": "token", "data": json.dumps({"text": event.text})}
                elif isinstance(event, AgentDoneEvent):
                    yield {"event": "done", "data": event.model_dump_json()}
        except asyncio.TimeoutError:
            yield {
                "event": "error",
                "data": json.dumps({"message": "Agent timed out", "code": "TIMEOUT"}),
            }
        except asyncio.CancelledError:
            # Client disconnected mid-stream — let it propagate so the
            # server can tear the generator down cleanly.
            raise
        except Exception as exc:  # noqa: BLE001 — surface a terminal error frame
            logger.exception("agent orchestrate failed")
            yield {
                "event": "error",
                "data": json.dumps({"message": str(exc), "code": "AGENT_ERROR"}),
            }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering (nginx/Caddy)
            "Connection": "keep-alive",
        },
    )
