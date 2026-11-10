from datetime import datetime, timezone
import uuid
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CandidateEmbedding(Base):
    __tablename__ = "candidate_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "resume_version",
            "embedding_type",
            "model_name",
            name="uq_ai_candidate_embedding_ver",
        ),
        {"schema": "ai"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    resume_id = Column(UUID(as_uuid=True), nullable=True)
    resume_version = Column(Integer, nullable=False, default=1)
    content_hash = Column(String(64), nullable=False)
    embedding_type = Column(String(32), nullable=False, default="FULL_PROFILE")
    model_name = Column(String(64), nullable=False)
    dimension = Column(Integer, nullable=False, default=768)
    embedding = Column(Vector(768), nullable=False)
    source_text_hash = Column(String(64), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class JobEmbedding(Base):
    __tablename__ = "job_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "job_id",
            "job_version",
            "embedding_type",
            "model_name",
            name="uq_ai_job_embedding_ver",
        ),
        {"schema": "ai"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    company_id = Column(UUID(as_uuid=True), nullable=False)
    job_version = Column(String(64), nullable=False)
    embedding_type = Column(String(32), nullable=False, default="FULL_JOB")
    model_name = Column(String(64), nullable=False)
    dimension = Column(Integer, nullable=False, default=768)
    embedding = Column(Vector(768), nullable=False)
    normalized_skills = Column(JSONB, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
