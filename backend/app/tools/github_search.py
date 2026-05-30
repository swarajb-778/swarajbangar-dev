"""github_search tool — find Swaraj's repos relevant to a query.

Uses the GitHub REST API when ``GITHUB_TOKEN`` is configured; otherwise
falls back to a curated static list grounded in the resume so the agent
always has *something* concrete to cite.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from langchain_core.tools import tool

from app.config import get_settings

logger = logging.getLogger(__name__)

_GITHUB_USERNAME = "swarajb-778"
_HTTP_TIMEOUT_S = 10.0

# Curated fallback — grounded in resume_projects.md.  Used when no GitHub
# token is configured or the live API call fails.
_CURATED_REPOS: list[dict[str, Any]] = [
    {
        "name": "collaborito",
        "description": "Real-time collaborative notepad with Yjs CRDT sync, "
        "FastAPI WebSocket gateway, and Postgres-backed late-joiner sync.",
        "language": "TypeScript",
        "stars": 0,
        "url": "https://github.com/swarajb-778/collaborito",
        "topics": ["crdt", "yjs", "websockets", "fastapi", "real-time"],
    },
    {
        "name": "rapidorch",
        "description": "Lightweight self-hosted workflow orchestrator — a "
        "single-binary Airflow alternative with YAML pipelines and a Bubble "
        "Tea TUI.",
        "language": "Go",
        "stars": 380,
        "url": "https://github.com/swarajb-778/rapidorch",
        "topics": ["orchestration", "workflow", "golang", "cli", "scheduler"],
    },
    {
        "name": "swarajos",
        "description": "Multi-agent orchestration playground — ReAct, "
        "Plan-and-Execute, Reflexion, and hierarchical patterns on LangGraph "
        "with SSE streaming.",
        "language": "Python",
        "stars": 0,
        "url": "https://github.com/swarajb-778/swarajos",
        "topics": ["langgraph", "agents", "llm", "rag", "python"],
    },
    {
        "name": "swarajbangar-dev",
        "description": "This portfolio — Next.js 14 frontend + FastAPI "
        "backend with a local-embedding RAG pipeline (pgvector + BM25 + "
        "cross-encoder) and a LangGraph agent.",
        "language": "TypeScript",
        "stars": 0,
        "url": "https://github.com/swarajb-778/swarajbangar-dev",
        "topics": ["nextjs", "fastapi", "pgvector", "langgraph", "rag"],
    },
    {
        "name": "chaos-lab",
        "description": "Browser-based failure-injection visualizer — "
        "load-shedding, circuit-breaking, and retry-with-backoff demos "
        "running in Web Workers.",
        "language": "TypeScript",
        "stars": 0,
        "url": "https://github.com/swarajb-778/chaos-lab",
        "topics": ["resilience", "circuit-breaker", "chaos-engineering"],
    },
]


def _match_curated(query: str) -> list[dict[str, Any]]:
    """Rank the curated repos by keyword overlap with the query."""
    keywords = [k for k in query.lower().split() if len(k) > 2]
    if not keywords:
        return _CURATED_REPOS[:5]

    scored: list[tuple[int, dict[str, Any]]] = []
    for repo in _CURATED_REPOS:
        haystack = " ".join(
            [
                repo["name"],
                repo.get("description") or "",
                repo.get("language") or "",
                " ".join(repo.get("topics", [])),
            ]
        ).lower()
        score = sum(1 for k in keywords if k in haystack)
        scored.append((score, repo))

    scored.sort(key=lambda x: x[0], reverse=True)
    # If nothing matched, still return the top few so the agent has context.
    matched = [repo for score, repo in scored if score > 0]
    return matched[:5] if matched else _CURATED_REPOS[:3]


@tool
async def github_search(query: str) -> dict[str, Any]:
    """Search Swaraj's GitHub repositories for code and projects related to
    a query. Returns matching repos with language, description, stars, and
    URL. Use this when a question is about projects, code, or specific
    technologies he's built with.
    """
    settings = get_settings()

    # ─── No token → curated fallback ──
    if not settings.GITHUB_TOKEN:
        return {
            "source": "static_fallback",
            "repos": _match_curated(query),
            "note": "Live GitHub API not configured. Using cached metadata.",
        }

    # ─── Live GitHub API ──
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_S) as client:
            resp = await client.get(
                f"https://api.github.com/users/{_GITHUB_USERNAME}/repos",
                params={"per_page": 50, "sort": "updated"},
                headers={
                    "Authorization": f"token {settings.GITHUB_TOKEN}",
                    "Accept": "application/vnd.github+json",
                },
            )
            resp.raise_for_status()
            repos = resp.json()
    except Exception as exc:  # noqa: BLE001 — degrade to curated on any failure
        logger.warning("github api call failed (%s); using curated fallback", exc)
        return {
            "source": "static_fallback",
            "repos": _match_curated(query),
            "note": f"GitHub API error ({exc}); using cached metadata.",
        }

    keywords = [k for k in query.lower().split() if len(k) > 2]
    matched = [
        repo
        for repo in repos
        if any(
            k in (repo.get("description") or "").lower()
            or k in repo["name"].lower()
            for k in keywords
        )
    ][:5]
    # If the keyword filter is too strict, fall back to most-recently-updated.
    if not matched:
        matched = repos[:5]

    return {
        "source": "github_api",
        "repos": [
            {
                "name": r["name"],
                "description": r.get("description"),
                "language": r.get("language"),
                "stars": r.get("stargazers_count", 0),
                "url": r["html_url"],
                "updated_at": r.get("updated_at"),
            }
            for r in matched
        ],
    }
