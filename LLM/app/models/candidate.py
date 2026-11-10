from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AICandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    __table_args__ = (
        UniqueConstraint("resume_id", "resume_version", name="uq_ai_candidate_profiles_resume_ver"),
        {"schema": "ai"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    resume_id = Column(UUID(as_uuid=True), nullable=False)
    resume_version = Column(Integer, nullable=False, default=1)
    content_hash = Column(String(64), nullable=False)
    is_latest = Column(Boolean, nullable=False, default=True)

    full_name = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    total_experience_years = Column(Numeric(5, 2), nullable=True)
    extracted_text = Column(Text, nullable=False, default="")
    cleaned_text = Column(Text, nullable=False, default="")

    technical_skills = Column(JSONB, nullable=False, default=list)
    normalized_skills = Column(JSONB, nullable=False, default=list)
    education = Column(JSONB, nullable=False, default=list)
    work_experience = Column(JSONB, nullable=False, default=list)
    projects = Column(JSONB, nullable=False, default=list)
    certifications = Column(JSONB, nullable=False, default=list)
    languages = Column(JSONB, nullable=False, default=list)
    extraction_evidence = Column(JSONB, nullable=False, default=dict)
    extraction_source = Column(String(32), nullable=False, default="HYBRID")
    extraction_model = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
