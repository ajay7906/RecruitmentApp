from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class JobEmbeddingRequest(BaseModel):
    job_id: UUID
    company_id: UUID
    force_refresh: bool = False


class JobEmbeddingResponse(BaseModel):
    success: bool = True
    job_id: UUID
    company_id: UUID
    job_version: str
    model_name: str
    dimension: int
    cached: bool = False


class RecommendationRequest(BaseModel):
    candidate_id: UUID
    company_id: Optional[UUID] = None
    limit: int = Field(default=5, ge=1, le=50)
    min_skill_overlap: float = Field(default=0.0, ge=0.0, le=1.0)
    experience_tolerance_years: float = Field(default=2.0, ge=0.0, le=10.0)
    force_refresh: bool = False


class RecommendedJobItem(BaseModel):
    rank: int
    job_id: UUID
    company_id: UUID
    company_name: Optional[str] = None
    job_title: str
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    overall_score: float
    semantic_similarity_score: float
    skill_match_score: float
    experience_fit_score: float
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    explanation: str


class RecommendationResponse(BaseModel):
    success: bool = True
    candidate_id: UUID
    resume_version: int
    cached: bool = False
    total_recommendations: int
    recommendations: List[RecommendedJobItem]
