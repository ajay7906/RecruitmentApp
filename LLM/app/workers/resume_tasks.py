from typing import Any, Dict, Optional
from uuid import UUID

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.services.resume.resume_processor import resume_processor
from app.workers.celery_app import celery_app

logger = get_logger(__name__)
settings = get_settings()


@celery_app.task(
    name="app.workers.resume_tasks.process_resume_task",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
)
def process_resume_task(
    self,
    *,
    resume_id: str,
    candidate_id: Optional[str] = None,
    company_id: Optional[str] = None,
    resume_version: Optional[int] = None,
    storage_key: Optional[str] = None,
    file_type: Optional[str] = None,
    content_base64: Optional[str] = None,
    force_reprocess: bool = False,
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        result = resume_processor.process_resume(
            db,
            resume_id=UUID(str(resume_id)),
            candidate_id=UUID(str(candidate_id)) if candidate_id else None,
            company_id=UUID(str(company_id)) if company_id else None,
            resume_version=resume_version,
            storage_key=storage_key,
            file_type=file_type,
            content_base64=content_base64,
            force_reprocess=force_reprocess,
            task_id=getattr(self.request, "id", None),
        )
        return {
            **result,
            "resume_id": str(result["resume_id"]),
            "candidate_id": str(result["candidate_id"]),
        }
    finally:
        db.close()


def dispatch_resume_processing(
    *,
    resume_id: UUID,
    candidate_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    resume_version: Optional[int] = None,
    storage_key: Optional[str] = None,
    file_type: Optional[str] = None,
    content_base64: Optional[str] = None,
    force_reprocess: bool = False,
    sync_execution: bool = False,
) -> Dict[str, Any]:
    """
    Enqueues resume processing on `resume_processing_queue` or executes synchronously
    if `sync_execution=True`, `CELERY_TASK_ALWAYS_EAGER=True`, or broker is unreachable.
    """
    kwargs = {
        "resume_id": str(resume_id),
        "candidate_id": str(candidate_id) if candidate_id else None,
        "company_id": str(company_id) if company_id else None,
        "resume_version": resume_version,
        "storage_key": storage_key,
        "file_type": file_type,
        "content_base64": content_base64,
        "force_reprocess": force_reprocess,
    }
    if sync_execution or settings.CELERY_TASK_ALWAYS_EAGER:
        return process_resume_task.apply(kwargs=kwargs).get()

    try:
        async_result = process_resume_task.apply_async(
            kwargs=kwargs,
            queue=settings.RESUME_PROCESSING_QUEUE,
        )
        return {
            "queued": True,
            "resume_id": str(resume_id),
            "candidate_id": str(candidate_id) if candidate_id else None,
            "resume_version": resume_version or 1,
            "task_id": async_result.id,
            "status": "QUEUED",
        }
    except Exception as exc:
        logger.warning(f"Celery broker unreachable ({exc}); running resume task synchronously")
        return process_resume_task.apply(kwargs=kwargs).get()
