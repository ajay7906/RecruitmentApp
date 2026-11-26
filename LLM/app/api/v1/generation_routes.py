from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InternalAuthContext, verify_internal_request
from app.schemas.ai_generation_schema import (
    JobDescriptionGeneratorRequest,
    JobDescriptionGeneratorResponse,
    TailoredInterviewQuestionsRequest,
    TailoredInterviewQuestionsResponse,
)
from app.services.generation.generation_service import GenerationService

router = APIRouter(tags=["AI Generation"])


@router.post("/jobs/generate-description", response_model=JobDescriptionGeneratorResponse)
def generate_job_description_endpoint(
    payload: JobDescriptionGeneratorRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> JobDescriptionGeneratorResponse:
    return GenerationService.generate_job_description(db, payload)


@router.post("/interviews/generate-questions", response_model=TailoredInterviewQuestionsResponse)
def generate_interview_questions_endpoint(
    payload: TailoredInterviewQuestionsRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> TailoredInterviewQuestionsResponse:
    return GenerationService.generate_interview_questions(db, payload)
