"""WebSocket endpoint + connection manager for the reasoning panel.

The SwarajOS chat streams its *answer* over SSE (``/v1/agent/orchestrate``),
but the live reasoning trace — every classify / route / tool_call / generate
step — is pushed over a WebSocket so the frontend X-ray panel can render it
in real time, independent of the answer stream.

``ConnectionManager`` is created once at startup and stored on
``app.state.ws_manager``.  ``run_agent`` (in app/agents/orchestrator.py)
calls ``send_step`` / ``send_token`` on it as the graph executes; the SSE
endpoint and the WebSocket share the same ``session_id`` so a browser tab
can correlate the two streams.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# Server-side heartbeat cadence.  Kept under typical 30–60s idle timeouts
# on proxies (Caddy / Cloudflare) so the socket isn't reaped mid-session.
_HEARTBEAT_SECONDS = 25


class ConnectionManager:
    """Tracks one live WebSocket per session and fans out agent events.

    A session maps to exactly one socket (the most recent connect wins).
    All sends are best-effort: a dead socket is detected on send and
    evicted, so callers (the orchestrator) never have to care whether a
    client is actually listening.
    """

    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        """Accept the socket and register it under ``session_id``."""
        await ws.accept()
        # If a stale socket exists for this session, drop it first.
        existing = self.active.get(session_id)
        if existing is not None and existing is not ws:
            try:
                await existing.close(code=1000)
            except Exception:  # noqa: BLE001 — already closing
                pass
        self.active[session_id] = ws
        logger.debug("ws connected: session=%s (active=%d)", session_id, len(self.active))

    def disconnect(self, session_id: str) -> None:
        """Forget the socket for ``session_id`` (idempotent)."""
        self.active.pop(session_id, None)
        logger.debug("ws disconnected: session=%s (active=%d)", session_id, len(self.active))

    async def _send(self, session_id: str, payload: dict) -> None:
        ws = self.active.get(session_id)
        if ws is None:
            return
        try:
            await ws.send_json(payload)
        except Exception as exc:  # noqa: BLE001 — disconnect on any send failure
            logger.debug("ws send failed for %s: %s", session_id, exc)
            self.disconnect(session_id)

    async def send_step(self, session_id: str, payload: dict) -> None:
        """Push a reasoning step to the session's socket (best-effort)."""
        await self._send(session_id, {"type": "step", "data": payload})

    async def send_token(self, session_id: str, text: str) -> None:
        """Push an answer-token chunk to the session's socket (best-effort)."""
        await self._send(session_id, {"type": "token", "data": {"text": text}})

    async def send_done(self, session_id: str, payload: dict | None = None) -> None:
        """Signal end-of-run to the session's socket (best-effort)."""
        await self._send(session_id, {"type": "done", "data": payload or {}})


router = APIRouter()


@router.websocket("/agent/stream")
async def agent_stream(ws: WebSocket, session_id: str = Query(...)) -> None:
    """Reasoning-panel WebSocket.

    The client connects with ``?session_id=<id>`` and then just listens —
    the orchestrator pushes ``step`` / ``token`` / ``done`` frames as a run
    progresses.  We also run a heartbeat: if the client is silent for
    ``_HEARTBEAT_SECONDS`` we send ``{"type": "ping"}`` to keep proxies from
    idling the connection out; a client may also send the literal text
    ``"ping"`` and we reply ``"pong"``.
    """
    manager: ConnectionManager = ws.app.state.ws_manager
    await manager.connect(session_id, ws)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=_HEARTBEAT_SECONDS)
                if msg == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                # Idle — send a server heartbeat so the socket stays warm.
                await ws.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 — log and tear down cleanly
        logger.debug("ws loop ended for %s: %s", session_id, exc)
    finally:
        manager.disconnect(session_id)
