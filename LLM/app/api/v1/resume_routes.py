from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InternalAuthContext, verify_internal_request
from app.schemas.resume_schema import (
    ResumeProcessRequest,
    ResumeProcessResponse,
    ResumeStatusResponse,
)
from app.services.resume.resume_processor import resume_processor
from app.workers.resume_tasks import dispatch_resume_processing

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("/process", response_model=ResumeProcessResponse)
def process_resume_endpoint(
    payload: ResumeProcessRequest,
    db: Session = Depends(get_db),
    auth: InternalAuthContext = Depends(verify_internal_request),
) -> ResumeProcessResponse:
    company_id = payload.company_id or auth.company_id
    try:
        if not payload.async_execution:
            res = resume_processor.process_resume(
                db,
                resume_id=payload.resume_id,
                candidate_id=payload.candidate_id,
                company_id=company_id,
                resume_version=payload.resume_version,
                storage_key=payload.storage_key,
                file_type=payload.file_type,
                content_base64=payload.content_base64,
                force_reprocess=payload.force_reprocess,
            )
            return ResumeProcessResponse(
                success=res["status"] != "FAILED",
                resume_id=UUID(str(res["resume_id"])),
                candidate_id=UUID(str(res["candidate_id"])),
                resume_version=int(res["resume_version"]),
                status=res["status"],
                content_hash=res.get("content_hash"),
                cached=bool(res.get("cached", False)),
                error_code=res.get("error_code"),
                error_message=res.get("error_message"),
            )

        dispatched = dispatch_resume_processing(
            resume_id=payload.resume_id,
            candidate_id=payload.candidate_id,
            company_id=company_id,
            resume_version=payload.resume_version,
            storage_key=payload.storage_key,
            file_type=payload.file_type,
            content_base64=payload.content_base64,
            force_reprocess=payload.force_reprocess,
            sync_execution=False,
        )
        return ResumeProcessResponse(
            success=dispatched.get("status") != "FAILED",
            resume_id=UUID(str(dispatched.get("resume_id") or payload.resume_id)),
            candidate_id=UUID(str(dispatched.get("candidate_id") or payload.candidate_id or payload.resume_id)),
            resume_version=int(dispatched.get("resume_version") or payload.resume_version or 1),
            status=str(dispatched.get("status") or "QUEUED"),
            content_hash=dispatched.get("content_hash"),
            task_id=dispatched.get("task_id"),
            cached=bool(dispatched.get("cached", False)),
            error_code=dispatched.get("error_code"),
            error_message=dispatched.get("error_message"),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESUME_NOT_FOUND", "message": str(exc)},
        )


@router.get("/{resume_id}/status", response_model=ResumeStatusResponse)
def get_resume_status_endpoint(
    resume_id: UUID,
    db: Session = Depends(get_db),
    _auth: InternalAuthContext = Depends(verify_internal_request),
) -> ResumeStatusResponse:
    status_dict = resume_processor.get_resume_status(db, resume_id)
    if not status_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESUME_STATUS_NOT_FOUND", "message": f"No processing record found for resume {resume_id}"},
        )
    return ResumeStatusResponse(
        success=status_dict["status"] != "FAILED",
        **status_dict,
    )
