# ════════════════════════════════════════════════════════════════════
# swarajbangar.dev backend Dockerfile
# Targets: DigitalOcean Ubuntu 24.04 x86_64
# Strategy: pre-download embedding + reranker models into image layer
#           so first boot doesn't take 5 minutes
# ════════════════════════════════════════════════════════════════════

FROM python:3.12-slim

WORKDIR /app

# System deps for asyncpg, pgvector, sentence-transformers, curl (healthcheck)
RUN apt-get update && apt-get install -y \
        build-essential \
        curl \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps (cached layer — only rebuilt when requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding + reranker models into the image layer
# so first boot doesn't take 5 minutes. Cached in /root/.cache by default.
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('all-MiniLM-L6-v2'); \
    from sentence_transformers import CrossEncoder; \
    CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# App source (changes most often — kept after deps for layer caching)
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY data/ ./data/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Worker count is env-configurable via WEB_CONCURRENCY (default 1). Each
# uvicorn worker loads its own ~450MB embedding + reranker model, so >1 worker
# OOM-kills a 1GB host. Keep the default at 1; raise WEB_CONCURRENCY in .env
# only on a larger box (e.g. 2 vCPU / 4GB+). `exec` keeps uvicorn as PID 1 so
# it receives SIGTERM for graceful shutdown.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1}"]
