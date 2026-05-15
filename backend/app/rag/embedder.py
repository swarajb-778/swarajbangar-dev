"""Local sentence-transformers embedder.

Runs entirely on CPU (or MPS on Apple Silicon during dev).  Zero API cost.
Model is loaded once at app startup and held in memory; encoding is
dispatched to a thread executor so we never block the asyncio loop on
CPU-bound work.

Caching:
  When a Redis client is provided, every text is hashed (SHA-256) and the
  resulting vector is cached for 30 days.  Cache key shape: ``embed:v1:<hex>``.
  Batch encoding bypasses the cache for simplicity — at ingestion time we
  prefer to recompute and overwrite to keep the corpus consistent.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "all-MiniLM-L6-v2"
# In the Docker image we pre-populate /app/models; locally we let the HF
# library use its default ``~/.cache/huggingface`` so dev doesn't require
# write access to /app.
_DEFAULT_CACHE_DIR: str | None = None
_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


class LocalEmbedder:
    """sentence-transformers wrapper for local embedding.

    Thread-safe for read access (the underlying model only mutates during
    ``__init__``).  Async methods offload the CPU work to the default
    thread pool executor.
    """

    def __init__(
        self,
        model_name: str = _DEFAULT_MODEL,
        cache_dir: str | None = _DEFAULT_CACHE_DIR,
        redis_client: "aioredis.Redis | None" = None,
    ) -> None:
        from sentence_transformers import SentenceTransformer

        kwargs: dict = {}
        if cache_dir:
            kwargs["cache_folder"] = cache_dir
        self.model = SentenceTransformer(model_name, **kwargs)
        self.model_name = model_name
        self.dimensions = self.model.get_sentence_embedding_dimension()
        self.redis = redis_client
        logger.info("Loaded embedder: %s (%d dims)", model_name, self.dimensions)

    # ─── Single-text embedding (cache-aware) ──────────────────────────

    async def embed_text(self, text: str) -> list[float]:
        """Return the embedding vector for ``text``.

        Hits Redis cache when available; otherwise computes locally and
        writes back to cache.
        """
        cache_key = self._cache_key(text)
        if self.redis is not None:
            try:
                cached = await self.redis.get(cache_key)
            except Exception as exc:  # noqa: BLE001 — cache is best-effort
                logger.warning("redis get failed for embed cache: %s", exc)
                cached = None
            if cached:
                try:
                    return json.loads(cached)
                except (TypeError, ValueError):
                    logger.warning("cached embedding for %s was malformed", cache_key)

        loop = asyncio.get_event_loop()
        vector: list[float] = await loop.run_in_executor(
            None,
            lambda: self.model.encode(text, normalize_embeddings=True).tolist(),
        )

        if self.redis is not None:
            try:
                await self.redis.setex(cache_key, _CACHE_TTL_SECONDS, json.dumps(vector))
            except Exception as exc:  # noqa: BLE001
                logger.warning("redis setex failed for embed cache: %s", exc)

        return vector

    # ─── Batch embedding (no cache — used at ingestion) ───────────────

    async def embed_batch(
        self,
        texts: list[str],
        batch_size: int = 32,
    ) -> list[list[float]]:
        """Embed many texts in one go.

        ``batch_size`` controls memory pressure inside sentence-transformers;
        it does not throttle any external API (there is none).
        """
        if not texts:
            return []

        loop = asyncio.get_event_loop()
        start = time.monotonic()
        vectors: list[list[float]] = await loop.run_in_executor(
            None,
            lambda: self.model.encode(
                texts,
                batch_size=batch_size,
                normalize_embeddings=True,
                show_progress_bar=False,
            ).tolist(),
        )
        elapsed = time.monotonic() - start

        if len(texts) > 10:
            logger.info(
                "embedded %d texts in %.2fs (%.1f ms/text, batch_size=%d)",
                len(texts),
                elapsed,
                (elapsed * 1000) / len(texts),
                batch_size,
            )

        return vectors

    # ─── Internals ────────────────────────────────────────────────────

    @staticmethod
    def _cache_key(text: str) -> str:
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"embed:v1:{digest}"
