# SwarajOS v2 — OpenAI Migration + Guardrails + Formatting + Voice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

The SwarajOS portfolio agent (chat dock on swarajbangar.dev) currently runs on the Anthropic SDK (`claude-sonnet-4-5` for answers, `claude-haiku-4-5` for intent classification). The user finds answer quality unsatisfying and gets better results from OpenAI, so the whole LLM layer moves to the OpenAI API (`gpt-4.1-mini` for answers, `gpt-4.1-nano` for classification). "Fine-tuning" here means **prompt + pipeline tuning with a repeatable eval loop** — NOT a paid OpenAI fine-tuning job (explicitly declined by the user).

On top of the provider swap:
1. **Guardrails** — the agent must refuse anything not about Swaraj (e.g. "What is the capital of the USA?" → polite refusal + redirect). Today off-topic questions fall into `general_chat` and get answered.
2. **Response quality** — rewritten system prompts (persona + format + scope rules in one module), conversation history passed through to generation (today each turn is stateless), and a golden-question eval script to measure prompt changes.
3. **Output formatting** — the model is instructed to emit a small markdown subset (bold, bullets, short paragraphs, `[Source: x]` citations); the frontend renders that subset (hand-rolled, no new dependency).
4. **Speak option (TTS)** — a speaker button on each finished assistant bubble; backend `POST /v1/tts` (OpenAI `gpt-4o-mini-tts`) streamed through a same-origin Next.js proxy; falls back to browser `speechSynthesis` when the backend is down (demo-mode contract).

**Goal:** SwarajOS answers only Swaraj-related questions, on OpenAI, with well-formatted grounded answers, conversation memory within a session, and a working "speak this answer" button — verified by an eval script and deployed to the droplet.

**Architecture:** All LLM calls funnel through one new helper (`backend/app/llm.py::chat_completion`) so the provider swap is a parameter change at each call site, not four bespoke rewrites. Guardrails are an `off_topic` intent + a zero-cost templated refusal node in the existing LangGraph. TTS is a new FastAPI router streaming OpenAI audio, proxied by a new `/api/tts` Next.js route (mirrors the existing `/api/agent` SSE proxy). Frontend rendering changes live entirely in `agentFormat.tsx` (shared by ChatDock and the Lab AgentDemo).

**Tech Stack:** FastAPI + LangGraph (unchanged), `openai` Python SDK (replaces `anthropic`), Next.js 14 App Router, React state only, hand-rolled mini-markdown renderer.

## Global Constraints

- Answer model: `gpt-4.1-mini` (env-overridable `OPENAI_MODEL`). Classifier: `gpt-4.1-nano` (`OPENAI_CLASSIFIER_MODEL`). TTS: `gpt-4o-mini-tts`, voice `onyx` (`OPENAI_TTS_MODEL` / `OPENAI_TTS_VOICE`).
- NO paid fine-tuning job. NO `litellm`. Remove `anthropic` and `langchain-anthropic` from requirements. Keep `tiktoken`, keep local sentence-transformers embeddings — **vector(384) untouched, no re-ingest needed**.
- `.claude/CLAUDE.md` currently says "NO openai package … direct Anthropic SDK only" — the user explicitly reversed this; Task 10 updates that doc so future sessions don't fight the change.
- Every paid call (classify, generate, TTS) must stay behind the existing Redis token-budget guard (`app/agents/budget.py` — unchanged).
- Frontend: no new npm dependencies. No `any`, no default exports, no localStorage/sessionStorage. All backend failures degrade to mock/fallback + `notifyDemoMode` (never a broken UI).
- Backend origin stays server-only (`BACKEND_ORIGIN`); browser only calls same-origin `/api/*`.
- Commit after every task, conventional commits (`feat:`/`refactor:`/`docs:`). Attribution disabled globally — no Co-Authored-By.
- Working branch: create `feat/openai-agent` off the current `feat/landing-interactive-terminal` HEAD (tree is clean).

---

### Task 0: Branch

- [ ] **Step 1: Create the working branch**

```bash
cd /Users/swarajbangar/Documents/Coding/swarajbangar-dev
git checkout -b feat/openai-agent
```

---

### Task 1: Backend — OpenAI config, client, and the `chat_completion` funnel

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/main.py:160,221-224,238`
- Create: `backend/app/llm.py`
- Modify: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Modify: `backend/.env.example` (swap `ANTHROPIC_API_KEY` block for `OPENAI_API_KEY` + optional model overrides)
- Create: `backend/tests/__init__.py` (empty), `backend/tests/test_llm.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `app.state.openai: AsyncOpenAI`; settings fields `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_CLASSIFIER_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`; and
  ```python
  async def chat_completion(client, *, model: str, user: str, system: str | None = None,
                            history: list[dict[str, str]] | None = None, max_tokens: int = 1024,
                            temperature: float = 0.4, json_mode: bool = False) -> tuple[str, int]
  ```
  returning `(text, total_tokens)`. Raises on API failure (callers keep their existing try/except). Every later task calls this exact signature.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/__init__.py` (empty) and `backend/tests/test_llm.py`:

```python
"""Unit tests for the chat_completion funnel — stub client, no network."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.llm import chat_completion


class _StubCompletions:
    def __init__(self, text: str) -> None:
        self._text = text
        self.kwargs: dict | None = None

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self._text))],
            usage=SimpleNamespace(total_tokens=42),
        )


class _StubClient:
    def __init__(self, text: str = "hello") -> None:
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
    client = _StubClient(text=None)  # type: ignore[arg-type]
    text, tokens = asyncio.run(chat_completion(client, model="m", user="q"))
    assert text == ""
    assert tokens == 42
```

- [ ] **Step 2: Run it — must fail (module doesn't exist)**

```bash
cd backend && python -m pip install -r requirements-dev.txt 2>/dev/null || pip install pytest
python -m pytest tests/test_llm.py -v
```
Expected: FAIL / collection error with `ModuleNotFoundError: No module named 'app.llm'`.

- [ ] **Step 3: Create `backend/app/llm.py`**

```python
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
```

- [ ] **Step 4: Run tests — must pass**

```bash
python -m pytest tests/test_llm.py -v
```
Expected: 4 passed.

- [ ] **Step 5: Config — add OpenAI settings, drop the Anthropic requirement**

In `backend/app/config.py`, replace the `# ─── Anthropic ───` block (lines 29-33) with:

```python
    # ─── OpenAI ───────────────────────────────────────────────────────
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key. Get one at https://platform.openai.com",
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4.1-mini",
        description="Model for answer generation.",
    )
    OPENAI_CLASSIFIER_MODEL: str = Field(
        default="gpt-4.1-nano",
        description="Cheap model for intent classification.",
    )
    OPENAI_TTS_MODEL: str = Field(
        default="gpt-4o-mini-tts",
        description="Text-to-speech model.",
    )
    OPENAI_TTS_VOICE: str = Field(
        default="onyx",
        description="TTS voice (alloy/echo/fable/onyx/nova/shimmer/...).",
    )
```

In `get_settings()` replace the `ANTHROPIC_API_KEY` check (lines 128-132) with:

```python
    if not settings.OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is empty. Set it in backend/.env "
            "(see backend/.env.example for format)."
        )
```

Also update `DAILY_TOKEN_BUDGET`'s description string: `"Soft daily cap on OpenAI tokens (enforced via Redis)."` and the module docstring's mention of `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`.

- [ ] **Step 6: main.py — swap the client**

Line 160: `from anthropic import AsyncAnthropic` → `from openai import AsyncOpenAI`.

Lines 221-224 become:

```python
    # OpenAI client for classification + generation + TTS.  AsyncOpenAI
    # manages its own httpx pool internally — one shared instance for
    # the lifetime of the app.
    app.state.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
```

Line 238: `anthropic_client=app.state.anthropic,` → `openai_client=app.state.openai,` (the `RAGPipeline` constructor is renamed in Task 5 — until then the backend won't boot, which is fine mid-branch; Tasks 1-5 land as separate commits but are verified together at Task 5's end. If you want each commit bootable, do Steps 6's rename together with Task 5 — acceptable either way, the commit history note in Task 5 covers it).

- [ ] **Step 7: requirements**

`backend/requirements.txt` — delete lines 19 (`langchain-anthropic==0.3.4`) and 23 (`anthropic==0.41.0`); add `openai` pinned to the latest release:

```bash
pip index versions openai   # note the newest version, e.g. 2.x.y
```

Add `openai==<newest>` where `anthropic` was. Update the header comment (lines 1-3) to:

```
# swarajbangar.dev backend — Free-tier edition
# OpenAI SDK only (chat + TTS). NO litellm.
# Local sentence-transformers (384 dims) for embeddings.
```

Create `backend/requirements-dev.txt`:

```
pytest==8.3.4
```

Then install: `pip install -r requirements.txt -r requirements-dev.txt`.

- [ ] **Step 8: .env.example**

In `backend/.env.example`, replace the `ANTHROPIC_API_KEY=` block with:

```
# OpenAI — powers classification, generation, and TTS
OPENAI_API_KEY=sk-...
# Optional overrides (defaults shown)
# OPENAI_MODEL=gpt-4.1-mini
# OPENAI_CLASSIFIER_MODEL=gpt-4.1-nano
# OPENAI_TTS_MODEL=gpt-4o-mini-tts
# OPENAI_TTS_VOICE=onyx
```

Also add `OPENAI_API_KEY=sk-...` to your local `backend/.env` now (real key) so later verification steps work.

- [ ] **Step 9: Commit**

```bash
git add backend/app/llm.py backend/app/config.py backend/app/main.py backend/requirements.txt backend/requirements-dev.txt backend/.env.example backend/tests/
git commit -m "feat(backend): OpenAI client + chat_completion funnel, drop Anthropic config"
```

---

### Task 2: Backend — prompts module (persona + format + scope rules, refusal copy)

**Files:**
- Create: `backend/app/agents/prompts.py`

**Interfaces:**
- Produces (all `str` constants imported by Tasks 3-5): `GENERAL_SYSTEM_PROMPT`, `META_SYSTEM_PROMPT`, `EXPERIENCE_SYSTEM_PROMPT`, `RAG_SYSTEM_PROMPT`, `OFF_TOPIC_MESSAGE`.

- [ ] **Step 1: Create `backend/app/agents/prompts.py`**

```python
"""All SwarajOS system prompts in one place.

Composed from three shared rule blocks (persona / formatting / scope) so a
tone or format change edits one string, not four files. Tuning loop: edit
here → run ``python -m scripts.eval_agent`` (Task 11) → compare.
"""

from __future__ import annotations

_PERSONA = (
    "You are SwarajOS, the AI agent on Swaraj Bangar's portfolio site. "
    "You speak in first person as the site's agent (never as Swaraj himself), "
    "with a warm, confident, engineer-to-engineer tone. Your audience is "
    "hiring managers and fellow engineers."
)

_FORMAT_RULES = (
    "Formatting rules:\n"
    "- Short paragraphs, 1-3 sentences each.\n"
    "- Use **bold** for the facts that matter: company names, role titles, dates, metrics.\n"
    "- Use a bullet list ('- ' lines) whenever you present 3 or more items.\n"
    "- Keep answers under ~150 words unless the user explicitly asks for depth.\n"
    "- When you used retrieved context, cite it inline as [Source: resume], "
    "[Source: github], etc. — place the marker right after the fact it supports.\n"
    "- No headings, no tables, no code fences unless the user asks for code."
)

_SCOPE_RULES = (
    "Scope rules (hard):\n"
    "- You ONLY discuss Swaraj Bangar: his experience, skills, projects, education, "
    "availability, and this portfolio site / how you yourself work.\n"
    "- If asked about anything else (general knowledge, news, math, weather, other "
    "people, coding help unrelated to Swaraj), refuse in ONE friendly sentence and "
    "immediately suggest a Swaraj-related question instead. Never answer the "
    "off-topic question, not even partially.\n"
    "- Never invent facts about Swaraj. If the context doesn't cover something, say "
    "so honestly and suggest what to ask instead."
)

GENERAL_SYSTEM_PROMPT = (
    f"{_PERSONA}\n\n"
    "Handle greetings and small talk briefly and warmly, then steer toward what "
    "you can actually help with: Swaraj's experience, projects, and skills. "
    "Useful pointers you may offer: the terminal commands `help`, `projects`, "
    "`experience`, or the Lab section.\n\n"
    f"{_SCOPE_RULES}\n\n{_FORMAT_RULES}"
)

META_SYSTEM_PROMPT = (
    f"{_PERSONA}\n\n"
    "When asked how you work, explain conversationally and concisely: you are a "
    "multi-agent system built on LangGraph — an intent classifier (with an "
    "off-topic guardrail) routes each message to a specialist agent; grounded "
    "answers come from a hybrid RAG pipeline (pgvector + BM25 + cross-encoder "
    "rerank) over Swaraj's real documents; generation runs on OpenAI's GPT-4.1 "
    "family. Be proud but not boastful.\n\n"
    f"{_SCOPE_RULES}\n\n{_FORMAT_RULES}"
)

EXPERIENCE_SYSTEM_PROMPT = (
    f"{_PERSONA}\n\n"
    "You are answering as the Experience Navigator specialist. Answer questions "
    "about Swaraj's professional experience, skills, and projects using ONLY the "
    "provided context. Be specific: numbers, dates, technologies, outcomes. Prefer "
    "concrete achievements over generic descriptions. If the user asks a follow-up, "
    "use the conversation history to resolve references like 'that project'.\n\n"
    f"{_SCOPE_RULES}\n\n{_FORMAT_RULES}"
)

RAG_SYSTEM_PROMPT = (
    f"{_PERSONA}\n\n"
    "Answer the question using ONLY the provided context chunks. If the context "
    "doesn't contain the answer, say so honestly.\n\n"
    f"{_SCOPE_RULES}\n\n{_FORMAT_RULES}"
)

# Zero-LLM-cost templated refusal for the off_topic guardrail node.
OFF_TOPIC_MESSAGE = (
    "That one's outside my lane — I'm **SwarajOS**, and I only talk about "
    "Swaraj Bangar: his experience, projects, and skills.\n\n"
    "Try one of these:\n"
    "- What did he build at McKinsey?\n"
    "- What's his tech stack?\n"
    "- Is he open to new roles?"
)
```

- [ ] **Step 2: Sanity check + commit**

```bash
cd backend && python -c "from app.agents.prompts import OFF_TOPIC_MESSAGE, GENERAL_SYSTEM_PROMPT; print(len(GENERAL_SYSTEM_PROMPT))"
git add app/agents/prompts.py && git commit -m "feat(agents): centralized prompts with persona/format/scope rules"
```

---

### Task 3: Backend — intent classifier on OpenAI + `off_topic` intent

**Files:**
- Modify: `backend/app/agents/intent_classifier.py`
- Create: `backend/tests/test_intents.py`

**Interfaces:**
- Consumes: `chat_completion` (Task 1).
- Produces: `classify_intent(state, openai, redis, settings)` — **param renamed `anthropic` → `openai`** (callers updated in Task 4). `INTENT_CATEGORIES` gains `"off_topic"`. Cache key namespace bumps `intent:v1:` → `intent:v2:` (taxonomy changed; stale v1 entries must not be reused).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_intents.py`:

```python
"""Taxonomy + guardrail routing invariants."""
from __future__ import annotations

from app.agents.intent_classifier import INTENT_CATEGORIES
from app.agents.orchestrator import _INTENT_TO_NODE, _route_decision


def test_off_topic_is_a_known_intent():
    assert "off_topic" in INTENT_CATEGORIES


def test_off_topic_routes_to_guardrail_node():
    assert _INTENT_TO_NODE.get("off_topic") == "execute_off_topic"
    assert _route_decision({"intent": "off_topic"}) == "execute_off_topic"


def test_unknown_intent_still_falls_back_to_general():
    assert _route_decision({"intent": "nonsense"}) == "execute_general"
```

- [ ] **Step 2: Run it — must fail**

```bash
python -m pytest tests/test_intents.py -v
```
Expected: FAIL (`off_topic` not in categories / not in `_INTENT_TO_NODE`). (The second test also needs Task 4 — that's fine; this test file goes green at the end of Task 4.)

- [ ] **Step 3: Edit `backend/app/agents/intent_classifier.py`**

1. `TYPE_CHECKING` import (line 27): `from anthropic import AsyncAnthropic` → `from openai import AsyncOpenAI`.
2. Add import: `from app.llm import chat_completion`.
3. Delete `_CLASSIFIER_MODEL = "claude-haiku-4-5-20251001"` (line 34) — model now comes from settings.
4. Add to `INTENT_CATEGORIES` (after `"meta_question"`), and tighten `general_chat`'s description so the LLM separates the two:

```python
    "general_chat": "Greetings, small talk, thanks, pleasantries directed at the agent",
    "off_topic": (
        "Anything unrelated to Swaraj Bangar or this portfolio: general knowledge "
        "(capitals, history, math), news, weather, other people, or coding help "
        "that has nothing to do with Swaraj's work"
    ),
```

5. Bump the cache key (line 95): `intent:v1:` → `intent:v2:`.
6. In `classify_intent`, rename the parameter `anthropic: "AsyncAnthropic"` → `openai: "AsyncOpenAI"` and pass it through to `_classify_with_llm`.
7. Replace `_classify_with_llm`'s LLM call (lines 189-205) with:

```python
    try:
        text, tokens = await chat_completion(
            openai,
            model=settings.OPENAI_CLASSIFIER_MODEL,
            user=prompt,
            max_tokens=200,
            temperature=0.0,
            json_mode=True,
        )
    except Exception as exc:  # noqa: BLE001 — any API failure → safe default
        logger.warning("intent LLM call failed: %s; defaulting to general_chat", exc)
        return {**_DEFAULT_RESULT, "reason": "Classifier unavailable"}

    # Record token usage against the daily budget.
    try:
        await record_tokens(redis, settings, tokens)
    except Exception:  # noqa: BLE001
        pass
```

   and the parse block below it starts from `text` directly (drop `response.content[0].text.strip()`; keep the fence-strip + `json.loads` + confidence-coerce logic exactly as is).
8. `_classify_with_llm` signature: `(state, msg, openai: "AsyncOpenAI", redis, settings)`.
9. One behavior guard — the existing low-confidence demotion (line 146-148) demotes to `general_chat`. Keep it: a hesitant `off_topic` verdict becomes `general_chat`, whose prompt (Task 2) still refuses via scope rules. Defense in depth, no code change.
10. Update the module docstring's "Haiku" mentions to "the cheap OpenAI classifier model".

- [ ] **Step 4: Run the taxonomy test — first assertion passes**

```bash
python -m pytest tests/test_intents.py::test_off_topic_is_a_known_intent -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/agents/intent_classifier.py tests/test_intents.py
git commit -m "feat(agents): OpenAI intent classifier + off_topic guardrail intent"
```

---

### Task 4: Backend — orchestrator on OpenAI + guardrail node + conversation history

**Files:**
- Modify: `backend/app/agents/orchestrator.py`
- Modify: `backend/app/routers/agent.py:49` (deps key)

**Interfaces:**
- Consumes: `chat_completion`, `GENERAL_SYSTEM_PROMPT`, `META_SYSTEM_PROMPT`, `OFF_TOPIC_MESSAGE`.
- Produces: deps key `"openai"` (replaces `"anthropic"`) — Task 5 relies on it; `run_agent` sanitizes `context["messages"]` into `state["messages"]` (list of `{"role","content"}`, ≤8 items, content ≤2000 chars) — Task 6's frontend relies on this contract; `done` event `model` = `settings.OPENAI_MODEL`.

- [ ] **Step 1: Edit `backend/app/agents/orchestrator.py`**

1. Imports: add
```python
from app.agents.prompts import (
    GENERAL_SYSTEM_PROMPT,
    META_SYSTEM_PROMPT,
    OFF_TOPIC_MESSAGE,
)
from app.llm import chat_completion
```
2. Delete `_SONNET_MODEL = "claude-sonnet-4-5"` (line 53). Keep `_GENERATE_MAX_TOKENS` / `_GENERATE_TEMPERATURE`.
3. `_INTENT_TO_NODE`: add `"off_topic": "execute_off_topic",`.
4. `_route_node` agent-label map: add `"execute_off_topic": "Guardrail",`.
5. `_classify_node`: `anthropic=deps["anthropic"]` → `openai=deps["openai"]` (keyword rename matches Task 3).
6. New node, placed after `_execute_general_node`:

```python
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
```

7. `_build_graph()`: `graph.add_node("execute_off_topic", _execute_off_topic_node)`; add `"execute_off_topic": "execute_off_topic",` to the conditional-edges map; add `"execute_off_topic"` to the `for node in (...)` synthesize-edge tuple.
8. `_execute_general_node` (lines 144-226): replace `anthropic = deps["anthropic"]` with `openai = deps["openai"]`; add `model = settings.OPENAI_MODEL` right after `settings = ...`. Replace both inline system prompts with `META_SYSTEM_PROMPT` / `GENERAL_SYSTEM_PROMPT`. Replace the Anthropic call block (lines 190-210) with:

```python
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
```

   (keep the existing outer `except Exception` fallback-answer block unchanged). Replace the two remaining `_SONNET_MODEL` references in this node's `append_step` data with `model`.
9. `run_agent` (lines 347-415): sanitize the incoming context at the trust boundary — replace `"messages": (context or {}).get("messages", []),` with:

```python
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
        ...
```

   and the final `AgentDoneEvent`: `model=_SONNET_MODEL` → `model=getattr(deps.get("settings"), "OPENAI_MODEL", "")`.
10. Update the module docstring (line 19 "Anthropic", line 27 "Anthropic") and the flow diagram comment to include the `off_topic ─> execute_off_topic` branch.

- [ ] **Step 2: Edit `backend/app/routers/agent.py`**

Line 49: `"anthropic": getattr(state, "anthropic", None),` → `"openai": getattr(state, "openai", None),`.

- [ ] **Step 3: Run the intent tests — all green now**

```bash
python -m pytest tests/ -v
```
Expected: all tests in `test_llm.py` and `test_intents.py` PASS.

- [ ] **Step 4: Commit**

```bash
git add app/agents/orchestrator.py app/routers/agent.py
git commit -m "feat(agents): OpenAI generation, off-topic guardrail node, session history"
```

---

### Task 5: Backend — experience agent + RAG pipeline on OpenAI

**Files:**
- Modify: `backend/app/agents/experience_agent.py`
- Modify: `backend/app/rag/pipeline.py`

**Interfaces:**
- Consumes: `chat_completion`, `EXPERIENCE_SYSTEM_PROMPT`, `RAG_SYSTEM_PROMPT`, deps key `"openai"`.
- Produces: `RAGPipeline(retriever, reranker, settings, openai_client)` — **constructor param renamed** (main.py already updated in Task 1 Step 6). After this task the backend boots end-to-end on OpenAI.

- [ ] **Step 1: Edit `backend/app/agents/experience_agent.py`**

1. Replace the local `SYSTEM_PROMPT` constant (lines 55-63) with `from app.agents.prompts import EXPERIENCE_SYSTEM_PROMPT`; add `from app.llm import chat_completion`.
2. Wherever the module reads `deps["anthropic"]` / `_SONNET_MODEL`, switch to `deps["openai"]` and `model = settings.OPENAI_MODEL` (set once near the top of `execute_experience`, next to where `settings` is pulled from deps). Update the TYPE_CHECKING import if present.
3. Replace the generate block (lines 212-240) with:

```python
    user_msg = f"Context:\n{context_text}\n\nQuestion: {query}"
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in state.get("messages", [])
    ]
    t0 = time.perf_counter()
    try:
        answer, total = await chat_completion(
            openai,
            model=model,
            system=EXPERIENCE_SYSTEM_PROMPT,
            history=history,
            user=user_msg,
            max_tokens=_MAX_TOKENS,
            temperature=_TEMPERATURE,
        )
        gen_ms = (time.perf_counter() - t0) * 1000
        state["agent_response"] = answer
        state.setdefault("metadata", {})["total_tokens"] = (
            state.get("metadata", {}).get("total_tokens", 0) + total
        )
        await record_tokens(redis, settings, total)
        append_step(
            state,
            "generate",
            "complete",
            {"model": model, "tokens": total},
            gen_ms,
        )
```

   Keep the existing `except Exception` error branch, replacing its `_SONNET_MODEL` reference with `model`. Also replace `_SONNET_MODEL` in the budget-fallback `append_step` (line 205) with `model`. (Frontend `stepLabel` reads `d.output_tokens ?? d.tokens`, so `{"tokens": total}` renders correctly.)

- [ ] **Step 2: Edit `backend/app/rag/pipeline.py`**

1. TYPE_CHECKING import: `from anthropic import AsyncAnthropic` → `from openai import AsyncOpenAI`. Add `from app.llm import chat_completion` and `from app.agents.prompts import RAG_SYSTEM_PROMPT`; delete the local `SYSTEM_PROMPT` (lines 45-51) and `_DEFAULT_MODEL` (line 38, plus its comment lines 36-37).
2. Constructor (lines 57-69):

```python
    def __init__(
        self,
        retriever: "HybridRetriever",
        reranker: "CrossEncoderReranker",
        settings: "Settings",
        openai_client: "AsyncOpenAI",
    ) -> None:
        self.retriever = retriever
        self.reranker = reranker
        self.settings = settings
        self.openai = openai_client
        self.model = settings.OPENAI_MODEL
```

3. In the generate stage (lines ~152-158), replace the `self.anthropic.messages.create(...)` call + text extraction with:

```python
        answer, _tokens = await chat_completion(
            self.openai,
            model=self.model,
            system=RAG_SYSTEM_PROMPT,
            user=user_msg,
            max_tokens=_MAX_TOKENS,
            temperature=_TEMPERATURE,
        )
```

   Preserve all surrounding step-timing/response-assembly logic; anywhere the step data or response carries a model name, use `self.model`.
4. Sweep the file for leftover `anthropic` references: `grep -n anthropic app/rag/pipeline.py` → must return nothing.

- [ ] **Step 3: Boot + live smoke test (backend now fully on OpenAI)**

```bash
cd backend && uvicorn app.main:app --reload &
sleep 8
curl -s http://localhost:8000/health
# On-topic — expect step events then a McKinsey answer with [Source: ...] and **bold**:
curl -N -X POST http://localhost:8000/v1/agent/orchestrate -H 'Content-Type: application/json' \
  -d '{"message":"What did Swaraj do at McKinsey?","session_id":"00000000-0000-0000-0000-000000000001"}'
# Guardrail — expect the templated refusal, and the route step shows "Guardrail":
curl -N -X POST http://localhost:8000/v1/agent/orchestrate -H 'Content-Type: application/json' \
  -d '{"message":"What is the capital of the USA?","session_id":"00000000-0000-0000-0000-000000000002"}'
# RAG endpoint still works:
curl -s -X POST http://localhost:8000/v1/rag/query -H 'Content-Type: application/json' \
  -d '{"query":"What is Swaraj'\''s tech stack?","top_k":5}' | head -c 600
grep -rn "anthropic\|Anthropic\|claude-" app/ --include="*.py"   # → only harmless comments, ideally nothing
```

- [ ] **Step 4: Commit**

```bash
git add app/agents/experience_agent.py app/rag/pipeline.py
git commit -m "refactor(backend): experience agent + RAG pipeline on OpenAI gpt-4.1-mini"
```

---

### Task 6: Frontend — send conversation history to the agent

**Files:**
- Modify: `src/lib/types.ts` (add `AgentHistoryMessage`)
- Modify: `src/lib/api-client.ts:464-526` (`streamAgent`)
- Modify: `src/lib/hooks/useAgentChat.ts`

**Interfaces:**
- Consumes: backend `context.messages` contract from Task 4 (role user/assistant, backend truncates to last 8 / 2000 chars).
- Produces: `streamAgent(message: string, sessionId: string, history?: readonly AgentHistoryMessage[])`; `interface AgentHistoryMessage { readonly role: 'user' | 'assistant'; readonly content: string }`.

- [ ] **Step 1: `src/lib/types.ts`** — next to the existing `AgentEvent` types add:

```ts
export interface AgentHistoryMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}
```

- [ ] **Step 2: `src/lib/api-client.ts`** — extend `streamAgent`:

```ts
export async function* streamAgent(
  message: string,
  sessionId: string,
  history?: readonly AgentHistoryMessage[],
): AsyncGenerator<AgentEvent> {
```

and in the fetch body (currently `JSON.stringify({ message, session_id: sessionId })` around line 476):

```ts
    body: JSON.stringify({
      message,
      session_id: sessionId,
      ...(history && history.length > 0 ? { context: { messages: history } } : {}),
    }),
```

Import `AgentHistoryMessage` from `./types`. Mock fallback path unchanged.

- [ ] **Step 3: `src/lib/hooks/useAgentChat.ts`** — capture history at send time via a ref (avoids stale-closure issues regardless of how `sendMessage` is memoized):

```ts
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
```

and inside `sendMessage`, before the stream loop:

```ts
    const history: AgentHistoryMessage[] = messagesRef.current
      .filter((m) => !m.streaming && m.content)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
```

then `streamAgent(trimmed, sessionId, history)`. Add the `useRef`/`useEffect` imports if missing and `AgentHistoryMessage` type import. Note: `ChatMessage.role` — if it is wider than `'user' | 'assistant'` in types.ts, narrow with a filter `(m.role === 'user' || m.role === 'assistant')`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run build
```
Then with backend + `npm run dev` running: in the ChatDock ask "What did he build at McKinsey?", then follow up "and what tech did he use there?" — the follow-up must resolve "there" to McKinsey (history now flows through).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/api-client.ts src/lib/hooks/useAgentChat.ts
git commit -m "feat(chat): thread conversation history through to the agent"
```

---

### Task 7: Frontend — mini-markdown rendering for assistant answers

**Files:**
- Modify: `src/components/landing/agentFormat.tsx` (replace `renderWithSources` with `renderAssistantMarkdown`)
- Modify: `src/components/landing/ChatDock.tsx:101` (call site)
- Modify: `src/components/landing/LabDemos.tsx:197` (call site)
- Modify: `src/app/landing.css` (near `.src-pill`, ~line 635)

**Interfaces:**
- Produces: `renderAssistantMarkdown(text: string): ReactNode` (handles `**bold**`, `` `code` ``, `- ` bullet lists, blank-line paragraphs, `[Source: x]` pills) and `speechText(text: string): string` (markdown/citation stripper — Task 9 consumes it).

- [ ] **Step 1: Rewrite `src/components/landing/agentFormat.tsx` rendering section**

Replace `renderWithSources` (lines 10-24) with:

```tsx
/** Inline formatting: [Source: x] pills, **bold**, `code`. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\[Source:[^\]]+\]|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const src = part.match(/^\[Source:\s*([^\]]+)\]$/);
    if (src) {
      return (
        <span key={`${keyPrefix}-${i}`} className="src-pill">
          {src[1].trim()}
        </span>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={`${keyPrefix}-${i}`}>{bold[1]}</strong>;
    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      return (
        <code key={`${keyPrefix}-${i}`} className="md-code">
          {code[1]}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

/**
 * Render assistant text as the mini-markdown subset the agent's prompts
 * enforce: short paragraphs, '- ' bullet lists, bold, inline code, and
 * [Source: x] citation pills. Tolerates partial markup mid-stream (an
 * unclosed ** simply renders as plain text).
 */
export function renderAssistantMarkdown(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const lines = text.split('\n');

  const flushList = (idx: number) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${idx}`} className="md-list">
        {list.map((item, j) => (
          <li key={j}>{renderInline(item, `li-${idx}-${j}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      list = [...list, bullet[1]];
      return;
    }
    flushList(i);
    if (line.trim()) {
      blocks.push(
        <p key={`p-${i}`} className="md-p">
          {renderInline(line, `p-${i}`)}
        </p>,
      );
    }
  });
  flushList(lines.length);
  return blocks;
}

/** Plain-text version of an answer for TTS: strip citations + markdown. */
export function speechText(text: string): string {
  return text
    .replace(/\[Source:[^\]]+\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
```

(`stepLabel` stays as is.)

- [ ] **Step 2: Update the two call sites**

- `ChatDock.tsx:101`: `renderWithSources(m.content)` → `renderAssistantMarkdown(m.content)`; update the import on line 18.
- `LabDemos.tsx:197`: same swap; update its import.
- `grep -rn "renderWithSources" src/` → no results.

- [ ] **Step 3: CSS — add below the `.src-pill` rule in `src/app/landing.css`**

```css
/* mini-markdown inside assistant bubbles */
.bubble .md-p { margin: 0 0 8px; }
.bubble .md-p:last-child { margin-bottom: 0; }
.bubble .md-list { margin: 4px 0 8px; padding-left: 18px; display: grid; gap: 4px; }
.bubble .md-list:last-child { margin-bottom: 0; }
.bubble .md-code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
}
```

(If landing.css uses different token names for mono font, match the file's existing convention.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run build
```
Dev server + backend up: ask "What's his tech stack?" → answer shows bold company/tech names, a bullet list, and source pills. Kill the backend → canned mock answers still render (plain text through the same renderer). Ask the guardrail question → `OFF_TOPIC_MESSAGE`'s bold + bullets render.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/agentFormat.tsx src/components/landing/ChatDock.tsx src/components/landing/LabDemos.tsx src/app/landing.css
git commit -m "feat(chat): mini-markdown renderer for assistant answers"
```

---

### Task 8: Backend — TTS endpoint

**Files:**
- Modify: `backend/app/models.py` (add `TTSRequest`)
- Create: `backend/app/routers/tts.py`
- Modify: `backend/app/main.py` (register router — mirror the existing `include_router` lines)

**Interfaces:**
- Consumes: `app.state.openai`, `budget_available`/`record_tokens`, settings `OPENAI_TTS_MODEL`/`OPENAI_TTS_VOICE`.
- Produces: `POST /v1/tts` `{ "text": string (1..1500) }` → `200 audio/mpeg` stream; `503` if client missing; `429` if budget exhausted; `422` on validation failure. Task 9's proxy consumes this.

- [ ] **Step 1: `backend/app/models.py`** — add near the other request models:

```python
class TTSRequest(BaseModel):
    """POST /v1/tts — text to synthesize (capped to bound per-call cost)."""

    text: str = Field(..., min_length=1, max_length=1500)
```

- [ ] **Step 2: Create `backend/app/routers/tts.py`**

```python
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
```

- [ ] **Step 3: Register in `backend/app/main.py`** — next to the existing router includes (find them with `grep -n include_router app/main.py`), add:

```python
app.include_router(tts.router, prefix="/v1/tts", tags=["tts"])
```

with the matching `from app.routers import ... tts` import, following the file's existing import style.

- [ ] **Step 4: Live verification**

```bash
cd backend && uvicorn app.main:app --reload &
sleep 8
curl -s -X POST http://localhost:8000/v1/tts -H 'Content-Type: application/json' \
  -d '{"text":"Hi, I am SwarajOS. Swaraj built AI systems at McKinsey and ThoughtWorks."}' \
  -o /tmp/swarajos-tts.mp3 -w '%{http_code} %{size_download} bytes\n'
file /tmp/swarajos-tts.mp3        # → "MPEG ADTS, layer III" / "Audio file"
afplay /tmp/swarajos-tts.mp3      # hear it (macOS)
# Validation guard:
curl -s -X POST http://localhost:8000/v1/tts -H 'Content-Type: application/json' -d '{"text":""}' -w '\n%{http_code}\n'   # → 422
```

- [ ] **Step 5: Commit**

```bash
git add app/models.py app/routers/tts.py app/main.py
git commit -m "feat(backend): /v1/tts endpoint streaming OpenAI speech"
```

---

### Task 9: Frontend — /api/tts proxy, useSpeech hook, speaker button

**Files:**
- Create: `src/app/api/tts/route.ts`
- Create: `src/lib/hooks/useSpeech.ts`
- Modify: `src/components/landing/ChatDock.tsx`
- Modify: `src/app/landing.css`

**Interfaces:**
- Consumes: `POST /v1/tts` (Task 8), `getBackendOrigin()` from `src/lib/server/backend.ts`, `speechText()` from Task 7, `notifyDemoMode()` from `src/lib/api-client.ts`.
- Produces: `useSpeech(): { speakingId: string | null; speak: (id: string, text: string) => Promise<void>; stop: () => void }`.

- [ ] **Step 1: Create `src/app/api/tts/route.ts`** (mirrors `src/app/api/agent/route.ts`'s structure):

```ts
import type { NextRequest } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Same-origin proxy for backend TTS — streams audio/mpeg through. */
export async function POST(req: NextRequest): Promise<Response> {
  const origin = getBackendOrigin();
  if (!origin) {
    return Response.json({ error: 'backend-unconfigured' }, { status: 503 });
  }
  try {
    const upstream = await fetch(`${origin}/v1/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      signal: AbortSignal.timeout(25_000),
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: 'tts-upstream-failed' }, { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'backend-unreachable' }, { status: 502 });
  }
}
```

(If `src/lib/server/proxy.ts` already exposes a reusable streaming helper, use it instead — check before writing; the agent route is the pattern to copy.)

- [ ] **Step 2: Create `src/lib/hooks/useSpeech.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyDemoMode } from '@/lib/api-client';

interface UseSpeech {
  readonly speakingId: string | null;
  readonly speak: (id: string, text: string) => Promise<void>;
  readonly stop: () => void;
}

/**
 * Speak assistant answers. Primary path: backend TTS via /api/tts (OpenAI
 * voice). Fallback when the backend is down: the browser's built-in
 * speechSynthesis — the button always works (demo-mode contract).
 */
export function useSpeech(): UseSpeech {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  useEffect(() => stop, [stop]); // halt audio on unmount

  const speak = useCallback(
    async (id: string, text: string) => {
      stop();
      if (!text) return;
      setSpeakingId(id);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 1500) }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => stop();
        audio.onerror = () => stop();
        await audio.play();
      } catch {
        notifyDemoMode('TTS backend unavailable');
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          setSpeakingId(null);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
      }
    },
    [stop],
  );

  return { speakingId, speak, stop };
}
```

- [ ] **Step 3: Speaker button in `src/components/landing/ChatDock.tsx`**

1. Imports: add `Volume2, Square` to the lucide import (line 14); `import { useSpeech } from '@/lib/hooks/useSpeech';`; add `speechText` to the `./agentFormat` import.
2. In the component body: `const { speakingId, speak, stop } = useSpeech();`
3. In the message map (lines 92-106), after the assistant bubble `</div>` (inside the `.row`), add:

```tsx
                  {m.role === 'assistant' && !m.streaming && m.content && (
                    <button
                      className={`bubble-speak${speakingId === m.id ? ' is-speaking' : ''}`}
                      onClick={() =>
                        speakingId === m.id ? stop() : void speak(m.id, speechText(m.content))
                      }
                      aria-label={speakingId === m.id ? 'Stop speaking' : 'Speak this answer'}
                    >
                      {speakingId === m.id ? <Square size={11} /> : <Volume2 size={13} />}
                    </button>
                  )}
```

- [ ] **Step 4: CSS — add near the other `.chat-dock` composer rules in `landing.css`**

```css
.chat-dock .bubble-speak {
  align-self: flex-end;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 150ms ease-out, border-color 150ms ease-out;
}
.chat-dock .bubble-speak:hover { color: var(--accent-teal); }
.chat-dock .bubble-speak.is-speaking {
  color: var(--accent-teal);
  border-color: var(--accent-teal);
}
```

(Match the exact CSS variable names already used in landing.css; if `.row` isn't a flex container, wrap bubble+button or absolutely position within the row — follow whatever the existing `.row`/`.bubble` layout allows with the smallest change.)

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run build
```
Dev + backend up: ask a question → speaker icon appears on the finished answer → click → OpenAI voice reads it (no markdown symbols or "Source" spoken); click again mid-playback → stops. Kill the backend → button falls back to the robotic browser voice + demo-mode toast fires once. Network tab: only `/api/tts` (same-origin).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tts/route.ts src/lib/hooks/useSpeech.ts src/components/landing/ChatDock.tsx src/app/landing.css
git commit -m "feat(chat): speak answers — /api/tts proxy + useSpeech + speaker button"
```

---

### Task 10: Copy + docs sweep (Claude → OpenAI)

**Files:**
- Modify: `src/components/landing/ChatDock.tsx:85,153`
- Modify: `src/components/landing/LabDemos.tsx:216`
- Modify: `src/components/terminal/CommandParser.ts:90,145`
- Modify: `src/components/landing/Landing.tsx:389`
- Modify: `src/components/landing/LabSection.tsx:55,70`
- Modify: `.claude/CLAUDE.md` (constraints + infra sections)

**Leave alone:** `src/lib/mock-data.ts:267` ("Claude Sonnet 4" is a Model-Arena comparison entry — listing Claude as a compared model is still accurate) and `src/lib/constants.ts:173` ("Claude API" in the skills list is biographical — Swaraj's résumé skill, not the site's stack).

- [ ] **Step 1: Apply the copy changes**

| Location | Old | New |
|---|---|---|
| ChatDock.tsx:153 | `SwarajOS · live multi-agent system on LangGraph + Claude` | `SwarajOS · live multi-agent system on LangGraph + GPT-4.1` |
| LabDemos.tsx:216 | placeholder trace `claude-sonnet-4` | `gpt-4.1-mini` |
| CommandParser.ts:90 | `Claude Sonnet 4` (neofetch) | `GPT-4.1 mini` |
| CommandParser.ts:145 | `Claude API · GPT-4 · RAG Pipelines · Multi-agent orchestration` | `OpenAI API · RAG Pipelines · Multi-agent orchestration` |
| Landing.tsx:389 | `…FastAPI, LangGraph, Claude and too much coffee` | `…FastAPI, LangGraph, OpenAI and too much coffee` |
| LabSection.tsx:55,70 | `Claude API` | `OpenAI API` |

(Line numbers are as of branch start — locate by string, not line, with `grep -rn "Claude" src/`.)

- [ ] **Step 2: Update `.claude/CLAUDE.md`**

In "Critical constraints": replace the two lines
`- NO openai package in requirements.txt` and `- NO litellm package in requirements.txt — direct Anthropic SDK only`
with:
`- Direct OpenAI SDK only (openai package) — NO litellm, NO langchain-openai; all LLM calls go through app/llm.py::chat_completion`
Also update the "LLM: Anthropic API only (Sonnet for responses, Haiku for classification)" infra line to `LLM: OpenAI API only (gpt-4.1-mini responses, gpt-4.1-nano classification, gpt-4o-mini-tts speech)`. Sweep the rest of the file for stale "Anthropic"/"ANTHROPIC_API_KEY" mentions and update env-var docs to `OPENAI_API_KEY`.

- [ ] **Step 3: Verify + commit**

```bash
grep -rn "Claude" src/ | grep -v mock-data | grep -v constants   # → nothing unexpected
npx tsc --noEmit && npm run build
git add -A && git commit -m "docs: Claude → OpenAI copy sweep + CLAUDE.md constraints"
```

---

### Task 11: Eval script — the "fine-tuning" feedback loop

**Files:**
- Create: `backend/scripts/eval_agent.py`

**Interfaces:**
- Consumes: live `POST /v1/agent/orchestrate` SSE (uses `httpx`, already in requirements).
- Produces: `python -m scripts.eval_agent [--base URL]` — exit 0 = all golden cases pass. This is the loop for tuning `prompts.py`: edit prompt → run eval → compare.

- [ ] **Step 1: Create `backend/scripts/eval_agent.py`**

```python
"""Golden-question eval for the SwarajOS agent.

Usage:
    python -m scripts.eval_agent [--base http://localhost:8000]

Streams each golden question through /v1/agent/orchestrate, reassembles the
answer from the SSE token events, and checks keyword groups (every group
must match at least one keyword, case-insensitive). Exit code 1 on any
failure — run this after every prompt change in app/agents/prompts.py.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid

import httpx

# (question, [keyword groups]) — each group needs >=1 match in the answer.
GOLDEN: list[tuple[str, list[list[str]]]] = [
    ("What did Swaraj do at McKinsey?", [["mckinsey"]]),
    ("Tell me about his time at ThoughtWorks", [["thoughtworks"]]),
    ("What's his tech stack?", [["react", "next", "typescript", "python", "fastapi"]]),
    ("Is he open to new roles?", [["open"]]),
    ("How does SwarajOS work?", [["agent", "rag", "langgraph", "classifier"]]),
    # Guardrails — the refusal must mention Swaraj and must NOT answer:
    ("What is the capital of the USA?", [["swaraj"]]),
    ("Write me a poem about the ocean", [["swaraj"]]),
    ("What's 2+2?", [["swaraj"]]),
]

# Answers to guardrail questions must NOT contain these.
FORBIDDEN: dict[str, list[str]] = {
    "What is the capital of the USA?": ["washington"],
    "What's 2+2?": ["four", " 4"],
}


def ask(base: str, question: str) -> str:
    """Stream one question; return the reassembled answer text."""
    chunks: list[str] = []
    event: str | None = None
    with httpx.stream(
        "POST",
        f"{base}/v1/agent/orchestrate",
        json={"message": question, "session_id": str(uuid.uuid4())},
        timeout=90.0,
    ) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if line.startswith("event:"):
                event = line.split(":", 1)[1].strip()
            elif line.startswith("data:") and event == "token":
                chunks.append(json.loads(line.split(":", 1)[1])["text"])
    return "".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000")
    base = parser.parse_args().base

    failures = 0
    for question, groups in GOLDEN:
        try:
            answer = ask(base, question)
        except Exception as exc:  # noqa: BLE001
            print(f"✗ {question!r} — request failed: {exc}")
            failures += 1
            continue
        low = answer.lower()
        missing = [g for g in groups if not any(k in low for k in g)]
        leaked = [w for w in FORBIDDEN.get(question, []) if w in low]
        ok = not missing and not leaked
        failures += 0 if ok else 1
        print(f"{'✓' if ok else '✗'} {question}")
        if missing:
            print(f"    missing any of: {missing}")
        if leaked:
            print(f"    guardrail leaked: {leaked}")
        if not ok:
            print(f"    answer: {answer[:220]!r}")

    print(f"\n{len(GOLDEN) - failures}/{len(GOLDEN)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run it against the local backend**

```bash
cd backend && python -m scripts.eval_agent
```
Expected: `8/8 passed`. If any fail, tune `app/agents/prompts.py` (or `INTENT_CATEGORIES` descriptions) and re-run — **this is the fine-tuning loop**. Iterate until green.

- [ ] **Step 3: Full local verification sweep**

```bash
python -m pytest tests/ -v                                  # backend units green
cd .. && npx tsc --noEmit && npm run lint && npm run build  # frontend green
grep -rn "sessionStorage\|localStorage" src/lib/hooks/useSpeech.ts src/lib/hooks/useAgentChat.ts  # → nothing
grep -rn "anthropic" backend/app backend/requirements.txt   # → nothing
```

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/eval_agent.py
git commit -m "feat(eval): golden-question eval loop for prompt tuning"
```

---

### Task 12: Deploy + production verification

**Files:** none (ops).

- [ ] **Step 1: Push and PR**

```bash
git push -u origin feat/openai-agent
gh pr create --title "feat: SwarajOS on OpenAI — guardrails, markdown answers, TTS" \
  --body "Migrates the agent from Anthropic to OpenAI (gpt-4.1-mini / gpt-4.1-nano), adds an off_topic guardrail intent with a zero-cost refusal node, centralizes prompts (persona/format/scope), threads conversation history through, renders a mini-markdown subset in the chat, and adds a speak-answer TTS path (/v1/tts + /api/tts + useSpeech). Includes scripts/eval_agent.py golden-question eval."
```
Merge after review; Vercel auto-deploys `main`. **No Vercel env changes needed** (`BACKEND_ORIGIN` unchanged).

- [ ] **Step 2: Droplet deploy**

```bash
ssh <droplet>
cd ~/swarajbangar-dev/backend   # adjust to the actual checkout path
git pull
# .env: add OPENAI_API_KEY=sk-...; ANTHROPIC_API_KEY can be deleted (now ignored)
nano .env
docker compose up -d --build
docker compose logs -f --tail=50 backend   # wait for "backend ready"
curl -s http://localhost:8000/health
```
No `ingest --clear` needed — embeddings are local and unchanged.

- [ ] **Step 3: Production acceptance test**

On https://swarajbangar-dev.vercel.app:
1. ChatDock: "What did Swaraj build at McKinsey?" → streamed markdown answer with bold + source pills; trace shows `classify → route → tool_call → generate` with `gpt-4.1-mini`.
2. Follow-up "what tech did he use there?" → resolves "there" from history.
3. "What is the capital of the USA?" → guardrail refusal (route step shows **Guardrail**), no Washington.
4. Speaker button → OpenAI voice; DevTools Network shows only same-origin `/api/agent` + `/api/tts`.
5. Footer reads "LangGraph + GPT-4.1"; terminal `neofetch` shows GPT-4.1 mini.
6. Optionally run the eval against prod: `python -m scripts.eval_agent --base http://<DROPLET_IP>:8000`.

---

## Self-review notes

- **Spec coverage:** OpenAI switch (Tasks 1-5), response quality "fine-tuning" (Tasks 2, 6, 11 — prompt/eval loop, per user's no-paid-pipeline decision), guardrails with example-matching refusal (Tasks 3-4), good output format (Tasks 2+7), chat + speak with backend handling (Tasks 8-9), copy/doc consistency (Task 10), deploy (Task 12). ✓
- **Type consistency:** deps key `"openai"` (Tasks 3,4,5 consume; 1 produces via `app.state.openai` → agent.py `_build_deps`); `chat_completion` signature identical at all five call sites; `renderAssistantMarkdown`/`speechText` produced in Task 7, consumed in Tasks 7/9; `AgentHistoryMessage` produced Task 6. ✓
- **Known mid-branch state:** backend is not bootable between Task 1 Step 6 and Task 5 Step 2 (constructor rename spans commits). Verified working at Task 5 Step 3. Noted inline.
- **Line numbers** are anchors from the current HEAD (`dd98f92`); executors should locate by the quoted code, not blindly by line.
