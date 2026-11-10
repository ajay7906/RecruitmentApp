from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InternalAuthContext, verify_internal_request
from app.schemas.matching_schema import RankingRequest, RankingResponse, ScoringWeightsConfig
from app.services.matching.matching_service import TenantAccessError
from app.services.ranking.ranking_service import ranking_service

router = APIRouter(tags=["Ranking"])


@router.post("/ranking", response_model=RankingResponse)
def rank_candidates_endpoint(
    payload: RankingRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> RankingResponse:
    if auth.company_id and auth.company_id != payload.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": "Header company_id does not match payload company_id"},
        )
    try:
        return ranking_service.rank_candidates_for_job(db, request=payload)
    except TenantAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": str(exc)},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": str(exc)},
        )


@router.get("/jobs/{job_id}/ranking", response_model=RankingResponse)
def get_job_ranking_endpoint(
    job_id: UUID,
    company_id: Optional[UUID] = Query(default=None),
    top_k: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> RankingResponse:
    effective_company_id = company_id or auth.company_id
    if not effective_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "COMPANY_ID_REQUIRED", "message": "company_id query param or X-Company-Id header is required"},
        )
    try:
        req = RankingRequest(
            job_id=job_id,
            company_id=effective_company_id,
            top_k=top_k,
            weights=ScoringWeightsConfig(),
        )
        return ranking_service.rank_candidates_for_job(db, request=req)
    except TenantAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": str(exc)},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": str(exc)},
        )
