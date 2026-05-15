"""WebSocket endpoints — placeholder for Phase 3.

Real-time streaming alternative to SSE. For demos that need
bidirectional communication (e.g. cancel mid-stream).
"""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/agent/stream")
async def agent_stream(ws: WebSocket) -> None:
    """Bidirectional agent stream.

    Currently accepts and immediately closes with code 1011 (server error,
    not implemented). The real implementation lands in a later prompt.
    """
    await ws.accept()
    try:
        await ws.send_json({"error": "not_implemented", "detail": "WebSocket agent not wired yet."})
        await ws.close(code=1011)
    except WebSocketDisconnect:
        return
