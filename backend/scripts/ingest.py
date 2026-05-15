"""Ingest documents into the RAG corpus.

Usage:
    python -m scripts.ingest                # ingest everything
    python -m scripts.ingest --clear        # wipe corpus first, then ingest
    python -m scripts.ingest --source resume   # only files mapped to 'resume'
    python -m scripts.ingest --clear --source case_study

Reads every ``*.md`` and ``*.txt`` file under ``backend/data/documents/``,
detects the source type from the filename prefix, chunks with the
role-aware chunker, embeds with LocalEmbedder, and bulk-inserts rows
into ``documents``.

Connects directly via DATABASE_URL — does NOT go through FastAPI.
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path

import asyncpg

# Allow ``python -m scripts.ingest`` and ``python scripts/ingest.py`` both.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.main import _sanitize_dsn  # noqa: E402  (reuse the DSN encoder)
from app.rag.chunker import chunk_document  # noqa: E402
from app.rag.embedder import LocalEmbedder  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("ingest")

DOCS_DIR = ROOT / "data" / "documents"

# Filename prefix → source label.
SOURCE_PREFIXES: dict[str, str] = {
    "resume_": "resume",
    "project_": "project",
    "case_": "case_study",
    "blog_": "blog",
    "about": "about",
}


def classify_source(filename: str) -> str | None:
    """Return the source label for a filename, or None if unrecognized."""
    lower = filename.lower()
    for prefix, label in SOURCE_PREFIXES.items():
        if lower.startswith(prefix):
            return label
    return None


def vector_literal(vec: list[float]) -> str:
    """Format a Python list as a pgvector literal: ``[0.1,0.2,...]``.

    asyncpg can pass this as text and Postgres will cast to vector().
    """
    return "[" + ",".join(f"{x:.7f}" for x in vec) + "]"


async def insert_chunks(
    pool: asyncpg.Pool,
    source: str,
    title: str,
    chunks: list[dict],
    vectors: list[list[float]],
) -> int:
    """Bulk-insert chunks for one file. Returns rows inserted.

    To stay idempotent without a unique constraint on (title, chunk_index),
    we delete any existing rows for this title in the same transaction
    before re-inserting.  ``search_vector`` is a stored GENERATED column
    on this schema, so we never list it in the INSERT.
    """
    if not chunks:
        return 0

    rows = []
    for chunk, vec in zip(chunks, vectors):
        rows.append(
            (
                source,
                title,
                chunk["chunk_index"],
                chunk["text"],
                vector_literal(vec),
                json.dumps(chunk["metadata"]),
            )
        )

    insert_sql = """
        INSERT INTO documents
            (source, title, chunk_index, content, embedding, metadata)
        VALUES
            ($1, $2, $3, $4, $5::vector, $6::jsonb)
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM documents WHERE title = $1", title)
            await conn.executemany(insert_sql, rows)
    return len(rows)


async def clear_corpus(
    pool: asyncpg.Pool,
    source: str | None,
) -> int:
    """Delete documents for one source (or all). Returns rows deleted."""
    async with pool.acquire() as conn:
        if source is None:
            result = await conn.execute("DELETE FROM documents")
        else:
            result = await conn.execute(
                "DELETE FROM documents WHERE source = $1", source
            )
    try:
        return int(result.split()[-1])
    except (ValueError, IndexError):
        return 0


async def ingest(
    *,
    clear: bool,
    source_filter: str | None,
) -> None:
    """Top-level orchestration: load files, chunk, embed, insert."""
    settings = get_settings()

    if not DOCS_DIR.exists():
        logger.error("documents directory not found: %s", DOCS_DIR)
        sys.exit(2)

    files = sorted(
        p
        for p in DOCS_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".md", ".txt"}
    )
    if not files:
        logger.error("no .md or .txt files found in %s", DOCS_DIR)
        sys.exit(2)

    embedder = LocalEmbedder(model_name=settings.EMBEDDING_MODEL)

    pool = await asyncpg.create_pool(
        dsn=_sanitize_dsn(settings.DATABASE_URL),
        min_size=1,
        max_size=4,
        command_timeout=30,
        # Supabase transaction-mode pooler doesn't support prepared
        # statements — disable asyncpg's per-connection cache.
        statement_cache_size=0,
    )
    if pool is None:  # asyncpg returns None only on misconfig
        logger.error("failed to create asyncpg pool")
        sys.exit(3)

    try:
        if clear:
            deleted = await clear_corpus(pool, source_filter)
            logger.info(
                "cleared %d rows (source=%s)",
                deleted,
                source_filter or "*",
            )

        run_start = time.monotonic()
        total_docs = 0
        total_chunks = 0

        for path in files:
            source = classify_source(path.name)
            if source is None:
                logger.warning("skip (no source prefix matched): %s", path.name)
                continue
            if source_filter and source != source_filter:
                continue

            text = path.read_text(encoding="utf-8")
            file_start = time.monotonic()

            chunks = chunk_document(text, source=source)
            if not chunks:
                logger.warning("no chunks produced for %s", path.name)
                continue

            vectors = await embedder.embed_batch(
                [c["text"] for c in chunks],
                batch_size=32,
            )

            inserted = await insert_chunks(
                pool,
                source=source,
                title=path.name,
                chunks=chunks,
                vectors=vectors,
            )
            elapsed = time.monotonic() - file_start
            logger.info(
                "%s: embedded %d chunks, inserted %d rows in %.2fs",
                path.name,
                len(chunks),
                inserted,
                elapsed,
            )
            total_docs += 1
            total_chunks += inserted

        run_elapsed = time.monotonic() - run_start
        avg = total_chunks / total_docs if total_docs else 0.0
        logger.info(
            "done — %d docs / %d chunks in %.2fs (avg %.1f chunks/doc)",
            total_docs,
            total_chunks,
            run_elapsed,
            avg,
        )
    finally:
        await pool.close()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest documents into the RAG corpus.")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="DELETE matching rows before ingestion (idempotent re-ingest).",
    )
    parser.add_argument(
        "--source",
        default=None,
        choices=sorted(set(SOURCE_PREFIXES.values())),
        help="Restrict to one source label (also scoped by --clear).",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    asyncio.run(ingest(clear=args.clear, source_filter=args.source))


if __name__ == "__main__":
    main()
