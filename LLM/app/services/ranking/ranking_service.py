from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.matching import MatchEvaluation, MatchResult
from app.schemas.matching_schema import (
    EvidenceItemSchema,
    RankedCandidateItem,
    RankingRequest,
    RankingResponse,
)
from app.services.embeddings.embedding_service import embedding_service
from app.services.embeddings.vector_search import vector_search_service
from app.services.matching.matching_service import matching_service
from app.services.matching.scoring_service import scoring_service
from app.utils.version_utils import compute_config_version_hash, compute_job_version_hash

logger = get_logger(__name__)


class RankingService:
    """
    Reusable AI Candidate Ranking Engine.
    Reuses existing processed resume profiles, vector embeddings, and cached Gemini evaluations
    without making redundant Gemini API calls. Supports custom recruiter weight configurations
    and deterministic tie-breaking.
    """

    def rank_candidates_for_job(
        self,
        db: Session,
        *,
        request: RankingRequest,
    ) -> RankingResponse:
        job_data = matching_service.verify_job_ownership(
            db, job_id=request.job_id, company_id=request.company_id
        )
        job_version = compute_job_version_hash(job_data)
        scoring_config_version = compute_config_version_hash(
            {"weights": request.weights.model_dump()}
        )

        app_rows = matching_service._fetch_job_applications(
            db, job_id=request.job_id, company_id=request.company_id
        )
        if not app_rows:
            return RankingResponse(
                success=True,
                job_id=request.job_id,
                company_id=request.company_id,
                job_version=job_version,
                scoring_config_version=scoring_config_version,
                total_ranked=0,
                candidates=[],
            )

        job_emb_record, _, _ = embedding_service.ensure_job_embeddings(
            db, job_id=request.job_id, company_id=request.company_id, force_refresh=False
        )
        job_vector = list(job_emb_record.embedding)

        prepared_candidates: List[Dict[str, Any]] = []
        candidate_ids: List[UUID] = []
        for app_row in app_rows:
            cand_info = matching_service._ensure_candidate_ready(
                db, app_row=app_row, company_id=request.company_id
            )
            prepared_candidates.append(cand_info)
            candidate_ids.append(cand_info["candidate_id"])

        similarity_map: Dict[str, float] = {}
        if candidate_ids:
            vec_scores = vector_search_service.search_candidates_for_job(
                db,
                job_vector=job_vector,
                candidate_ids=candidate_ids,
                limit=max(len(candidate_ids), 100),
            )
            for cid, score in vec_scores.items():
                similarity_map[str(cid)] = float(score)

        ranked_dicts: List[Dict[str, Any]] = []
        for cand in prepared_candidates:
            app_id = cand["application_id"]
            resume_version = int(cand["resume_version"] or 1)

            cached_match = (
                db.query(MatchResult)
                .filter(
                    MatchResult.application_id == app_id,
                    MatchResult.resume_version == resume_version,
                    MatchResult.job_version == job_version,
                )
                .order_by(MatchResult.updated_at.desc())
                .first()
            )
            cached_eval: Optional[MatchEvaluation] = None
            if cached_match:
                cached_eval = (
                    db.query(MatchEvaluation)
                    .filter(MatchEvaluation.match_result_id == cached_match.id)
                    .first()
                )

            skill_res = scoring_service.compute_skill_score(
                candidate_skills=cand["normalized_skills"],
                required_skills=job_data.get("required_skills") or [],
                preferred_skills=job_data.get("preferred_skills") or [],
            )
            skill_score = float(cached_match.skill_score) if cached_match else skill_res["score"]
            exp_score = (
                float(cached_match.experience_score)
                if cached_match
                else scoring_service.compute_experience_score(
                    candidate_years=cand["total_experience_years"],
                    min_experience=job_data.get("min_experience"),
                    max_experience=job_data.get("max_experience"),
                )
            )
            proj_score = (
                float(cached_match.project_score)
                if cached_match
                else scoring_service.compute_project_score(
                    projects=cand["projects"],
                    experience_entries=cand["experience_entries"],
                    required_skills=job_data.get("required_skills") or [],
                    preferred_skills=job_data.get("preferred_skills") or [],
                )
            )
            sim_score = (
                float(cached_match.similarity_score)
                if cached_match
                else similarity_map.get(
                    str(cand["candidate_id"]), round((skill_res["score"] * 0.7) + 15.0, 2)
                )
            )
            llm_score = (
                float(cached_match.llm_score)
                if (cached_match and cached_match.llm_score is not None)
                else (
                    float(cached_eval.overall_compatibility_score)
                    if cached_eval
                    else None
                )
            )

            final_score = scoring_service.compute_final_weighted_score(
                skill_score=skill_score,
                experience_score=exp_score,
                similarity_score=sim_score,
                project_score=proj_score,
                llm_score=llm_score,
                weights=request.weights,
            )
            category = scoring_service.categorize_score(final_score)

            if cached_eval:
                matched_skills = cached_eval.matched_skills or skill_res["matched_skills"]
                missing_skills = cached_eval.missing_skills or skill_res["missing_skills"]
                strengths = cached_eval.strengths or []
                weaknesses = cached_eval.weaknesses or []
                evidence = [
                    EvidenceItemSchema(**ev) if isinstance(ev, dict) else ev
                    for ev in (cached_eval.evidence or [])
                ]
                explanation = cached_eval.summary_explanation or ""
                has_cached_eval = True
            else:
                fallback_eval = matching_service._build_deterministic_evaluation_fallback(
                    cand=cand,
                    job_data=job_data,
                    skill_score=skill_score,
                    experience_score=exp_score,
                    project_score=proj_score,
                    similarity_score=sim_score,
                    matched_skills=skill_res["matched_skills"],
                    missing_skills=skill_res["missing_skills"],
                )
                matched_skills = fallback_eval.matched_skills
                missing_skills = fallback_eval.missing_skills
                strengths = fallback_eval.strengths
                weaknesses = fallback_eval.weaknesses
                evidence = fallback_eval.evidence
                explanation = fallback_eval.summary_explanation
                has_cached_eval = False

            ranked_dicts.append(
                {
                    "rank": 0,
                    "application_id": app_id,
                    "candidate_id": cand["candidate_id"],
                    "candidate_name": cand.get("candidate_name"),
                    "candidate_email": cand.get("candidate_email"),
                    "resume_id": cand.get("resume_id"),
                    "resume_version": resume_version,
                    "application_status": cand.get("application_status"),
                    "overall_score": final_score,
                    "skill_score": skill_score,
                    "experience_score": exp_score,
                    "project_score": proj_score,
                    "similarity_score": sim_score,
                    "llm_score": llm_score,
                    "recommendation_category": category,
                    "matched_skills": matched_skills,
                    "missing_skills": missing_skills,
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "evidence": evidence,
                    "explanation": explanation,
                    "cached_evaluation": has_cached_eval,
                }
            )

        sorted_dicts = scoring_service.sort_and_rank_candidates(ranked_dicts)
        top_slice = sorted_dicts[: int(request.top_k)]

        return RankingResponse(
            success=True,
            job_id=request.job_id,
            company_id=request.company_id,
            job_version=job_version,
            scoring_config_version=scoring_config_version,
            total_ranked=len(sorted_dicts),
            candidates=[RankedCandidateItem(**item) for item in top_slice],
        )


ranking_service = RankingService()
