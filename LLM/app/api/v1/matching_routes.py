from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InternalAuthContext, verify_internal_request
from app.models.ai_usage import AIJobLog
from app.schemas.matching_schema import (
    MatchingEnqueueResponse,
    MatchingFilterConfig,
    MatchingProgressSchema,
    MatchingRequest,
    MatchingStatusResponse,
    ScoringWeightsConfig,
)
from app.schemas.recommendation_schema import JobEmbeddingRequest, JobEmbeddingResponse
from app.services.embeddings.embedding_service import embedding_service
from app.services.matching.matching_service import TenantAccessError, matching_service
from app.workers.matching_tasks import dispatch_matching_job

router = APIRouter(tags=["Matching"])


@router.post("/matching", response_model=MatchingEnqueueResponse)
def start_matching_endpoint(
    payload: MatchingRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> MatchingEnqueueResponse:
    if auth.company_id and auth.company_id != payload.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": "Header company_id does not match payload company_id"},
        )
    try:
        job_log = matching_service.create_matching_job_log(db, request=payload)
        dispatched = dispatch_matching_job(matching_id=job_log.id, request=payload)

        if isinstance(dispatched, dict) and dispatched.get("status") in ("COMPLETED", "FAILED"):
            status_obj = matching_service.get_matching_status(
                db, matching_id=job_log.id, company_id=payload.company_id
            )
            return MatchingEnqueueResponse(
                success=status_obj.success,
                matching_id=status_obj.matching_id,
                job_id=status_obj.job_id,
                company_id=status_obj.company_id,
                status=status_obj.status,
                progress=status_obj.progress,
                results=status_obj.top_candidates,
            )

        return MatchingEnqueueResponse(
            success=True,
            matching_id=job_log.id,
            job_id=payload.job_id,
            company_id=payload.company_id,
            status="QUEUED",
            progress=MatchingProgressSchema(),
        )
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


@router.get("/matching/{matching_id}", response_model=MatchingStatusResponse)
def get_matching_status_endpoint(
    matching_id: UUID,
    company_id: Optional[UUID] = Query(default=None),
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> MatchingStatusResponse:
    effective_company_id = company_id or auth.company_id
    try:
        return matching_service.get_matching_status(
            db, matching_id=matching_id, company_id=effective_company_id
        )
    except TenantAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": str(exc)},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATCHING_NOT_FOUND", "message": str(exc)},
        )


@router.post("/matching/{matching_id}/retry", response_model=MatchingEnqueueResponse)
def retry_matching_endpoint(
    matching_id: UUID,
    company_id: Optional[UUID] = Query(default=None),
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> MatchingEnqueueResponse:
    effective_company_id = company_id or auth.company_id
    job_log = db.query(AIJobLog).filter(AIJobLog.id == matching_id).first()
    if not job_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATCHING_NOT_FOUND", "message": f"Matching run {matching_id} not found"},
        )
    if effective_company_id and str(job_log.company_id) != str(effective_company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": "Cross-company retry denied"},
        )

    req_payload = job_log.request_payload or {}
    retry_req = MatchingRequest(
        job_id=job_log.job_id,
        company_id=job_log.company_id,
        requested_by=job_log.requested_by,
        top_k=int(req_payload.get("top_k") or 5),
        shortlist_size=req_payload.get("shortlist_size"),
        force_refresh=bool(req_payload.get("force_refresh", False)),
        async_execution=False,
        filters=MatchingFilterConfig(**(req_payload.get("filters") or {})),
        weights=ScoringWeightsConfig(**(req_payload.get("weights") or {})),
    )

    status_obj = matching_service.execute_matching(
        db, matching_id=matching_id, request=retry_req
    )
    return MatchingEnqueueResponse(
        success=status_obj.success,
        matching_id=status_obj.matching_id,
        job_id=status_obj.job_id,
        company_id=status_obj.company_id,
        status=status_obj.status,
        progress=status_obj.progress,
        results=status_obj.top_candidates,
    )


@router.post("/jobs/{job_id}/embeddings", response_model=JobEmbeddingResponse)
def generate_job_embedding_endpoint(
    job_id: UUID,
    payload: JobEmbeddingRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> JobEmbeddingResponse:
    effective_company_id = payload.company_id or auth.company_id
    try:
        emb, _, cached = embedding_service.ensure_job_embeddings(
            db,
            job_id=job_id,
            company_id=effective_company_id,
            force_refresh=payload.force_refresh,
        )
        db.commit()
        return JobEmbeddingResponse(
            success=True,
            job_id=job_id,
            company_id=emb.company_id,
            job_version=emb.job_version,
            model_name=emb.model_name,
            dimension=emb.dimension,
            cached=cached,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_COMPANY_FORBIDDEN", "message": str(exc)},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": str(exc)},
        )
