# Case Study: Building the Hybrid RAG Pipeline at Meshi.io

## Problem

Meshi.io's first RAG implementation was the textbook one: chunk the
corpus into 1000-token windows, embed with `text-embedding-3-small`,
store in pgvector, return the top-10 nearest neighbors by cosine
distance.  It hit 67% answer accuracy on our internal benchmark of
1,200 graded Q/A pairs — fine for a demo, not fine for a paying
customer.  The failure modes clustered into two buckets.  **Lexical
queries** (anything that hinged on a specific entity name, acronym,
or product SKU) frequently missed the right document because the
embedding model collapsed near-synonyms together.  **Cross-paragraph
reasoning** failed because the 1000-token chunks were either too
big (the model couldn't find the salient sentence) or too small
(the relevant context spanned two adjacent chunks neither of which
won the retrieval lottery).

## Approach

I redesigned the pipeline as a three-stage hybrid retrieval system,
with deliberate experimentation at each stage.

**Stage 1 — Hybrid recall.**  Every query hits both a dense vector
search (pgvector HNSW, cosine distance) and a sparse search
(Postgres FTS with BM25-weighted ranking).  We take the top-30 from
each, dedupe, and pass forward up to 50 candidates.  The dense
search captures semantic matches; the sparse search rescues the
lexical-query failures.  Recall@50 went from 78% (dense-only) to
94% (hybrid) on the same benchmark.

**Stage 2 — Cross-encoder rerank.**  The 50 candidates go through a
cross-encoder reranker (`cross-encoder/ms-marco-MiniLM-L-6-v2`).
Unlike the bi-encoder used in recall, the cross-encoder sees the
query and document together and produces a single relevance score.
It's slow per pair but we only run it on 50 pairs per query.  This
stage is what closed the gap from "the right answer is in the
retrieved set" to "the right answer is in the top 5."

**Stage 3 — Chunk policy.**  Replaced fixed 1000-token windows with
*structure-aware* chunking.  Resume/role sections get one chunk per
H2 heading regardless of size — a hiring-manager query about
Amazon must retrieve the entire Amazon section, not half of it.
Prose gets 400–600 character chunks with 50-character overlap,
split at paragraph or sentence boundaries.  Code blocks are
preserved intact.  Metadata (section title, source file,
has_code flag) rides along with each chunk and is included in the
prompt context.

## Architecture

asyncpg pool to Supabase (pgvector + Postgres FTS).  Local
sentence-transformers running on the VPS CPU for the embedding side
— zero API cost for embeddings.  Reranker also local
(`MiniLM-L-6`, ~80MB).  Redis cache fronts the embedder by SHA-256
hash of input text with a 30-day TTL.  The retriever is exposed as
`POST /v1/rag/query` and accepts `top_k`, `min_score`, and a
`source_filter` so callers can scope to one document type.
Ingestion is a standalone CLI (`python -m scripts.ingest`) that
runs the same chunker + embedder code path against the on-disk
corpus.

## Results

On the frozen 1,200 Q/A benchmark, end-to-end answer accuracy
moved from **67% → 89%**, a 45% relative improvement on the
dense-only baseline.  Recall@5 (the metric that actually predicts
final answer quality) rose from 61% to 92%.  Per-query latency
landed at 180ms p50 / 410ms p95 including the cross-encoder pass —
slower than the original by ~80ms, fast enough that no one
noticed.  Per-query cost dropped to roughly $0 (local embeddings,
local rerank, free Postgres-side FTS), versus the $0.0002 per
query the OpenAI embeddings had cost at the prior throughput.
