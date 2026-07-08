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
