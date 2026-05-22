"""Cross-encoder reranker — Stage 3 of the RAG pipeline.

Why a separate stage from retrieval:
  Bi-encoders (the embedder we used to produce candidates) are fast but
  approximate — they score each document independently against a query
  embedding.  Cross-encoders see the query and document together and run
  a full transformer pass, producing dramatically better relevance scores
  for the *same* candidate set.  The win is concentrated in the top of
  the list: retrieval gets "the right doc in the top 30", reranking gets
  "the right doc in the top 3".

Cost model:
  ~80 MB model, ~10-20 ms per (query, doc) pair on a modern CPU.  We
  only feed it the post-fusion shortlist (≤ ~20 docs), so worst case is
  ~400 ms — well under the 300 ms target after parallelism shaves off the
  retrieval phase.

Degradation:
  If the model fails to load (e.g. offline / image not pre-downloaded),
  we degrade to a pass-through that returns the fused list unchanged.
  Better to ship an answer with slightly worse ranking than to 500.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
# Same rationale as the embedder: ``/app/models`` is the Docker pre-cache
# path; in local dev we fall through to ``~/.cache/huggingface``.
_DEFAULT_CACHE_DIR: str | None = None


class CrossEncoderReranker:
    """Local cross-encoder.  ~80 MB on disk; runs on CPU; zero API cost."""

    def __init__(
        self,
        model_name: str = _DEFAULT_MODEL,
        cache_dir: str | None = _DEFAULT_CACHE_DIR,
    ) -> None:
        self.model_name = model_name
        try:
            from sentence_transformers import CrossEncoder

            kwargs: dict[str, Any] = {}
            if cache_dir:
                kwargs["cache_folder"] = cache_dir
            self.model = CrossEncoder(model_name, **kwargs)
            self.available = True
            logger.info("reranker loaded: %s", model_name)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "cross-encoder failed to load: %s — reranker will pass through hybrid scores",
                exc,
            )
            self.model = None
            self.available = False

    async def rerank(
        self,
        query: str,
        documents: list[dict[str, Any]],
        top_k: int = 5,
    ) -> dict[str, Any]:
        """Re-sort ``documents`` by cross-encoder relevance to ``query``.

        Returns a dict with the reranked top-k, latency, and a count of
        rank-order changes so the X-ray UI can show "how much did
        reranking matter for this query".
        """
        start = time.perf_counter()

        # Pass-through path: no model OR empty input.
        if not self.available or not documents:
            return {
                "results": documents[:top_k],
                "latency_ms": (time.perf_counter() - start) * 1000,
                "rank_changes": 0,
                "reranked": False,
            }

        # Score (query, doc.content) pairs.  Off-loaded to a thread
        # executor so the asyncio loop keeps serving other requests during
        # the ~50–400 ms model pass.
        pairs = [[query, d["content"]] for d in documents]
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            None,
            lambda: self.model.predict(pairs).tolist(),
        )

        # Attach reranker_score and re-sort.
        for d, s in zip(documents, scores):
            d["reranker_score"] = float(s)
        reranked = sorted(
            documents, key=lambda x: x["reranker_score"], reverse=True
        )

        # How many of the top-k positions changed identity?  Useful
        # signal for "did reranking matter" without exposing raw scores.
        original_ids = [d["id"] for d in documents[:top_k]]
        reranked_ids = [d["id"] for d in reranked[:top_k]]
        rank_changes = sum(
            1
            for i, _id in enumerate(reranked_ids)
            if i < len(original_ids) and _id != original_ids[i]
        )

        return {
            "results": reranked[:top_k],
            "latency_ms": (time.perf_counter() - start) * 1000,
            "rank_changes": rank_changes,
            "reranked": True,
        }
