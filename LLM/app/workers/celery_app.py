from celery import Celery
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_recruitment_engine",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.resume_tasks",
        "app.workers.matching_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=True,
    task_default_queue=settings.RESUME_PROCESSING_QUEUE,
    task_queues=(
        Queue(settings.RESUME_PROCESSING_QUEUE, routing_key=settings.RESUME_PROCESSING_QUEUE),
        Queue(settings.AI_MATCHING_QUEUE, routing_key=settings.AI_MATCHING_QUEUE),
    ),
    task_routes={
        "app.workers.resume_tasks.*": {"queue": settings.RESUME_PROCESSING_QUEUE},
        "app.workers.matching_tasks.*": {"queue": settings.AI_MATCHING_QUEUE},
    },
)
