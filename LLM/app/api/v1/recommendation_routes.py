from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InternalAuthContext, verify_internal_request
from app.schemas.recommendation_schema import (
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.recommendations.recommendation_service import recommendation_service

router = APIRouter(tags=["Recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def recommend_jobs_endpoint(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> RecommendationResponse:
    if auth.company_id and payload.company_id and auth.company_id != payload.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": "Header company_id does not match payload company_id"},
        )
    try:
        return recommendation_service.recommend_jobs_for_candidate(db, request=payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CANDIDATE_NOT_FOUND", "message": str(exc)},
        )
