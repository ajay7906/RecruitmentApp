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
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIJobLog(Base):
    __tablename__ = "ai_job_logs"
    __table_args__ = {"schema": "ai"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(32), nullable=False)
    status = Column(String(24), nullable=False, default="QUEUED")
    company_id = Column(UUID(as_uuid=True), nullable=True)
    job_id = Column(UUID(as_uuid=True), nullable=True)
    candidate_id = Column(UUID(as_uuid=True), nullable=True)
    requested_by = Column(UUID(as_uuid=True), nullable=True)
    celery_task_id = Column(String(128), nullable=True)
    config_snapshot = Column(JSONB, nullable=False, default=dict)

    total_applications = Column(Integer, nullable=False, default=0)
    eligible_candidates = Column(Integer, nullable=False, default=0)
    candidates_retrieved = Column(Integer, nullable=False, default=0)
    candidates_evaluated = Column(Integer, nullable=False, default=0)
    candidates_completed = Column(Integer, nullable=False, default=0)
    candidates_failed = Column(Integer, nullable=False, default=0)

    result_summary = Column(JSONB, nullable=False, default=dict)
    retry_count = Column(Integer, nullable=False, default=0)
    duration_ms = Column(Integer, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    @property
    def request_payload(self):
        return self.config_snapshot

    @request_payload.setter
    def request_payload(self, value):
        self.config_snapshot = value



class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"
    __table_args__ = {"schema": "ai"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), nullable=True)
    job_id = Column(UUID(as_uuid=True), nullable=True)
    candidate_id = Column(UUID(as_uuid=True), nullable=True)
    request_type = Column(String(32), nullable=False)
    model_name = Column(String(64), nullable=False)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    estimated_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    latency_ms = Column(Integer, nullable=False, default=0)
    cached_hit = Column(Boolean, nullable=False, default=False)
    status = Column(String(24), nullable=False, default="SUCCESS")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
