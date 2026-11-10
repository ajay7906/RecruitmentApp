from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ScoringWeightsConfig(BaseModel):
    skill_weight: float = Field(default=0.35, ge=0.0, le=1.0)
    experience_weight: float = Field(default=0.20, ge=0.0, le=1.0)
    semantic_weight: float = Field(default=0.20, ge=0.0, le=1.0)
    llm_weight: float = Field(default=0.15, ge=0.0, le=1.0)
    project_weight: float = Field(default=0.10, ge=0.0, le=1.0)


class MatchingFilterConfig(BaseModel):
    strict_required_skills: bool = False
    min_required_skill_match_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    enforce_experience_range: bool = False
    experience_tolerance_years: float = Field(default=1.5, ge=0.0, le=10.0)
    mandatory_location: bool = False
    enforce_salary_budget: bool = False


class MatchingRequest(BaseModel):
    job_id: UUID
    company_id: UUID
    requested_by: Optional[UUID] = None
    top_k: int = Field(default=5, ge=1, le=50)
    shortlist_size: Optional[int] = Field(default=None, ge=1, le=200)
    force_refresh: bool = False
    async_execution: bool = True
    filters: MatchingFilterConfig = Field(default_factory=MatchingFilterConfig)
    weights: ScoringWeightsConfig = Field(default_factory=ScoringWeightsConfig)


class EvidenceItemSchema(BaseModel):
    claim: str
    resume_excerpt: str
    section: Optional[str] = "resume"


class GeminiCandidateEvaluationSchema(BaseModel):
    overall_compatibility_score: float = Field(..., ge=0.0, le=100.0)
    skill_compatibility_score: float = Field(..., ge=0.0, le=100.0)
    experience_compatibility_score: float = Field(..., ge=0.0, le=100.0)
    project_relevance_score: float = Field(..., ge=0.0, le=100.0)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    evidence: List[EvidenceItemSchema] = Field(default_factory=list)
    recommendation_category: str = Field(default="CONSIDER")
    summary_explanation: str = Field(default="")

    @field_validator("recommendation_category", mode="before")
    @classmethod
    def validate_category(cls, v):
        allowed = {"STRONG_MATCH", "GOOD_MATCH", "CONSIDER", "WEAK_MATCH"}
        val = str(v or "CONSIDER").strip().upper()
        return val if val in allowed else "CONSIDER"


class RankedCandidateItem(BaseModel):
    rank: int
    application_id: UUID
    candidate_id: UUID
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    resume_id: Optional[UUID] = None
    resume_version: int = 1
    application_status: Optional[str] = None
    overall_score: float
    skill_score: float
    experience_score: float
    project_score: float
    similarity_score: float
    llm_score: Optional[float] = None
    recommendation_category: str = "CONSIDER"
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    evidence: List[EvidenceItemSchema] = Field(default_factory=list)
    explanation: str = ""
    cached_evaluation: bool = False


class MatchingProgressSchema(BaseModel):
    total_applications: int = 0
    eligible_candidates: int = 0
    candidates_retrieved: int = 0
    candidates_evaluated: int = 0
    candidates_completed: int = 0
    candidates_failed: int = 0


class MatchingEnqueueResponse(BaseModel):
    success: bool = True
    matching_id: UUID
    job_id: UUID
    company_id: UUID
    status: str
    progress: MatchingProgressSchema = Field(default_factory=MatchingProgressSchema)
    results: Optional[List[RankedCandidateItem]] = None


class MatchingStatusResponse(BaseModel):
    success: bool = True
    matching_id: UUID
    job_id: UUID
    company_id: UUID
    status: str
    progress: MatchingProgressSchema
    top_candidates: List[RankedCandidateItem] = Field(default_factory=list)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


class RankingRequest(BaseModel):
    job_id: UUID
    company_id: UUID
    top_k: int = Field(default=10, ge=1, le=100)
    weights: ScoringWeightsConfig = Field(default_factory=ScoringWeightsConfig)


class RankingResponse(BaseModel):
    success: bool = True
    job_id: UUID
    company_id: UUID
    job_version: str
    scoring_config_version: str
    total_ranked: int
    candidates: List[RankedCandidateItem]
