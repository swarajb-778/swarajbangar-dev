"""Application configuration loaded from environment via pydantic-settings.

Reads .env at process start. All env vars are typed fields with sensible
defaults where safe. Critical secrets (ANTHROPIC_API_KEY, DATABASE_URL)
are validated at import time — startup fails fast with a helpful message
if they're missing.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — sourced from .env via pydantic-settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        env_ignore_empty=True,
    )

    # ─── Anthropic ────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = Field(
        default="",
        description="Anthropic API key. Get one at https://console.anthropic.com",
    )

    # ─── Database ─────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="",
        description="Postgres connection URL (Supabase pooler).",
    )
    SUPABASE_URL: str = Field(default="", description="Supabase project URL.")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anon key.")
    SUPABASE_SERVICE_KEY: str = Field(
        default="",
        description="Supabase service-role key. NEVER expose to frontend.",
    )

    # ─── Neo4j ────────────────────────────────────────────────────────
    NEO4J_URI: str = Field(default="", description="Neo4j Aura connection URI.")
    NEO4J_USER: str = Field(default="neo4j", description="Neo4j username.")
    NEO4J_PASSWORD: str = Field(default="", description="Neo4j password.")

    # ─── Redis ────────────────────────────────────────────────────────
    REDIS_URL: str = Field(
        default="redis://redis:6379/0",
        description="Redis connection URL (Docker internal network by default).",
    )

    # ─── CORS ─────────────────────────────────────────────────────────
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated origin list for CORS.",
    )

    # ─── App ──────────────────────────────────────────────────────────
    APP_ENV: Literal["development", "production"] = Field(
        default="development",
        description="Runtime environment.",
    )
    LOG_LEVEL: Literal["debug", "info", "warning", "error"] = Field(
        default="info",
        description="Logging verbosity.",
    )
    DAILY_TOKEN_BUDGET: int = Field(
        default=100_000,
        ge=0,
        description="Soft daily cap on Anthropic tokens (enforced via Redis).",
    )

    # ─── Optional ─────────────────────────────────────────────────────
    GITHUB_TOKEN: str = Field(
        default="",
        description="Optional GitHub PAT for higher API rate limits.",
    )

    # ─── Embedding model paths (defaults match Dockerfile pre-download) ─
    EMBEDDING_MODEL: str = Field(
        default="all-MiniLM-L6-v2",
        description="sentence-transformers model name. 384-dim output.",
    )
    RERANKER_MODEL: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        description="cross-encoder reranker model name.",
    )

    # ─── Validators ───────────────────────────────────────────────────
    @field_validator("CORS_ORIGINS")
    @classmethod
    def _strip_cors(cls, v: str) -> str:
        """Tolerate trailing slashes / whitespace in CORS list."""
        return ",".join(part.strip().rstrip("/") for part in v.split(",") if part.strip())

    # ─── Computed properties ──────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        """True when APP_ENV == 'production'."""
        return self.APP_ENV == "production"

    @property
    def cors_origins(self) -> list[str]:
        """CORS_ORIGINS parsed as a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def database_pool_size(self) -> int:
        """Connection pool size. Smaller in dev to avoid exhausting Supabase free tier."""
        return 20 if self.is_production else 5


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton Settings instance.

    Validates required secrets are present and raises a helpful error if not.
    Cached so subsequent calls don't re-parse .env.
    """
    settings = Settings()

    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is empty. Set it in backend/.env "
            "(see backend/.env.example for format)."
        )
    if not settings.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is empty. Set it in backend/.env "
            "(use Supabase pooler URL, see backend/.env.example)."
        )

    return settings
