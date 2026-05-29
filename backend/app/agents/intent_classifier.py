"""Intent classification — the first node in the SwarajOS graph.

Three-tier strategy, cheapest first:
  1. Fast-path regex — zero LLM cost, catches the obvious cases
     (code blocks, "design a X", greetings).
  2. Redis cache — if we've classified this exact message before, reuse it.
  3. Haiku LLM — the general case, with a strict JSON contract.

Everything is defensive: a malformed LLM response, an unknown category, or
a low-confidence result all degrade to ``general_chat`` rather than raising.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from typing import TYPE_CHECKING, Any

from app.agents.budget import budget_available, record_tokens
from app.agents.state import AgentState, append_step

if TYPE_CHECKING:
    import redis.asyncio as aioredis
    from anthropic import AsyncAnthropic

    from app.config import Settings

logger = logging.getLogger(__name__)

# Haiku model used for the cheap classification call.
_CLASSIFIER_MODEL = "claude-haiku-4-5-20251001"
_CACHE_TTL_SECONDS = 3600  # 1 hour

INTENT_CATEGORIES: dict[str, str] = {
    "experience_query": "Questions about work history, roles, companies, achievements",
    "skills_query": "Questions about technical skills, tools, languages, frameworks",
    "project_query": "Questions about specific projects (Collaborito, RapidOrch, etc.)",
    "code_review": "User pastes code and wants feedback",
    "system_design": "User asks to design a system or architecture",
    "meta_question": "Questions about the portfolio itself or how SwarajOS works",
    "general_chat": "Greetings, small talk, off-topic questions",
}

# (regex, intent) — evaluated in order, first match wins.  These cover the
# cases where an LLM call would be pure waste.
FAST_PATH_PATTERNS: list[tuple[str, str]] = [
    (r"^```", "code_review"),
    (
        r"\b(design|architect|build me|how would you build).{0,30}\b(system|api|service|pipeline)\b",
        "system_design",
    ),
    (r"^(hi|hello|hey|yo|sup|gm|good morning)\b", "general_chat"),
]

_DEFAULT_RESULT = {
    "intent": "general_chat",
    "confidence": 0.3,
    "reason": "Parse failed",
}


async def classify_intent(
    state: AgentState,
    anthropic: "AsyncAnthropic",
    redis: "aioredis.Redis | None",
    settings: "Settings",
) -> AgentState:
    """Populate ``state`` with intent / confidence / routing_reason.

    Appends a ``classify`` step to the reasoning trace recording which
    method (fast_path / cached / llm) produced the answer.
    """
    msg = state["current_message"].strip()
    t0 = time.perf_counter()

    # ─── 1. Fast-path regex ──
    for pattern, intent in FAST_PATH_PATTERNS:
        if re.search(pattern, msg, re.IGNORECASE):
            state["intent"] = intent
            state["intent_confidence"] = 0.95
            state["routing_reason"] = "Fast-path pattern matched"
            append_step(
                state,
                "classify",
                "complete",
                {"intent": intent, "confidence": 0.95, "method": "fast_path"},
                (time.perf_counter() - t0) * 1000,
            )
            return state

    # ─── 2. Redis cache by message hash ──
    cache_key = f"intent:v1:{hashlib.sha256(msg.encode()).hexdigest()[:16]}"
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("intent cache get failed: %s", exc)
            cached = None
        if cached:
            try:
                data = json.loads(cached)
                state["intent"] = data["intent"]
                state["intent_confidence"] = data["confidence"]
                state["routing_reason"] = data["reason"] + " (cached)"
                append_step(
                    state,
                    "classify",
                    "complete",
                    {**data, "method": "cached"},
                    (time.perf_counter() - t0) * 1000,
                )
                return state
            except (TypeError, ValueError, KeyError) as exc:
                logger.warning("cached intent malformed (%s); reclassifying", exc)

    # ─── 3. LLM classification with Haiku ──
    # Budget guard — if we're tapped out, default to general_chat without
    # spending a call (the general node has its own budget-aware fallback).
    if not await budget_available(redis, settings):
        state["intent"] = "general_chat"
        state["intent_confidence"] = 0.3
        state["routing_reason"] = "Daily budget reached; defaulting"
        append_step(
            state,
            "classify",
            "complete",
            {
                "intent": "general_chat",
                "confidence": 0.3,
                "method": "budget_fallback",
            },
            (time.perf_counter() - t0) * 1000,
        )
        return state

    data = await _classify_with_llm(state, msg, anthropic, redis, settings)

    # Validate intent is in our taxonomy.
    if data.get("intent") not in INTENT_CATEGORIES:
        data["intent"] = "general_chat"

    # Demote low-confidence to general_chat.
    if data.get("confidence", 0.0) < 0.5:
        data["intent"] = "general_chat"
        data["reason"] = f"Low confidence ({data.get('confidence', 0.0):.2f}), defaulting"

    # Cache the validated result for an hour.
    if redis is not None:
        try:
            await redis.setex(cache_key, _CACHE_TTL_SECONDS, json.dumps(data))
        except Exception as exc:  # noqa: BLE001
            logger.warning("intent cache set failed: %s", exc)

    state["intent"] = data["intent"]
    state["intent_confidence"] = data["confidence"]
    state["routing_reason"] = data["reason"]
    append_step(
        state,
        "classify",
        "complete",
        {**data, "method": "llm"},
        (time.perf_counter() - t0) * 1000,
    )
    return state


async def _classify_with_llm(
    state: AgentState,
    msg: str,
    anthropic: "AsyncAnthropic",
    redis: "aioredis.Redis | None",
    settings: "Settings",
) -> dict[str, Any]:
    """Call Haiku and parse the JSON verdict. Never raises."""
    categories_text = "\n".join(f"- {k}: {v}" for k, v in INTENT_CATEGORIES.items())
    context = state.get("conversation_context") or "none"
    prompt = (
        "Classify the following message into EXACTLY one category:\n\n"
        f"{categories_text}\n\n"
        f"Conversation context (if any): {context}\n"
        f'Message: "{msg}"\n\n'
        "Respond with ONLY valid JSON, no markdown fences:\n"
        '{"intent": "category_name", "confidence": 0.0-1.0, "reason": "brief explanation"}'
    )

    try:
        response = await anthropic.messages.create(
            model=_CLASSIFIER_MODEL,
            max_tokens=200,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as exc:  # noqa: BLE001 — any API failure → safe default
        logger.warning("intent LLM call failed: %s; defaulting to general_chat", exc)
        return {**_DEFAULT_RESULT, "reason": "Classifier unavailable"}

    # Record token usage against the daily budget.
    try:
        usage = response.usage
        await record_tokens(redis, settings, usage.input_tokens + usage.output_tokens)
    except Exception:  # noqa: BLE001
        pass

    try:
        text = response.content[0].text.strip()
        # Strip code fences if Haiku adds them despite the instruction.
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text).strip()
        data = json.loads(text)
        # Coerce confidence to float defensively.
        data["confidence"] = float(data.get("confidence", 0.0))
        data.setdefault("reason", "")
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("intent JSON parse failed: %s; defaulting to general_chat", exc)
        return dict(_DEFAULT_RESULT)
