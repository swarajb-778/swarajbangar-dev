"""Global registry for resources the agent tools need.

LangChain ``@tool`` functions are invoked with only their declared args —
there's no clean way to thread the asyncpg-backed retriever, the reranker,
or the Neo4j driver through them via parameters.  Rather than smuggling
clients through LangGraph state, we register them once at app startup (and
in the test harness) and let tools read them back here.

This is a deliberate, narrow use of module-level state: the registered
objects are process-wide singletons that live for the whole app lifetime,
exactly the lifecycle a module global models well.  Everything is
None-safe so tools degrade gracefully when a resource wasn't wired
(e.g. Neo4j down, or running a unit test without a DB).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.rag.reranker import CrossEncoderReranker
    from app.rag.retriever import HybridRetriever

_retriever: "HybridRetriever | None" = None
_reranker: "CrossEncoderReranker | None" = None
_neo4j: Any | None = None


def set_retriever(retriever: "HybridRetriever | None") -> None:
    """Register the shared hybrid retriever (call once at startup)."""
    global _retriever
    _retriever = retriever


def get_global_retriever() -> "HybridRetriever | None":
    """Return the registered retriever, or None if not wired."""
    return _retriever


def set_reranker(reranker: "CrossEncoderReranker | None") -> None:
    """Register the shared cross-encoder reranker (call once at startup)."""
    global _reranker
    _reranker = reranker


def get_global_reranker() -> "CrossEncoderReranker | None":
    """Return the registered reranker, or None if not wired."""
    return _reranker


def set_neo4j(driver: Any | None) -> None:
    """Register the shared Neo4j async driver (call once at startup)."""
    global _neo4j
    _neo4j = driver


def get_global_neo4j() -> Any | None:
    """Return the registered Neo4j driver, or None if not wired."""
    return _neo4j


def reset() -> None:
    """Clear all registered resources (used by tests)."""
    global _retriever, _reranker, _neo4j
    _retriever = None
    _reranker = None
    _neo4j = None
