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
    company_logo: Optional[str] = None
    job_title: str
    title: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    salary_currency: Optional[str] = "INR"
    experience_required: Optional[str] = None
    min_experience: Optional[float] = None
    max_experience: Optional[float] = None
    required_skills: List[str] = Field(default_factory=list)
    overall_score: float
    match_percentage: float = 0.0
    semantic_similarity_score: float = 0.0
    skill_match_score: float = 0.0
    experience_fit_score: float = 0.0
    location_score: float = 0.0
    education_score: float = 0.0
    employment_type_score: float = 0.0
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    explanation: str = ""
    ai_explanation: Optional[str] = None
    has_applied: bool = False
    application_status: Optional[str] = None


class RecommendationResponse(BaseModel):
    success: bool = True
    candidate_id: UUID
    resume_version: int
    cached: bool = False
    total_recommendations: int
    recommendations: List[RecommendedJobItem]
