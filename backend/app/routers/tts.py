"""Text-to-speech endpoint — streams OpenAI TTS audio.

``POST /v1/tts`` takes the plain text of an assistant answer (the frontend
strips markdown/citations first) and streams back MP3 bytes. Guarded by the
same daily token budget as the chat endpoints (chars/4 ≈ tokens).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agents.budget import budget_available, record_tokens
from app.models import TTSRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("")
async def synthesize(req: TTSRequest, request: Request) -> StreamingResponse:
    """Stream MP3 speech for the given text."""
    state = request.app.state
    openai = getattr(state, "openai", None)
    settings = getattr(state, "settings", None)
    redis = getattr(state, "redis", None)

    if openai is None or settings is None:
        raise HTTPException(status_code=503, detail="TTS unavailable")
    if not await budget_available(redis, settings):
        raise HTTPException(status_code=429, detail="Daily budget reached")
    await record_tokens(redis, settings, max(1, len(req.text) // 4))

    async def audio_stream():
        async with openai.audio.speech.with_streaming_response.create(
            model=settings.OPENAI_TTS_MODEL,
            voice=settings.OPENAI_TTS_VOICE,
            input=req.text,
            response_format="mp3",
        ) as response:
            async for chunk in response.iter_bytes():
                yield chunk

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
