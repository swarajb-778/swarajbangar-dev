"""Single funnel for OpenAI chat completions.

Every LLM text call in the app goes through ``chat_completion`` so model
selection, message assembly, and token accounting live in one place.
Callers own their error handling — this raises on API failure.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from openai import AsyncOpenAI


async def chat_completion(
    client: "AsyncOpenAI",
    *,
    model: str,
    user: str,
    system: str | None = None,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> tuple[str, int]:
    """Run one chat completion. Returns ``(text, total_tokens)``."""
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.extend(history or [])
    messages.append({"role": "user", "content": user})

    kwargs: dict[str, Any] = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(
        model=model,
        max_completion_tokens=max_tokens,
        temperature=temperature,
        messages=messages,  # type: ignore[arg-type]
        **kwargs,
    )
    text = (response.choices[0].message.content or "").strip()
    tokens = response.usage.total_tokens if response.usage else 0
    return text, tokens
