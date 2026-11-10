from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ExtractedWorkExperience(BaseModel):
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    employment_dates: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    currently_working: bool = False
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    evidence_snippet: Optional[str] = None


class ExtractedEducation(BaseModel):
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[str] = None
    evidence_snippet: Optional[str] = None


class ExtractedProject(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    evidence_snippet: Optional[str] = None


class ExtractedCertification(BaseModel):
    name: str
    issuing_organization: Optional[str] = None
    issue_date: Optional[str] = None


class StructuredCandidateProfileSchema(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = None
    total_experience_years: Optional[float] = Field(default=None, ge=0.0, le=60.0)
    skills: List[str] = Field(default_factory=list)
    normalized_skills: List[str] = Field(default_factory=list)
    work_experience: List[ExtractedWorkExperience] = Field(default_factory=list)
    education: List[ExtractedEducation] = Field(default_factory=list)
    projects: List[ExtractedProject] = Field(default_factory=list)
    certifications: List[ExtractedCertification] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    extraction_evidence: Dict[str, str] = Field(default_factory=dict)

    @field_validator("total_experience_years", mode="before")
    @classmethod
    def sanitize_experience(cls, v):
        if v is None or v == "":
            return None
        try:
            val = float(v)
            return max(0.0, min(60.0, round(val, 2)))
        except (TypeError, ValueError):
            return None
