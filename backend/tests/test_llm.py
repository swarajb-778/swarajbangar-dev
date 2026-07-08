"""Unit tests for the chat_completion funnel — stub client, no network."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.llm import chat_completion


class _StubCompletions:
    def __init__(self, text: str | None) -> None:
        self._text = text
        self.kwargs: dict | None = None

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self._text))],
            usage=SimpleNamespace(total_tokens=42),
        )


class _StubClient:
    def __init__(self, text: str | None = "hello") -> None:
        self.chat = SimpleNamespace(completions=_StubCompletions(text))


def test_returns_stripped_text_and_total_tokens():
    client = _StubClient("  hi there  ")
    text, tokens = asyncio.run(chat_completion(client, model="m", user="q", system="s"))
    assert text == "hi there"
    assert tokens == 42


def test_message_order_system_history_user():
    client = _StubClient()
    history = [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}]
    asyncio.run(chat_completion(client, model="m", user="q", system="s", history=history))
    msgs = client.chat.completions.kwargs["messages"]
    assert msgs[0] == {"role": "system", "content": "s"}
    assert msgs[1:3] == history
    assert msgs[-1] == {"role": "user", "content": "q"}


def test_json_mode_sets_response_format():
    client = _StubClient('{"a": 1}')
    asyncio.run(chat_completion(client, model="m", user="q", json_mode=True))
    assert client.chat.completions.kwargs["response_format"] == {"type": "json_object"}


def test_none_content_returns_empty_string():
    client = _StubClient(text=None)
    text, tokens = asyncio.run(chat_completion(client, model="m", user="q"))
    assert text == ""
    assert tokens == 42
