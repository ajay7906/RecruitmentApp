from typing import Any, Dict
from uuid import UUID

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.schemas.matching_schema import MatchingRequest
from app.services.matching.matching_service import matching_service
from app.workers.celery_app import celery_app

logger = get_logger(__name__)
settings = get_settings()


@celery_app.task(
    name="app.workers.matching_tasks.run_matching_task",
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
)
def run_matching_task(
    self,
    *,
    matching_id: str,
    request_payload: Dict[str, Any],
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        req = MatchingRequest(**request_payload)
        status_resp = matching_service.execute_matching(
            db,
            matching_id=UUID(str(matching_id)),
            request=req,
        )
        return status_resp.model_dump(mode="json")
    finally:
        db.close()


def dispatch_matching_job(
    *,
    matching_id: UUID,
    request: MatchingRequest,
) -> Dict[str, Any]:
    """
    Enqueues AI matching on `ai_matching_queue` or executes synchronously when
    `request.async_execution=False` or `CELERY_TASK_ALWAYS_EAGER=True` or broker is unreachable.
    """
    payload = request.model_dump(mode="json")
    kwargs = {
        "matching_id": str(matching_id),
        "request_payload": payload,
    }
    if not request.async_execution or settings.CELERY_TASK_ALWAYS_EAGER:
        return run_matching_task.apply(kwargs=kwargs).get()

    try:
        async_result = run_matching_task.apply_async(
            kwargs=kwargs,
            queue=settings.AI_MATCHING_QUEUE,
        )
        return {
            "queued": True,
            "task_id": async_result.id,
            "status": "QUEUED",
        }
    except Exception as exc:
        logger.warning(f"Celery broker unreachable ({exc}); executing matching job synchronously")
        return run_matching_task.apply(kwargs=kwargs).get()
