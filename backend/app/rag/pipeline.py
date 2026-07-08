"""End-to-end RAG pipeline: retrieve → rerank → generate.

The pipeline owns the orchestration of the three RAG stages but does NOT
own the resources — it takes the retriever, reranker, settings, and
OpenAI client at construction time so the lifespan manager can keep
the single source of truth for shared state.

Why a class (vs. a free function):
  Per-request timing data needs to be stitched together across three
  await points and a Pydantic response, and the per-stage data
  structures are nontrivial.  A class makes it natural to share helpers
  (``_format_chunk``) and to test stages in isolation.
"""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Any

from app.agents.prompts import RAG_SYSTEM_PROMPT
from app.llm import chat_completion
from app.models import (
    RAGChunk,
    RAGPipelineStep,
    RAGQueryResponse,
)

if TYPE_CHECKING:
    from openai import AsyncOpenAI

    from app.config import Settings
    from app.rag.reranker import CrossEncoderReranker
    from app.rag.retriever import HybridRetriever

logger = logging.getLogger(__name__)

_MAX_TOKENS = 1024
_TEMPERATURE = 0.3
_CHUNK_PREVIEW_CHARS = 500
_CANDIDATE_POOL = 10  # how many hits per retriever before fusion


class RAGPipeline:
    """Orchestrate retrieve → rerank → generate."""

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

    async def query(
        self,
        query: str,
        top_k: int = 5,
        show_pipeline: bool = True,
        source_filter: str | None = None,
    ) -> RAGQueryResponse:
        """Run a query end-to-end and return the structured response."""
        pipeline_steps: list[RAGPipelineStep] = []
        overall_start = time.perf_counter()

        # ─── Step 1+2: hybrid retrieve (includes embed internally) ──
        hybrid_result = await self.retriever.hybrid_search(
            query=query,
            top_k=_CANDIDATE_POOL,
            source_filter=source_filter,
            candidate_pool=_CANDIDATE_POOL,
        )
        timings = hybrid_result["timings"]
        counts = hybrid_result["counts"]

        if show_pipeline:
            pipeline_steps.append(
                RAGPipelineStep(
                    step="embed",
                    status="complete",
                    data={"model": self.retriever.embedder.model_name, "dims": 384},
                    latency_ms=timings["embed_ms"],
                )
            )
            pipeline_steps.append(
                RAGPipelineStep(
                    step="retrieve",
                    status="complete",
                    data={
                        "vector_hits": counts["vector"],
                        "bm25_hits": counts["bm25"],
                        "fused": counts["fused"],
                        "vector_search_ms": round(timings["vector_search_ms"], 2),
                        "bm25_search_ms": round(timings["bm25_search_ms"], 2),
                        "fusion_ms": round(timings["fusion_ms"], 2),
                        "rrf_k": self.retriever.rrf_k,
                    },
                    latency_ms=(
                        timings["total_ms"] - timings["embed_ms"]
                    ),
                )
            )

        # ─── Step 3: rerank ──
        rerank_result = await self.reranker.rerank(
            query=query,
            documents=hybrid_result["results"],
            top_k=top_k,
        )
        if show_pipeline:
            pipeline_steps.append(
                RAGPipelineStep(
                    step="rerank",
                    status="complete",
                    data={
                        "model": self.reranker.model_name,
                        "rank_changes": rerank_result["rank_changes"],
                        "reranked": rerank_result["reranked"],
                        "input_count": len(hybrid_result["results"]),
                        "output_count": len(rerank_result["results"]),
                    },
                    latency_ms=rerank_result["latency_ms"],
                )
            )

        final_chunks: list[dict[str, Any]] = rerank_result["results"]

        # ─── Step 4: generate ──
        context = "\n\n".join(
            f"[Source: {c.get('source','?')}/{c.get('title','?')}]\n{c.get('content','')}"
            for c in final_chunks
        )
        user_msg = f"Context:\n{context}\n\nQuestion: {query}"

        t0 = time.perf_counter()
        answer, tokens = await chat_completion(
            self.openai,
            model=self.model,
            system=RAG_SYSTEM_PROMPT,
            user=user_msg,
            max_tokens=_MAX_TOKENS,
            temperature=_TEMPERATURE,
        )
        gen_ms = (time.perf_counter() - t0) * 1000

        if show_pipeline:
            pipeline_steps.append(
                RAGPipelineStep(
                    step="generate",
                    status="complete",
                    data={
                        "model": self.model,
                        "tokens": tokens,
                    },
                    latency_ms=gen_ms,
                )
            )

        total_ms = (time.perf_counter() - overall_start) * 1000

        return RAGQueryResponse(
            query=query,
            answer=answer,
            chunks=[RAGChunk(**self._format_chunk(c)) for c in final_chunks],
            pipeline=pipeline_steps if show_pipeline else [],
            total_latency_ms=round(total_ms, 2),
        )

    # ─── Helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _format_chunk(c: dict[str, Any]) -> dict[str, Any]:
        """Project a retriever/reranker dict into RAGChunk's wire shape."""
        content = c.get("content", "") or ""
        if len(content) > _CHUNK_PREVIEW_CHARS:
            text = content[:_CHUNK_PREVIEW_CHARS] + "..."
        else:
            text = content
        # ``source`` in the model wants a path-ish label ("type/title")
        # so the X-ray UI can group and link back to the file.
        src_type = c.get("source") or "unknown"
        title = c.get("title") or ""
        source_label = f"{src_type}/{title}" if title else src_type
        return {
            "id": c.get("id", ""),
            "text": text,
            "source": source_label,
            "score": float(
                c.get("rrf_score", c.get("reranker_score", c.get("score", 0.0)))
                or 0.0
            ),
            "metadata": c.get("metadata") or {},
            "vector_score": _as_float_or_none(c.get("vector_score")),
            "bm25_score": _as_float_or_none(c.get("bm25_score")),
            "reranker_score": _as_float_or_none(c.get("reranker_score")),
        }


def _as_float_or_none(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
