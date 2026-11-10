from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
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


class MatchResult(Base):
    __tablename__ = "match_results"
    __table_args__ = (
        UniqueConstraint(
            "application_id",
            "resume_version",
            "job_version",
            "embedding_model_version",
            "evaluation_model_version",
            "scoring_config_version",
            name="uq_ai_match_results_cache",
        ),
        {"schema": "ai"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matching_run_id = Column(UUID(as_uuid=True), ForeignKey("ai.ai_job_logs.id", ondelete="SET NULL"), nullable=True)
    application_id = Column(UUID(as_uuid=True), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    company_id = Column(UUID(as_uuid=True), nullable=False)
    resume_id = Column(UUID(as_uuid=True), nullable=True)

    resume_version = Column(Integer, nullable=False, default=1)
    job_version = Column(String(64), nullable=False)
    embedding_model_version = Column(String(64), nullable=False)
    evaluation_model_version = Column(String(64), nullable=False)
    scoring_config_version = Column(String(64), nullable=False, default="v1")

    eligible = Column(Boolean, nullable=False, default=True)
    filter_reasons = Column(JSONB, nullable=False, default=list)

    similarity_score = Column(Numeric(6, 2), nullable=False, default=0)
    skill_score = Column(Numeric(6, 2), nullable=False, default=0)
    experience_score = Column(Numeric(6, 2), nullable=False, default=0)
    project_score = Column(Numeric(6, 2), nullable=False, default=0)
    llm_score = Column(Numeric(6, 2), nullable=True)
    final_score = Column(Numeric(6, 2), nullable=False, default=0)
    rank_position = Column(Integer, nullable=True)

    status = Column(String(24), nullable=False, default="COMPLETED")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class MatchEvaluation(Base):
    __tablename__ = "match_evaluations"
    __table_args__ = {"schema": "ai"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_result_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ai.match_results.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    application_id = Column(UUID(as_uuid=True), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    company_id = Column(UUID(as_uuid=True), nullable=False)
    resume_version = Column(Integer, nullable=False, default=1)
    job_version = Column(String(64), nullable=False)
    model_name = Column(String(64), nullable=False)

    overall_compatibility_score = Column(Numeric(6, 2), nullable=False, default=0)
    skill_compatibility_score = Column(Numeric(6, 2), nullable=False, default=0)
    experience_score = Column(Numeric(6, 2), nullable=False, default=0)
    project_relevance_score = Column(Numeric(6, 2), nullable=False, default=0)
    recommendation_category = Column(String(32), nullable=False, default="CONSIDER")

    strengths = Column(JSONB, nullable=False, default=list)
    weaknesses = Column(JSONB, nullable=False, default=list)
    missing_skills = Column(JSONB, nullable=False, default=list)
    matched_skills = Column(JSONB, nullable=False, default=list)
    evidence = Column(JSONB, nullable=False, default=list)
    summary_explanation = Column(Text, nullable=False, default="")
    evaluation_metadata = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class JobRecommendationsCache(Base):
    __tablename__ = "job_recommendations_cache"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "company_id",
            "resume_version",
            "jobs_state_hash",
            "config_hash",
            name="uq_ai_job_recommendations_cache",
        ),
        {"schema": "ai"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)
    company_id = Column(UUID(as_uuid=True), nullable=True)
    resume_version = Column(Integer, nullable=False, default=1)
    jobs_state_hash = Column(String(64), nullable=False)
    config_hash = Column(String(64), nullable=False)
    recommendations = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)
