"""Pydantic models — the wire contract between frontend and backend.

Every endpoint accepts/returns a model defined here. Models include
json_schema_extra examples so they render cleanly in /docs (Swagger UI).
The frontend's lib/types.ts should mirror these shapes.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


# ════════════════════════════════════════════════════════════════════
# ── Request models ──
# ════════════════════════════════════════════════════════════════════


class AgentChatRequest(BaseModel):
    """POST /v1/agent/orchestrate body."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Tell me about Swaraj's experience at Amazon",
                "session_id": "8c39ec3e-b2a8-4f3e-9c2a-2b7e9f1e8c3d",
                "context": {"source": "chat-widget"},
            }
        }
    )

    message: str = Field(..., min_length=1, max_length=4_000)
    session_id: UUID = Field(default_factory=uuid4)
    context: dict[str, Any] | None = None


class RAGQueryRequest(BaseModel):
    """POST /v1/rag/query body."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "What is the chaos lab?",
                "top_k": 5,
                "show_pipeline": True,
                "source_filter": None,
            }
        }
    )

    query: str = Field(..., min_length=1, max_length=2_000)
    top_k: int = Field(default=5, ge=1, le=20)
    show_pipeline: bool = False
    source_filter: str | None = None


class RAGEmbedRequest(BaseModel):
    """POST /v1/rag/embed body — exposes the embedder for the 3D explorer demo."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"text": "distributed systems"}}
    )

    text: str = Field(..., min_length=1, max_length=2_000)


class RAGEmbedResponse(BaseModel):
    """POST /v1/rag/embed response."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "embedding": [0.012, -0.034, 0.087],
                "dimensions": 384,
                "model": "all-MiniLM-L6-v2",
                "latency_ms": 14.2,
            }
        }
    )

    embedding: list[float]
    dimensions: int
    model: str
    latency_ms: float


# ════════════════════════════════════════════════════════════════════
# ── SSE event payloads (agent orchestrate stream) ──
# ════════════════════════════════════════════════════════════════════


AgentStepType = Literal[
    "classify",
    "route",
    "tool_call",
    "retrieve",
    "generate",
    "synthesize",
    "memory",
]
AgentStepStatus = Literal["pending", "active", "complete", "error"]


class AgentStepEvent(BaseModel):
    """A single step in the agent's reasoning chain (streamed via SSE)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "classify",
                "status": "complete",
                "data": {"intent": "experience_lookup", "confidence": 0.94},
                "latency_ms": 142.0,
                "timestamp": "2026-05-14T10:23:14.123Z",
            }
        }
    )

    type: AgentStepType
    status: AgentStepStatus
    data: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentTokenEvent(BaseModel):
    """A single streamed token from the LLM."""

    model_config = ConfigDict(json_schema_extra={"example": {"text": "Hello"}})

    text: str


class AgentDoneEvent(BaseModel):
    """Final event in an SSE stream — signals completion + accounting."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_latency_ms": 2_413.7,
                "tokens_used": 487,
                "model": "claude-sonnet-4-5",
            }
        }
    )

    total_latency_ms: float
    tokens_used: int
    model: str


# ════════════════════════════════════════════════════════════════════
# ── RAG response payloads ──
# ════════════════════════════════════════════════════════════════════


class RAGChunk(BaseModel):
    """A single retrieved chunk — exposed to the X-ray UI."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "chunk-3f9a",
                "text": "The Chaos Lab simulates failure modes with circuit breakers...",
                "source": "case-studies/chaos-lab.md",
                "score": 0.87,
                "metadata": {"section": "overview", "tokens": 142},
                "vector_score": 0.83,
                "bm25_score": 0.61,
                "reranker_score": 0.92,
            }
        }
    )

    id: str
    text: str
    source: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)
    vector_score: float | None = None
    bm25_score: float | None = None
    reranker_score: float | None = None


RAGStepName = Literal[
    "embed",
    "retrieve",
    "vector_search",
    "bm25_search",
    "fuse",
    "rerank",
    "generate",
]


class RAGPipelineStep(BaseModel):
    """A single stage in the RAG pipeline — surfaced by show_pipeline=True."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "step": "rerank",
                "status": "complete",
                "data": {"input_count": 20, "output_count": 5},
                "latency_ms": 87.4,
            }
        }
    )

    step: RAGStepName
    status: AgentStepStatus
    data: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float | None = None


class RAGQueryResponse(BaseModel):
    """POST /v1/rag/query response."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "What is the chaos lab?",
                "answer": "The Chaos Lab is an interactive demo that...",
                "chunks": [],
                "pipeline": [],
                "total_latency_ms": 1_247.3,
            }
        }
    )

    query: str
    answer: str
    chunks: list[RAGChunk] = Field(default_factory=list)
    pipeline: list[RAGPipelineStep] = Field(default_factory=list)
    total_latency_ms: float


class RAGDocumentSummary(BaseModel):
    """One row in GET /v1/rag/documents."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "source": "resume",
                "chunk_count": 20,
                "latest_update": "2026-05-15T01:16:09Z",
            }
        }
    )

    source: str
    chunk_count: int
    latest_update: datetime | None = None


class RAGDocumentsResponse(BaseModel):
    """GET /v1/rag/documents response — corpus summary by source."""

    documents: list[RAGDocumentSummary]
    total_chunks: int


class RAGEmbedding3DPoint(BaseModel):
    """One point in the 3D embedding explorer scatter plot."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "74716647-65f3-4d36-a0ee-dd89a2aec770",
                "x": 0.412,
                "y": -1.07,
                "z": 0.83,
                "text_preview": "I'm Swaraj Bangar — an AI engineer who likes the boring...",
                "source": "about",
            }
        }
    )

    id: str
    x: float
    y: float
    z: float
    text_preview: str
    source: str


class RAGEmbeddings3DResponse(BaseModel):
    """GET /v1/rag/embeddings/3d response — UMAP projection cached in Redis."""

    points: list[RAGEmbedding3DPoint]
    method: Literal["umap"] = "umap"
    dimensions: Literal[3] = 3
    cached: bool = False


# ════════════════════════════════════════════════════════════════════
# ── Health / readiness ──
# ════════════════════════════════════════════════════════════════════


class HealthResponse(BaseModel):
    """GET /health response — always 200 if the process is alive."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ok",
                "version": "1.0.0",
                "uptime_seconds": 142.3,
            }
        }
    )

    status: Literal["ok"] = "ok"
    version: str
    uptime_seconds: float


class ReadyResponse(BaseModel):
    """GET /ready response — 503 if any dependency is unhealthy."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ready",
                "dependencies": {"postgres": True, "redis": True, "neo4j": True},
            }
        }
    )

    status: Literal["ready", "degraded"]
    dependencies: dict[str, bool]


# ════════════════════════════════════════════════════════════════════
# ── Stats timeseries + intent distribution (Observability Wall) ──
# ════════════════════════════════════════════════════════════════════


class StatsTimeseriesPoint(BaseModel):
    """One rolling sample for the metrics timeseries chart."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ts": 1747000000,
                "requests": 42,
                "p50": 38.0,
                "p95": 142.0,
                "error_rate": 0.0021,
            }
        }
    )

    ts: int
    requests: int
    p50: float
    p95: float
    error_rate: float


class StatsTimeseriesResponse(BaseModel):
    """GET /v1/stats/timeseries response — capped rolling history."""

    points: list[StatsTimeseriesPoint] = Field(default_factory=list)


class IntentCount(BaseModel):
    """One slice of the agent intent-distribution donut."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "experience_query", "value": 412}}
    )

    name: str
    value: int


class IntentDistributionResponse(BaseModel):
    """GET /v1/stats/intents response — agent interactions grouped by intent."""

    intents: list[IntentCount] = Field(default_factory=list)
    total: int = 0
