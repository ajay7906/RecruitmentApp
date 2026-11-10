from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.candidate import AICandidateProfile
from app.models.embedding import CandidateEmbedding
from app.models.matching import JobRecommendationsCache
from app.schemas.recommendation_schema import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendedJobItem,
)
from app.services.embeddings.embedding_service import embedding_service
from app.services.embeddings.vector_search import vector_search_service
from app.services.gemini.gemini_client import gemini_client
from app.services.matching.scoring_service import scoring_service
from app.services.resume.resume_processor import resume_processor
from app.utils.skill_normalizer import normalize_skill_list
from app.utils.version_utils import compute_config_version_hash, compute_jobs_state_hash

logger = get_logger(__name__)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RecommendationService:
    """
    AI Job Recommendations Engine.
    Recommends active PUBLISHED jobs from APPROVED companies for a candidate
    using candidate vector embeddings, pgvector similarity search, skill overlap,
    and experience fit, with caching in ai.job_recommendations_cache.
    """

    def _prepare_candidate(
        self,
        db: Session,
        *,
        candidate_id: UUID,
        company_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        ai_profile = (
            db.query(AICandidateProfile)
            .filter(AICandidateProfile.candidate_id == candidate_id)
            .order_by(AICandidateProfile.is_latest.desc(), AICandidateProfile.resume_version.desc())
            .first()
        )

        latest_resume = (
            db.execute(
                text(
                    """
                    SELECT id, version, resume_status
                    FROM public.candidate_resumes
                    WHERE candidate_id = :cid AND is_deleted = FALSE
                    ORDER BY is_primary DESC, is_latest_version DESC, version DESC, created_at DESC
                    LIMIT 1
                    """
                ),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .first()
        )

        if not ai_profile and latest_resume:
            try:
                resume_processor.process_resume(
                    db,
                    resume_id=UUID(str(latest_resume["id"])),
                    candidate_id=candidate_id,
                    company_id=company_id,
                )
                ai_profile = (
                    db.query(AICandidateProfile)
                    .filter(AICandidateProfile.candidate_id == candidate_id)
                    .order_by(AICandidateProfile.is_latest.desc(), AICandidateProfile.resume_version.desc())
                    .first()
                )
            except Exception as exc:
                logger.warning(f"Candidate resume processing fallback during recommendation: {exc}")

        pub_row = (
            db.execute(
                text(
                    """
                    SELECT
                      u.full_name,
                      cp.headline,
                      cp.bio AS summary,
                      cp.skills,
                      cp.years_of_experience,
                      cp.location AS current_location
                    FROM public.users u
                    LEFT JOIN public.candidate_profiles cp ON cp.user_id = u.id
                    WHERE u.id = :cid
                    LIMIT 1
                    """
                ),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .first()
        )
        if not pub_row and not ai_profile:
            raise ValueError(f"Candidate {candidate_id} not found")

        resume_version = (
            int(ai_profile.resume_version)
            if (ai_profile and ai_profile.resume_version)
            else int(latest_resume["version"]) if latest_resume else 1
        )
        resume_id = (
            ai_profile.resume_id
            if (ai_profile and ai_profile.resume_id)
            else (UUID(str(latest_resume["id"])) if latest_resume else None)
        )

        skills = normalize_skill_list(
            ((ai_profile.normalized_skills if ai_profile else []) or [])
            + ((pub_row["skills"] if pub_row and pub_row.get("skills") else []) or [])
        )
        exp_years = float(
            ai_profile.total_experience_years
            if (ai_profile and ai_profile.total_experience_years is not None)
            else (pub_row["years_of_experience"] if pub_row and pub_row.get("years_of_experience") is not None else 0.0)
        )
        summary = (
            (pub_row["summary"] if pub_row else None)
            or (pub_row["headline"] if pub_row else "")
            or ""
        )

        candidate_vector: List[float] = []
        if ai_profile:
            embs = embedding_service.ensure_candidate_embeddings(
                db,
                ai_profile=ai_profile,
                company_id=company_id,
            )
            full_emb = embs.get("FULL_PROFILE")
            if full_emb is not None:
                candidate_vector = list(full_emb.embedding)
        if not candidate_vector:
            active_emb = (
                db.query(CandidateEmbedding)
                .filter(
                    CandidateEmbedding.candidate_id == candidate_id,
                    CandidateEmbedding.is_active.is_(True),
                    CandidateEmbedding.embedding_type == "FULL_PROFILE",
                )
                .first()
            )
            if active_emb is not None:
                candidate_vector = list(active_emb.embedding)
            else:
                synth_text = f"Candidate Skills: {', '.join(skills)}\nExperience: {exp_years} years\n{summary}"
                vecs = gemini_client.generate_embeddings(
                    db,
                    [synth_text],
                    company_id=company_id,
                    candidate_id=candidate_id,
                )
                candidate_vector = vecs[0]

        return {
            "candidate_id": candidate_id,
            "resume_id": resume_id,
            "resume_version": resume_version,
            "full_name": (ai_profile.full_name if ai_profile else None) or (pub_row["full_name"] if pub_row else ""),
            "professional_summary": summary,
            "normalized_skills": skills,
            "total_experience_years": exp_years,
            "candidate_vector": candidate_vector,
        }

    def _fetch_eligible_published_jobs(
        self,
        db: Session,
        *,
        company_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        company_clause = "AND j.company_id = :company_id" if company_id else ""
        params: Dict[str, Any] = {}
        if company_id:
            params["company_id"] = str(company_id)

        rows = (
            db.execute(
                text(
                    f"""
                    SELECT
                      j.id AS job_id,
                      j.company_id,
                      c.name AS company_name,
                      j.job_title,
                      j.job_description,
                      j.required_skills,
                      j.preferred_skills,
                      j.min_experience,
                      j.max_experience,
                      j.employment_type,
                      j.work_mode,
                      j.status,
                      j.content_hash,
                      j.updated_at,
                      COALESCE(j.location, COALESCE(j.city, '') || CASE WHEN j.state IS NOT NULL AND j.state != '' THEN ', ' || j.state ELSE '' END) AS location
                    FROM public.jobs j
                    JOIN public.companies c ON c.id = j.company_id
                    WHERE j.status = 'PUBLISHED'
                      AND c.status = 'APPROVED'
                      AND (
                        j.application_deadline IS NULL
                        OR j.allow_after_deadline = TRUE
                        OR j.application_deadline >= NOW()
                      )
                      {company_clause}
                    ORDER BY j.published_at DESC NULLS LAST, j.created_at DESC
                    LIMIT 200
                    """
                ),
                params,
            )
            .mappings()
            .all()
        )
        return [dict(r) for r in rows]

    def recommend_jobs_for_candidate(
        self,
        db: Session,
        *,
        request: RecommendationRequest,
    ) -> RecommendationResponse:
        cand = self._prepare_candidate(
            db, candidate_id=request.candidate_id, company_id=request.company_id
        )
        resume_version = int(cand["resume_version"])

        published_jobs = self._fetch_eligible_published_jobs(
            db, company_id=request.company_id
        )
        if not published_jobs:
            return RecommendationResponse(
                success=True,
                candidate_id=request.candidate_id,
                resume_version=resume_version,
                cached=False,
                total_recommendations=0,
                recommendations=[],
            )

        jobs_state_hash = compute_jobs_state_hash(
            [
                {
                    "id": str(j["job_id"]),
                    "content_hash": j.get("content_hash") or "",
                    "updated_at": str(j.get("updated_at") or ""),
                }
                for j in published_jobs
            ]
        )
        config_hash = compute_config_version_hash(
            {
                "limit": request.limit,
                "min_skill_overlap": request.min_skill_overlap,
                "experience_tolerance_years": request.experience_tolerance_years,
                "company_id": str(request.company_id) if request.company_id else "ALL",
            }
        )

        if not request.force_refresh:
            cache_query = db.query(JobRecommendationsCache).filter(
                JobRecommendationsCache.candidate_id == request.candidate_id,
                JobRecommendationsCache.resume_version == resume_version,
                JobRecommendationsCache.jobs_state_hash == jobs_state_hash,
                JobRecommendationsCache.config_hash == config_hash,
                JobRecommendationsCache.expires_at > utc_now(),
            )
            if request.company_id:
                cache_query = cache_query.filter(
                    JobRecommendationsCache.company_id == request.company_id
                )
            else:
                cache_query = cache_query.filter(JobRecommendationsCache.company_id.is_(None))

            cached_row = cache_query.first()
            if cached_row:
                items = [RecommendedJobItem(**item) for item in (cached_row.recommendations or [])]
                return RecommendationResponse(
                    success=True,
                    candidate_id=request.candidate_id,
                    resume_version=resume_version,
                    cached=True,
                    total_recommendations=len(items),
                    recommendations=items[: request.limit],
                )

        for job in published_jobs:
            try:
                embedding_service.ensure_job_embeddings(
                    db,
                    job_id=UUID(str(job["job_id"])),
                    company_id=UUID(str(job["company_id"])),
                    force_refresh=False,
                )
            except Exception as exc:
                logger.warning(f"Failed ensuring job embedding for {job['job_id']}: {exc}")

        vec_hits = vector_search_service.search_published_jobs_for_candidate(
            db,
            candidate_vector=cand["candidate_vector"],
            company_id=request.company_id,
            limit=max(len(published_jobs), 50),
        )
        sim_map = {
            str(h["job_id"]): round(float(h.get("cosine_sim") or 0.0) * 100.0, 2)
            for h in vec_hits
        }

        recommendations_raw: List[Dict[str, Any]] = []
        cand_exp = float(cand["total_experience_years"] or 0.0)
        tolerance = float(request.experience_tolerance_years or 2.0)

        for job in published_jobs:
            job_id_str = str(job["job_id"])
            min_exp = job.get("min_experience")
            if min_exp is not None and float(min_exp) > 0:
                if cand_exp + tolerance < float(min_exp):
                    continue

            skill_res = scoring_service.compute_skill_score(
                candidate_skills=cand["normalized_skills"],
                required_skills=job.get("required_skills") or [],
                preferred_skills=job.get("preferred_skills") or [],
            )
            req_list = normalize_skill_list(job.get("required_skills") or [])
            if req_list and request.min_skill_overlap > 0:
                overlap_ratio = len(skill_res["matched_required"]) / len(req_list)
                if overlap_ratio < request.min_skill_overlap:
                    continue

            exp_score = scoring_service.compute_experience_score(
                candidate_years=cand_exp,
                min_experience=job.get("min_experience"),
                max_experience=job.get("max_experience"),
            )
            sim_score = sim_map.get(job_id_str, round((skill_res["score"] * 0.7) + 15.0, 2))

            overall = round(
                (skill_res["score"] * 0.45)
                + (sim_score * 0.35)
                + (exp_score * 0.20),
                2,
            )

            matched_skills = skill_res["matched_skills"]
            missing_skills = skill_res["missing_skills"]
            explanation = (
                f"Matches {len(matched_skills)} key skill(s) for {job['job_title']}"
                + (f" ({', '.join(matched_skills[:5])})" if matched_skills else "")
                + f" with {sim_score:.0f}% semantic alignment and {exp_score:.0f}% experience fit."
            )

            recommendations_raw.append(
                {
                    "rank": 0,
                    "job_id": UUID(job_id_str),
                    "company_id": UUID(str(job["company_id"])),
                    "company_name": job.get("company_name"),
                    "job_title": job["job_title"],
                    "employment_type": job.get("employment_type"),
                    "work_mode": job.get("work_mode"),
                    "location": job.get("location") or None,
                    "overall_score": overall,
                    "semantic_similarity_score": sim_score,
                    "skill_match_score": skill_res["score"],
                    "experience_fit_score": exp_score,
                    "matched_skills": matched_skills,
                    "missing_skills": missing_skills,
                    "explanation": explanation,
                }
            )

        recommendations_raw.sort(
            key=lambda x: (
                -x["overall_score"],
                -x["skill_match_score"],
                -x["semantic_similarity_score"],
                str(x["job_id"]),
            )
        )
        for idx, item in enumerate(recommendations_raw, start=1):
            item["rank"] = idx

        top_recs = recommendations_raw[: int(request.limit)]

        serialized_recs = [
            {
                **r,
                "job_id": str(r["job_id"]),
                "company_id": str(r["company_id"]),
            }
            for r in top_recs
        ]
        existing_cache = (
            db.query(JobRecommendationsCache)
            .filter(
                JobRecommendationsCache.candidate_id == request.candidate_id,
                JobRecommendationsCache.company_id == request.company_id,
                JobRecommendationsCache.resume_version == resume_version,
                JobRecommendationsCache.jobs_state_hash == jobs_state_hash,
                JobRecommendationsCache.config_hash == config_hash,
            )
            .first()
        )
        expires_at = utc_now() + timedelta(hours=6)
        if not existing_cache:
            existing_cache = JobRecommendationsCache(
                candidate_id=request.candidate_id,
                company_id=request.company_id,
                resume_version=resume_version,
                jobs_state_hash=jobs_state_hash,
                config_hash=config_hash,
                recommendations=serialized_recs,
                expires_at=expires_at,
            )
            db.add(existing_cache)
        else:
            existing_cache.recommendations = serialized_recs
            existing_cache.expires_at = expires_at
        db.commit()

        return RecommendationResponse(
            success=True,
            candidate_id=request.candidate_id,
            resume_version=resume_version,
            cached=False,
            total_recommendations=len(top_recs),
            recommendations=[RecommendedJobItem(**r) for r in top_recs],
        )


recommendation_service = RecommendationService()
