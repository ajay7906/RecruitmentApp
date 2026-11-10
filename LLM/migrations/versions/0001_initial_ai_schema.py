"""Initial AI schema and pgvector tables

Revision ID: 0001_initial_ai_schema
Revises:
Create Date: 2026-11-09 23:40:00
"""

from pathlib import Path
from alembic import op

revision = "0001_initial_ai_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = (
        Path(__file__).resolve().parents[3]
        / "backend"
        / "src"
        / "db"
        / "migrations"
        / "011_ai_recruitment_engine.sql"
    )
    if sql_path.exists():
        op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS ai CASCADE;")
