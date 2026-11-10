from fastapi import FastAPI
from app.api.v1.matching_routes import router as matching_router
from app.api.v1.ranking_routes import router as ranking_router
from app.api.v1.recommendation_routes import router as recommendation_router
from app.api.v1.resume_routes import router as resume_router
from app.core.config import get_settings
from app.core.database import check_database_health

settings = get_settings()

app = FastAPI(
    title="AI Recruitment Engine (Internal Service)",
    version="1.0.0",
    description=(
        "Dedicated Python FastAPI + Gemini + pgvector + Celery microservice for "
        "resume parsing, embeddings, candidate matching, ranking, and job recommendations."
    ),
)

app.include_router(resume_router, prefix="/internal/v1")
app.include_router(matching_router, prefix="/internal/v1")
app.include_router(ranking_router, prefix="/internal/v1")
app.include_router(recommendation_router, prefix="/internal/v1")


@app.get("/internal/v1/health")
def health_check():
    db_status = check_database_health()
    return {
        "success": db_status.get("database") == "ok",
        "service": "ai-recruitment-engine",
        "environment": settings.APP_ENV,
        "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
        "generation_model": settings.GEMINI_MODEL,
        **db_status,
    }
