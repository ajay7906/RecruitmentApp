import os
from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_db_url(raw_url: str) -> str:
    """Normalize PostgreSQL URL so SQLAlchemy 2.0 uses psycopg v3 driver."""
    if not raw_url:
        return "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    url = raw_url.strip()
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default="INFO")

    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    )
    DB_POOL_SIZE: int = Field(default=5)
    DB_MAX_OVERFLOW: int = Field(default=10)

    RESUME_STORAGE_ROOT: str = Field(
        default=str(Path(__file__).resolve().parents[3] / "backend" / "storage" / "resumes")
    )

    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_TASK_ALWAYS_EAGER: bool = Field(default=False)
    CELERY_WORKER_CONCURRENCY: int = Field(default=4)
    RESUME_PROCESSING_QUEUE: str = Field(default="resume_processing_queue")
    AI_MATCHING_QUEUE: str = Field(default="ai_matching_queue")

    INTERNAL_API_SECRET: str = Field(
        default="internal_ai_recruitment_engine_secret_key_2026"
    )

    GEMINI_API_KEY: Optional[str] = Field(default=None)
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL: str = Field(default="text-embedding-004")
    EMBEDDING_DIMENSION: int = Field(default=768)

    MATCHING_SHORTLIST_SIZE: int = Field(default=40)
    DEFAULT_SHORTLIST_SIZE: int = Field(default=40)
    MAX_SHORTLIST_SIZE: int = Field(default=100)
    MATCHING_DEFAULT_RESULT_LIMIT: int = Field(default=5)
    SCORING_CONFIG_VERSION: str = Field(default="v1")

    @property
    def CELERY_BROKER_URL(self) -> str:
        return self.REDIS_URL

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return self.REDIS_URL

    @property
    def GEMINI_GENERATION_MODEL(self) -> str:
        return self.GEMINI_MODEL


    GEMINI_MAX_CONCURRENCY: int = Field(default=5)
    GEMINI_MAX_RETRIES: int = Field(default=3)
    GEMINI_TIMEOUT_SECONDS: int = Field(default=30)

    # Token Budgets (0 = unlimited)
    AI_DAILY_BUDGET: int = Field(default=500_000)
    AI_MONTHLY_BUDGET: int = Field(default=10_000_000)

    # Pricing per 1M tokens in USD
    GEMINI_INPUT_PRICE_PER_1M: float = Field(default=0.15)
    GEMINI_OUTPUT_PRICE_PER_1M: float = Field(default=0.60)
    GEMINI_EMBEDDING_PRICE_PER_1M: float = Field(default=0.02)

    @property
    def sqlalchemy_database_url(self) -> str:
        env_override = os.environ.get("DATABASE_URL")
        return normalize_db_url(env_override or self.DATABASE_URL)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()
