# ════════════════════════════════════════════════════════════════════
# swarajbangar.dev backend — Makefile
# Run from backend/ directory. Use `make <target>`.
# ════════════════════════════════════════════════════════════════════

.PHONY: dev build up down logs shell test ingest seed clean health install

# ─── Local development (no Docker) ───────────────────────────────────
install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/

health:
	python scripts/test_health.py

# ─── Docker compose ──────────────────────────────────────────────────
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f api

shell:
	docker compose exec api bash

# ─── Data lifecycle ──────────────────────────────────────────────────
ingest:
	docker compose exec api python -m scripts.ingest

seed:
	docker compose exec api python -m scripts.seed_graph

# ─── Reset (DESTRUCTIVE: drops volumes) ──────────────────────────────
clean:
	docker compose down -v
