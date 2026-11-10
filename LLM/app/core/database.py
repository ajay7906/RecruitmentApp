from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import get_settings, reload_settings
from app.core.logging import logger


class Base(DeclarativeBase):
    pass


_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None
_current_url: Optional[str] = None


def get_engine() -> Engine:
    global _engine, _SessionLocal, _current_url
    settings = reload_settings()
    db_url = settings.sqlalchemy_database_url

    if _engine is None or _current_url != db_url:
        if _engine is not None:
            _engine.dispose()

        is_test_or_single_conn = (
            settings.APP_ENV == "test"
            or "127.0.0.1:" in db_url
            and settings.DB_POOL_SIZE <= 1
        )

        if is_test_or_single_conn:
            _engine = create_engine(
                db_url,
                poolclass=NullPool,
                connect_args={"prepare_threshold": None},
                future=True,
            )
        else:
            _engine = create_engine(
                db_url,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_pre_ping=True,
                connect_args={"prepare_threshold": None},
                future=True,
            )
        _SessionLocal = sessionmaker(
            bind=_engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
        _current_url = db_url
    return _engine


def get_session_factory() -> sessionmaker:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def SessionLocal() -> Session:
    factory = get_session_factory()
    return factory()


def check_database_health() -> dict:
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            vec_ext = conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            ).scalar()
        return {
            "database": "ok",
            "pgvector": bool(vec_ext == "vector"),
        }
    except Exception as exc:
        return {
            "database": "error",
            "pgvector": False,
            "error": str(exc),
        }



def get_db() -> Generator[Session, None, None]:
    SessionFactory = get_session_factory()
    db = SessionFactory()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    SessionFactory = get_session_factory()
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def ensure_ai_schema_initialized() -> None:
    """
    Ensures the `vector` extension and `ai` schema tables exist.
    Executes the idempotent DDL in 011_ai_recruitment_engine.sql if needed.
    """
    engine = get_engine()
    sql_path = (
        Path(__file__).resolve().parents[3]
        / "backend"
        / "src"
        / "db"
        / "migrations"
        / "011_ai_recruitment_engine.sql"
    )
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS ai"))
        if sql_path.exists():
            ddl = sql_path.read_text(encoding="utf-8")
            conn.exec_driver_sql(ddl)
    logger.info("Verified `ai` schema and pgvector extension.")
