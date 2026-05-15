-- ════════════════════════════════════════════════════════════════════
-- swarajbangar.dev — RAG schema (Supabase / Postgres + pgvector)
--
-- Reference / re-init script.  Mirrors the schema that's already live in
-- Supabase: vector(384) for all-MiniLM-L6-v2, a stored GENERATED tsvector
-- for BM25-style ranking, and HNSW + GIN + trigram indexes for hybrid
-- retrieval.
--
-- DO NOT change vector(384) to vector(1536) — the entire pipeline is
-- designed to run on free-tier CPU with local sentence-transformers.
-- ════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()


-- ─── documents ───────────────────────────────────────────────────────
-- One row per chunk.  ``title`` is the source filename (e.g.
-- ``resume_experience.md``); ``source`` is the high-level type
-- (``resume`` / ``case_study`` / ``about`` / ``project`` / ``blog``).
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content         TEXT NOT NULL,
    source          VARCHAR NOT NULL,
    title           VARCHAR,
    chunk_index     INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}'::jsonb,
    embedding       vector(384),
    search_vector   tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_docs_embedding
    ON documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_docs_search
    ON documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_docs_trgm
    ON documents USING GIN (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_docs_source
    ON documents (source);


-- ─── Optional: agent sessions / analytics (already present in db) ────
-- Documenting only — recreate manually if you need them.
--
-- agent_sessions:    session-level state for the SwarajOS agent demo
-- analytics_events:  thin event log for the observability wall
