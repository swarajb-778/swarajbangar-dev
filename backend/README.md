# swarajbangar.dev — Backend

FastAPI + LangGraph + RAG pipeline for the portfolio's live AI demos.
Targets DigitalOcean Ubuntu 24.04 x86_64. Free-tier infrastructure:
Supabase Postgres+pgvector, Neo4j Aura, Anthropic Claude.

## Quick start (local dev)

```bash
cd backend
cp .env.example .env                      # then edit .env with real creds
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt           # first run: ~5 min (torch CPU)
uvicorn app.main:app --reload             # http://localhost:8000/docs
```

Verify:

```bash
curl http://localhost:8000/health         # → {"status":"ok",...}
python scripts/test_health.py             # hits /health and /ready
```

## Quick start (Docker)

```bash
cd backend
cp .env.example .env                      # then edit .env
docker compose build                      # first build: ~10 min (model download)
docker compose up -d
docker compose logs -f api
```

## Common tasks

```bash
make dev           # uvicorn --reload
make health        # smoke test /health + /ready
make build         # docker compose build
make up            # docker compose up -d
make logs          # tail api logs
make shell         # bash into api container
make clean         # nuke volumes (DESTRUCTIVE)
```

## Endpoint summary

| Method | Path                       | Status     | Description                       |
|--------|----------------------------|------------|-----------------------------------|
| GET    | `/`                        | ✅         | API discovery / version           |
| GET    | `/health`                  | ✅         | Liveness probe                    |
| GET    | `/ready`                   | ✅         | Readiness probe (Postgres+Redis+Neo4j) |
| GET    | `/docs`                    | ✅         | Swagger UI                        |
| POST   | `/v1/rag/query`            | 🚧 501     | Hybrid-search RAG                 |
| POST   | `/v1/rag/embed`            | 🚧 501     | Sentence embedding                |
| POST   | `/v1/agent/orchestrate`    | 🚧 501     | LangGraph multi-agent (SSE)       |
| WS     | `/v1/agent/stream`         | 🚧 1011    | WebSocket agent stream            |
| GET    | `/v1/stats`                | ✅         | Aggregate request counters        |

## Critical constraints

- `vector(384)` — we use local `all-MiniLM-L6-v2`, NOT 1536-dim OpenAI.
- **No** `openai` or `litellm` in requirements — Anthropic SDK only.
- x86_64-compatible Docker images (DigitalOcean default).
- All LLM calls must check the daily token budget via Redis before firing.
