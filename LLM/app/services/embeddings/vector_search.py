from typing import Dict, List, Sequence
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings


class VectorSearchService:
    """
    Executes database-level cosine similarity searches via pgvector (`<=>` cosine distance)
    without loading all candidate or job embeddings into Python memory.
    Ensures model_name and vector dimension match before comparing.
    """

    @staticmethod
    def _format_vector_literal(vec: Sequence[float]) -> str:
        return "[" + ",".join(f"{float(v):.6f}" for v in vec) + "]"

    def search_candidates_for_job(
        self,
        db: Session,
        *,
        job_vector: Sequence[float],
        candidate_ids: List[UUID],
        embedding_type: str = "FULL_PROFILE",
        limit: int = 40,
    ) -> Dict[UUID, float]:
        """
        Computes cosine similarity in PostgreSQL via pgvector `<=>` operator ONLY for the
        specified eligible `candidate_ids` who applied to the job.
        Returns mapping of `candidate_id -> similarity_score (0..100)`.
        """
        if not candidate_ids or not job_vector:
            return {}

        settings = get_settings()
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dim = settings.EMBEDDING_DIMENSION
        vec_literal = self._format_vector_literal(job_vector)
        cid_strings = [str(cid) for cid in candidate_ids]

        rows = (
            db.execute(
                text(
                    """
                    SELECT
                      ce.candidate_id,
                      GREATEST(0.0, LEAST(1.0, 1.0 - (ce.embedding <=> CAST(:job_vec AS vector)))) AS cosine_sim
                    FROM ai.candidate_embeddings ce
                    WHERE ce.candidate_id = ANY(CAST(:candidate_ids AS uuid[]))
                      AND ce.is_active = TRUE
                      AND ce.embedding_type = :emb_type
                      AND ce.model_name = :model_name
                      AND ce.dimension = :dim
                    ORDER BY ce.embedding <=> CAST(:job_vec AS vector) ASC
                    LIMIT :lim
                    """
                ),
                {
                    "job_vec": vec_literal,
                    "candidate_ids": cid_strings,
                    "emb_type": embedding_type,
                    "model_name": model_name,
                    "dim": dim,
                    "lim": max(1, int(limit)),
                },
            )
            .mappings()
            .all()
        )

        scores: Dict[UUID, float] = {}
        for r in rows:
            cid = UUID(str(r["candidate_id"]))
            sim_0_100 = round(float(r["cosine_sim"] or 0.0) * 100.0, 2)
            scores[cid] = sim_0_100
        return scores

    def search_published_jobs_for_candidate(
        self,
        db: Session,
        *,
        candidate_vector: Sequence[float],
        company_id: UUID | None = None,
        limit: int = 25,
    ) -> List[Dict]:
        """
        Searches active `PUBLISHED` jobs from `APPROVED` companies using pgvector cosine distance.
        Never returns DRAFT, REJECTED, CLOSED, EXPIRED, PAUSED, or ARCHIVED jobs.
        """
        if not candidate_vector:
            return []

        settings = get_settings()
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dim = settings.EMBEDDING_DIMENSION
        vec_literal = self._format_vector_literal(candidate_vector)

        company_clause = "AND j.company_id = CAST(:company_id AS uuid)" if company_id else ""
        params = {
            "cand_vec": vec_literal,
            "model_name": model_name,
            "dim": dim,
            "lim": max(1, int(limit)),
        }
        if company_id:
            params["company_id"] = str(company_id)

        sql = f"""
            SELECT
              j.id AS job_id,
              j.company_id,
              c.name AS company_name,
              j.job_title,
              j.employment_type,
              j.work_mode,
              j.city,
              j.state,
              j.country,
              j.location,
              j.min_experience,
              j.max_experience,
              j.required_skills,
              j.preferred_skills,
              je.job_version,
              je.normalized_skills,
              GREATEST(0.0, LEAST(1.0, 1.0 - (je.embedding <=> CAST(:cand_vec AS vector)))) AS cosine_sim
            FROM ai.job_embeddings je
            JOIN public.jobs j ON j.id = je.job_id
            JOIN public.companies c ON c.id = j.company_id
            WHERE je.is_active = TRUE
              AND je.embedding_type = 'FULL_JOB'
              AND je.model_name = :model_name
              AND je.dimension = :dim
              AND j.status = 'PUBLISHED'
              AND c.status = 'APPROVED'
              AND (
                j.application_deadline IS NULL
                OR j.allow_after_deadline = TRUE
                OR j.application_deadline >= NOW()
              )
              {company_clause}
            ORDER BY je.embedding <=> CAST(:cand_vec AS vector) ASC
            LIMIT :lim
        """
        rows = db.execute(text(sql), params).mappings().all()
        return [dict(r) for r in rows]


vector_search_service = VectorSearchService()
