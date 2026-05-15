# Project: swarajbangar.dev

## What this is
A dark-mode, terminal-inspired developer portfolio with live interactive demos
and a multi-agent AI system (SwarajOS). See PRD.md for full spec.

## Design Tokens
- bg-base: #0A0A0F, bg-surface: #12121A, bg-elevated: #1A1A2E
- accent-primary: #6C5CE7, accent-teal: #00CEC9, accent-pink: #FD79A8
- accent-gold: #FDCB6E, accent-emerald: #00B894, accent-coral: #E17055
- text-primary: #F0F0F0, text-secondary: #B0B0C0, text-muted: #6B6B80
- fonts: Inter (sans), JetBrains Mono (code), Space Grotesk (display)

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- Terminal: xterm.js v5 with WebGL renderer
- Backend: FastAPI, LangGraph, Redis, pgvector, Neo4j
- Deploy: Vercel (frontend), Hetzner VPS Docker Compose (backend)

## Current Phase: Phase 3 — Backend Foundation + RAG Agents (Free-Tier Edition)

Phase 1-2 complete. Frontend live at https://swarajbangar-dev.vercel.app.
Now building the real backend on DigitalOcean and wiring it up.

### Infrastructure (all free-tier)
- VPS: DigitalOcean Droplet, Ubuntu 24.04 x86_64, $6/mo via $200 student credit
- Database: Supabase Postgres + pgvector (free, 500 MB)
- Graph: Neo4j Aura Free (200K nodes)
- Cache: Redis 7-alpine in Docker on the VPS
- LLM: Anthropic API only (Sonnet for responses, Haiku for classification)
- Embeddings: LOCAL sentence-transformers all-MiniLM-L6-v2 (384 dims, on VPS CPU)
- Reranker: LOCAL cross-encoder ms-marco-MiniLM-L-6-v2 (22 MB, on VPS CPU)
- Frontend: Vercel Hobby (already deployed)

### Backend structure (being built now)
backend/
  app/
    main.py                  # FastAPI entry: CORS, middleware, lifespan
    config.py                # pydantic-settings reading .env
    models.py                # Pydantic request/response models
    dependencies.py          # Shared deps: db pool, redis, neo4j driver
    routers/
      agent.py               # POST /v1/agent/orchestrate (SSE)
      rag.py                 # POST /v1/rag/query
      health.py              # GET /health, /ready
      stats.py               # GET /v1/stats
      ws.py                  # WebSocket /v1/agent/stream
    agents/
      orchestrator.py        # LangGraph state machine
      experience_agent.py    # Experience Navigator
      intent_classifier.py   # Intent classification node
      state.py               # AgentState TypedDict
      response_formatter.py  # Synthesize node
    rag/
      embedder.py            # LOCAL sentence-transformers wrapper
      retriever.py           # Hybrid search (HNSW + BM25 + RRF)
      reranker.py            # Cross-encoder reranking
      chunker.py             # Document chunking
      pipeline.py            # Full RAG pipeline orchestration
    memory/
      graph.py               # Neo4j knowledge graph
      session.py             # Redis session management
    tools/
      vector_search.py       # LangChain @tool: vector search
      github_search.py       # LangChain @tool: GitHub API
      graph_traverse.py      # LangChain @tool: Neo4j queries
  scripts/
    ingest.py                # One-time: embed and store all documents
    seed_graph.py            # One-time: seed Neo4j with entity relationships
    test_health.py           # Smoke test
    init_db.sql              # Schema (already run in Supabase UI)
  data/
    documents/               # Resume, projects, case studies (markdown)
  docker-compose.yml
  Caddyfile
  Dockerfile
  requirements.txt
  .env.example
  Makefile

### Environment variables (single .env)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...      # Supabase pooler connection
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...        # secret, never to frontend
NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
REDIS_URL=redis://redis:6379/0    # internal Docker network
CORS_ORIGINS=https://swarajbangar-dev.vercel.app,http://localhost:3000
APP_ENV=development
LOG_LEVEL=info
DAILY_TOKEN_BUDGET=100000
GITHUB_TOKEN=                     # optional

### Critical constraints (DON'T LET CLAUDE CODE VIOLATE THESE)
- vector(384), NOT vector(1536) — we use the local model
- NO openai package in requirements.txt
- NO litellm package in requirements.txt — direct Anthropic SDK only
- All Docker images must be x86_64-compatible (default on DigitalOcean)
- The reranker must fall back gracefully if the model fails to download
- All LLM calls go through a token-budget wrapper that checks Redis first