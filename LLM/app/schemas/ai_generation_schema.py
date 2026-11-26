from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class JobDescriptionGeneratorRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    department: Optional[str] = None
    experience_level: Optional[str] = "MID"  # ENTRY, MID, SENIOR, LEAD, EXECUTIVE
    employment_type: Optional[str] = "FULL_TIME"  # FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
    work_mode: Optional[str] = "HYBRID"  # REMOTE, HYBRID, ONSITE
    company_name: Optional[str] = None
    key_requirements_or_notes: Optional[str] = None


class JobDescriptionGeneratorResponse(BaseModel):
    title: str
    summary: str
    description: str
    responsibilities: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    min_experience_years: Optional[int] = None
    max_experience_years: Optional[int] = None
    suggested_education_level: Optional[str] = None


class InterviewQuestionItem(BaseModel):
    category: str = Field(..., description="e.g. Technical Depth, Skill Verification, System Design, Behavioral")
    question: str
    context_or_rationale: str = Field(..., description="Why this question is relevant based on job vs candidate profile")
    what_to_look_for: List[str] = Field(default_factory=list, description="Ideal signals in candidate's response")
    difficulty: str = Field(default="Intermediate", description="Basic, Intermediate, Advanced")


class TailoredInterviewQuestionsRequest(BaseModel):
    job_title: str
    job_description: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    candidate_name: Optional[str] = "Candidate"
    candidate_experience_years: Optional[float] = None
    candidate_skills: List[str] = Field(default_factory=list)
    candidate_work_history: List[Dict[str, Any]] = Field(default_factory=list)
    interview_round: Optional[str] = "TECHNICAL"  # INITIAL_SCREEN, TECHNICAL, SYSTEM_DESIGN, BEHAVIORAL
    focus_areas: Optional[List[str]] = Field(default_factory=list)


class TailoredInterviewQuestionsResponse(BaseModel):
    candidate_name: Optional[str] = "Candidate"
    job_title: str
    interview_round: str
    overall_interview_focus: str
    questions: List[InterviewQuestionItem] = Field(default_factory=list)
