from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.ai_usage import AIJobLog
from app.models.candidate import AICandidateProfile
from app.models.matching import MatchEvaluation, MatchResult
from app.schemas.matching_schema import (
    EvidenceItemSchema,
    GeminiCandidateEvaluationSchema,
    MatchingProgressSchema,
    MatchingRequest,
    MatchingStatusResponse,
    RankedCandidateItem,
)
from app.services.embeddings.embedding_service import embedding_service
from app.services.embeddings.vector_search import vector_search_service
from app.services.gemini.gemini_client import (
    GeminiServiceError,
    TokenBudgetExceededError,
    gemini_client,
)
from app.services.gemini.prompt_manager import PromptManager
from app.services.matching.candidate_filter import candidate_filter_service
from app.services.matching.scoring_service import scoring_service
from app.services.resume.resume_processor import resume_processor
from app.utils.skill_normalizer import normalize_skill_list
from app.utils.version_utils import compute_config_version_hash, compute_job_version_hash

logger = get_logger(__name__)
settings = get_settings()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TenantAccessError(PermissionError):
    """Raised when company_id does not own the requested job_id."""


class MatchingService:
    """
    Asynchronous & synchronous AI Resume Matching Engine.
    Never sends all 500 resumes to Gemini; filters + vector-searches + shortlists top N first,
    caches evaluations by (application_id, resume_version, job_version, model_versions, config_version),
    and enforces strict multi-tenant scoping.
    """

    def verify_job_ownership(self, db: Session, *, job_id: UUID, company_id: UUID) -> Dict[str, Any]:
        row = (
            db.execute(
                text(
                    """
                    SELECT
                      id, company_id, job_title, department, job_description,
                      required_skills, preferred_skills, responsibilities,
                      min_experience, max_experience,
                      min_salary, max_salary,
                      employment_type, work_mode, status, content_hash,
                      city, state, country,
                      COALESCE(location, COALESCE(city, '') || CASE WHEN state IS NOT NULL AND state != '' THEN ', ' || state ELSE '' END) AS location
                    FROM public.jobs
                    WHERE id = :job_id
                    LIMIT 1
                    """
                ),
                {"job_id": str(job_id)},
            )
            .mappings()
            .first()
        )
        if not row:
            raise ValueError(f"Job {job_id} not found")
        if str(row["company_id"]) != str(company_id):
            raise TenantAccessError(
                f"Cross-company access denied: Job {job_id} does not belong to company {company_id}"
            )
        return dict(row)

    def create_matching_job_log(
        self,
        db: Session,
        *,
        request: MatchingRequest,
    ) -> AIJobLog:
        self.verify_job_ownership(db, job_id=request.job_id, company_id=request.company_id)

        job_log = AIJobLog(
            job_type="RESUME_MATCHING",
            status="QUEUED",
            company_id=request.company_id,
            job_id=request.job_id,
            requested_by=request.requested_by,
            config_snapshot={
                "top_k": request.top_k,
                "shortlist_size": request.shortlist_size or settings.DEFAULT_SHORTLIST_SIZE,
                "force_refresh": request.force_refresh,
                "filters": request.filters.model_dump(),
                "weights": request.weights.model_dump(),
            },
        )
        db.add(job_log)
        db.commit()
        db.refresh(job_log)
        return job_log

    def _fetch_job_applications(
        self,
        db: Session,
        *,
        job_id: UUID,
        company_id: UUID,
    ) -> List[Dict[str, Any]]:
        rows = (
            db.execute(
                text(
                    """
                    SELECT
                      a.id AS application_id,
                      a.candidate_id,
                      a.job_id,
                      a.company_id,
                      a.resume_id,
                      a.status AS application_status,
                      u.full_name AS candidate_name,
                      u.email AS candidate_email,
                      cr.version AS resume_version,
                      cr.resume_status,
                      cp_pub.headline AS public_headline,
                      cp_pub.bio AS public_summary,
                      cp_pub.skills AS public_skills,
                      cp_pub.years_of_experience AS public_experience_years,
                      cp_pub.location AS public_location,
                      cp_pub.expected_salary AS expected_salary
                    FROM public.applications a
                    JOIN public.users u ON u.id = a.candidate_id
                    LEFT JOIN public.candidate_resumes cr ON cr.id = a.resume_id
                    LEFT JOIN public.candidate_profiles cp_pub ON cp_pub.user_id = a.candidate_id
                    WHERE a.job_id = :job_id
                      AND a.company_id = :company_id
                      AND a.status NOT IN ('WITHDRAWN', 'REJECTED')
                    ORDER BY a.applied_at ASC
                    """
                ),
                {"job_id": str(job_id), "company_id": str(company_id)},
            )
            .mappings()
            .all()
        )
        return [dict(r) for r in rows]

    def _ensure_candidate_ready(
        self,
        db: Session,
        *,
        app_row: Dict[str, Any],
        company_id: UUID,
    ) -> Dict[str, Any]:
        """
        Ensures the candidate has an AI profile and active embedding.
        """
        candidate_id = UUID(str(app_row["candidate_id"]))
        resume_id = UUID(str(app_row["resume_id"])) if app_row.get("resume_id") else None
        resume_version = int(app_row.get("resume_version") or 1)

        ai_profile = (
            db.query(AICandidateProfile)
            .filter(AICandidateProfile.candidate_id == candidate_id)
            .order_by(AICandidateProfile.is_latest.desc(), AICandidateProfile.resume_version.desc())
            .first()
        )

        if not ai_profile and resume_id:
            try:
                resume_processor.process_resume(
                    db,
                    resume_id=resume_id,
                    candidate_id=candidate_id,
                    company_id=company_id,
                    force_reprocess=False,
                )
                ai_profile = (
                    db.query(AICandidateProfile)
                    .filter(AICandidateProfile.candidate_id == candidate_id)
                    .order_by(AICandidateProfile.is_latest.desc(), AICandidateProfile.resume_version.desc())
                    .first()
                )
            except Exception as exc:
                logger.warning(f"On-demand resume processing fallback for {resume_id}: {exc}")

        if ai_profile:
            resume_version = int(ai_profile.resume_version or resume_version)
            resume_id = ai_profile.resume_id or resume_id
            norm_skills = normalize_skill_list(
                (ai_profile.normalized_skills or []) + (app_row.get("public_skills") or [])
            )
            exp_years = float(
                ai_profile.total_experience_years
                if ai_profile.total_experience_years is not None
                else (app_row.get("public_experience_years") or 0.0)
            )
            location = ai_profile.location or app_row.get("public_location")
            summary = app_row.get("public_summary") or app_row.get("public_headline") or ""
            cleaned_text = ai_profile.cleaned_text or summary
            experience_entries = ai_profile.work_experience or []
            projects = ai_profile.projects or []
            education_entries = ai_profile.education or []

            # Ensure embeddings exist
            embedding_service.ensure_candidate_embeddings(
                db,
                ai_profile=ai_profile,
                company_id=company_id,
            )
        else:
            norm_skills = normalize_skill_list(app_row.get("public_skills") or [])
            exp_years = float(app_row.get("public_experience_years") or 0.0)
            location = app_row.get("public_location")
            summary = app_row.get("public_summary") or app_row.get("public_headline") or ""
            cleaned_text = (
                f"Candidate: {app_row.get('candidate_name') or ''}\n"
                f"Summary: {summary}\n"
                f"Skills: {', '.join(norm_skills)}\n"
                f"Experience: {exp_years} years"
            )
            experience_entries = []
            projects = []
            education_entries = []

        return {
            "application_id": UUID(str(app_row["application_id"])),
            "candidate_id": candidate_id,
            "candidate_name": app_row.get("candidate_name"),
            "candidate_email": app_row.get("candidate_email"),
            "application_status": app_row.get("application_status"),
            "resume_id": resume_id,
            "resume_version": resume_version,
            "normalized_skills": norm_skills,
            "total_experience_years": exp_years,
            "location": location,
            "expected_salary": app_row.get("expected_salary"),
            "professional_summary": summary,
            "cleaned_resume_text": cleaned_text,
            "work_experience": experience_entries,
            "experience_entries": experience_entries,
            "projects": projects,
            "education": education_entries,
            "education_entries": education_entries,
        }

    def _build_deterministic_evaluation_fallback(
        self,
        *,
        cand: Dict[str, Any],
        job_data: Dict[str, Any],
        skill_score: float,
        experience_score: float,
        project_score: float,
        similarity_score: float,
        matched_skills: List[str],
        missing_skills: List[str],
    ) -> GeminiCandidateEvaluationSchema:
        overall = round(
            (skill_score * 0.40)
            + (experience_score * 0.25)
            + (similarity_score * 0.20)
            + (project_score * 0.15),
            2,
        )
        category = scoring_service.categorize_score(overall)

        strengths: List[str] = []
        weaknesses: List[str] = []
        if matched_skills:
            strengths.append(f"Demonstrates required/preferred skills: {', '.join(matched_skills[:6])}")
        if cand.get("total_experience_years", 0) > 0:
            strengths.append(f"{cand['total_experience_years']:.1f} years of relevant professional experience")
        if cand.get("projects"):
            strengths.append(f"Has {len(cand['projects'])} documented technical project(s)")

        if missing_skills:
            weaknesses.append(f"Missing target skills: {', '.join(missing_skills[:5])}")
        min_exp = job_data.get("min_experience")
        if min_exp and float(cand.get("total_experience_years") or 0) < float(min_exp):
            weaknesses.append(
                f"Total experience ({float(cand.get('total_experience_years') or 0):.1f} yrs) is below job target ({float(min_exp):.1f} yrs)"
            )
        if not weaknesses:
            weaknesses.append("No major gaps identified against core job requirements")

        evidence: List[EvidenceItemSchema] = []
        resume_lines = [
            line.strip()
            for line in str(cand.get("cleaned_resume_text") or "").splitlines()
            if len(line.strip()) >= 15
        ]
        for skill in matched_skills[:3]:
            matching_line = next(
                (ln for ln in resume_lines if skill.lower() in ln.lower()),
                None,
            )
            if matching_line:
                evidence.append(
                    EvidenceItemSchema(
                        claim=f"Experience with {skill}",
                        resume_excerpt=matching_line[:240],
                        section="resume",
                    )
                )
        if not evidence and resume_lines:
            evidence.append(
                EvidenceItemSchema(
                    claim="Professional background summary",
                    resume_excerpt=resume_lines[0][:240],
                    section="summary",
                )
            )

        explanation = (
            f"{cand.get('candidate_name') or 'Candidate'} scored {overall:.1f}/100 for {job_data.get('job_title')}. "
            f"Matched {len(matched_skills)} target skill(s)"
            + (f" ({', '.join(matched_skills[:5])})" if matched_skills else "")
            + (f"; missing {', '.join(missing_skills[:4])}." if missing_skills else ".")
        )

        return GeminiCandidateEvaluationSchema(
            overall_compatibility_score=overall,
            skill_compatibility_score=skill_score,
            experience_compatibility_score=experience_score,
            project_relevance_score=project_score,
            strengths=strengths,
            weaknesses=weaknesses,
            missing_skills=missing_skills,
            matched_skills=matched_skills,
            evidence=evidence,
            recommendation_category=category,
            summary_explanation=explanation,
        )

    def execute_matching(
        self,
        db: Session,
        *,
        matching_id: UUID,
        request: MatchingRequest,
    ) -> MatchingStatusResponse:
        start_time = time.perf_counter()
        job_log = db.query(AIJobLog).filter(AIJobLog.id == matching_id).first()
        if not job_log:
            job_log = self.create_matching_job_log(db, request=request)
            matching_id = job_log.id

        try:
            job_log.status = "PROCESSING"
            job_log.started_at = utc_now()
            job_log.error_code = None
            job_log.error_message = None
            db.commit()

            # Step 1: Verify multi-tenant job ownership & fetch job
            job_data = self.verify_job_ownership(
                db, job_id=request.job_id, company_id=request.company_id
            )
            job_version = compute_job_version_hash(job_data)
            scoring_config_version = compute_config_version_hash(
                {
                    "weights": request.weights.model_dump(),
                    "filters": request.filters.model_dump(),
                }
            )

            # Step 2: Ensure job embedding exists
            job_emb_record, _, _ = embedding_service.ensure_job_embeddings(
                db,
                job_id=request.job_id,
                company_id=request.company_id,
                force_refresh=request.force_refresh,
            )
            job_vector = list(job_emb_record.embedding)

            # Step 3: Fetch active job applications (excluding WITHDRAWN / REJECTED)
            app_rows = self._fetch_job_applications(
                db, job_id=request.job_id, company_id=request.company_id
            )
            total_applications = len(app_rows)
            job_log.total_applications = total_applications
            db.commit()

            if total_applications == 0:
                duration_ms = int((time.perf_counter() - start_time) * 1000)
                job_log.status = "COMPLETED"
                job_log.completed_at = utc_now()
                job_log.duration_ms = duration_ms
                job_log.result_summary = {"top_candidates": []}
                db.commit()
                return self.get_matching_status(db, matching_id=matching_id, company_id=request.company_id)

            # Step 4: Prepare candidate data & apply hard/soft eligibility filters
            candidates_by_id: Dict[str, Dict[str, Any]] = {}
            eligible_candidate_ids: List[UUID] = []
            eligible_count = 0
            failed_count = 0

            for app_row in app_rows:
                try:
                    cand_info = self._ensure_candidate_ready(
                        db, app_row=app_row, company_id=request.company_id
                    )
                    filter_res = candidate_filter_service.evaluate_candidate(
                        candidate_data=cand_info,
                        job_data=job_data,
                        filter_config=request.filters,
                    )
                    cand_info["filter_result"] = filter_res
                    candidates_by_id[str(cand_info["candidate_id"])] = cand_info
                    if filter_res.eligible:
                        eligible_count += 1
                        eligible_candidate_ids.append(cand_info["candidate_id"])
                except Exception as exc:
                    failed_count += 1
                    logger.error(f"Failed preparing applicant {app_row.get('application_id')}: {exc}")

            job_log.eligible_candidates = eligible_count
            job_log.candidates_failed = failed_count
            db.commit()

            # Step 5: Vector similarity search via pgvector across eligible candidates
            similarity_map: Dict[str, float] = {}
            if eligible_candidate_ids:
                vec_scores = vector_search_service.search_candidates_for_job(
                    db,
                    job_vector=job_vector,
                    candidate_ids=eligible_candidate_ids,
                    limit=max(len(eligible_candidate_ids), 100),
                )
                for cid, score in vec_scores.items():
                    similarity_map[str(cid)] = float(score)

            job_log.candidates_retrieved = len(eligible_candidate_ids)
            db.commit()

            # Step 6: Compute deterministic pre-scores & shortlist top N candidates for Gemini
            shortlist_limit = min(
                int(request.shortlist_size or settings.DEFAULT_SHORTLIST_SIZE),
                int(settings.MAX_SHORTLIST_SIZE),
            )

            preliminary_list: List[Dict[str, Any]] = []
            for cand_id_str, cand in candidates_by_id.items():
                if not cand["filter_result"].eligible:
                    continue
                skill_res = scoring_service.compute_skill_score(
                    candidate_skills=cand["normalized_skills"],
                    required_skills=job_data.get("required_skills") or [],
                    preferred_skills=job_data.get("preferred_skills") or [],
                )
                exp_score = scoring_service.compute_experience_score(
                    candidate_years=cand["total_experience_years"],
                    min_experience=job_data.get("min_experience"),
                    max_experience=job_data.get("max_experience"),
                )
                proj_score = scoring_service.compute_project_score(
                    projects=cand["projects"],
                    experience_entries=cand["experience_entries"],
                    required_skills=job_data.get("required_skills") or [],
                    preferred_skills=job_data.get("preferred_skills") or [],
                )
                sim_score = similarity_map.get(cand_id_str, round((skill_res["score"] * 0.7) + 15.0, 2))

                prelim_score = (
                    (skill_res["score"] * 0.45)
                    + (sim_score * 0.30)
                    + (exp_score * 0.15)
                    + (proj_score * 0.10)
                )
                cand["skill_score"] = skill_res["score"]
                cand["matched_skills"] = skill_res["matched_skills"]
                cand["missing_skills"] = skill_res["missing_skills"]
                cand["experience_score"] = exp_score
                cand["project_score"] = proj_score
                cand["similarity_score"] = sim_score
                cand["prelim_score"] = round(prelim_score, 2)
                preliminary_list.append(cand)

            preliminary_list.sort(
                key=lambda x: (
                    -x["prelim_score"],
                    -x["skill_score"],
                    -x["experience_score"],
                    str(x["application_id"]),
                )
            )
            shortlisted_candidates = preliminary_list[:shortlist_limit]
            non_shortlisted_candidates = preliminary_list[shortlist_limit:]

            # Step 7: Evaluate shortlisted candidates (check cache first, then call Gemini)
            evaluated_count = 0
            completed_count = 0
            ranked_items_dicts: List[Dict[str, Any]] = []

            for idx, cand in enumerate(shortlisted_candidates + non_shortlisted_candidates):
                is_shortlisted = idx < len(shortlisted_candidates)
                app_id = cand["application_id"]
                resume_version = int(cand["resume_version"] or 1)

                cached_match: Optional[MatchResult] = None
                cached_eval: Optional[MatchEvaluation] = None
                used_cache = False

                if not request.force_refresh:
                    cached_match = (
                        db.query(MatchResult)
                        .filter(
                            MatchResult.application_id == app_id,
                            MatchResult.resume_version == resume_version,
                            MatchResult.job_version == job_version,
                            MatchResult.embedding_model_version == settings.GEMINI_EMBEDDING_MODEL,
                            MatchResult.evaluation_model_version == settings.GEMINI_GENERATION_MODEL,
                            MatchResult.scoring_config_version == scoring_config_version,
                        )
                        .first()
                    )
                    if cached_match:
                        cached_eval = (
                            db.query(MatchEvaluation)
                            .filter(MatchEvaluation.match_result_id == cached_match.id)
                            .first()
                        )
                        if cached_eval:
                            used_cache = True

                eval_schema: GeminiCandidateEvaluationSchema
                if used_cache and cached_eval:
                    evaluated_count += 1
                    eval_schema = GeminiCandidateEvaluationSchema(
                        overall_compatibility_score=float(cached_eval.overall_compatibility_score or 0),
                        skill_compatibility_score=float(cached_eval.skill_compatibility_score or 0),
                        experience_compatibility_score=float(cached_eval.experience_score or 0),
                        project_relevance_score=float(cached_eval.project_relevance_score or 0),
                        strengths=cached_eval.strengths or [],
                        weaknesses=cached_eval.weaknesses or [],
                        missing_skills=cached_eval.missing_skills or [],
                        matched_skills=cached_eval.matched_skills or [],
                        evidence=[
                            EvidenceItemSchema(**ev) if isinstance(ev, dict) else ev
                            for ev in (cached_eval.evidence or [])
                        ],
                        recommendation_category=cached_eval.recommendation_category or "CONSIDER",
                        summary_explanation=cached_eval.summary_explanation or "",
                    )
                elif is_shortlisted and gemini_client.is_configured:
                    try:
                        prompt = PromptManager.build_candidate_evaluation_prompt(
                            job_data=job_data,
                            candidate_data=cand,
                            relevant_excerpts=cand.get("cleaned_resume_text") or "",
                        )
                        eval_schema = gemini_client.generate_structured_json(
                            db,
                            prompt=prompt,
                            schema_cls=GeminiCandidateEvaluationSchema,
                            request_type="CANDIDATE_MATCH_EVALUATION",
                            company_id=request.company_id,
                            job_id=request.job_id,
                            candidate_id=cand["candidate_id"],
                        )
                        evaluated_count += 1
                    except (GeminiServiceError, TokenBudgetExceededError, Exception) as exc:
                        logger.warning(f"Gemini evaluation fallback for application {app_id}: {exc}")
                        eval_schema = self._build_deterministic_evaluation_fallback(
                            cand=cand,
                            job_data=job_data,
                            skill_score=cand["skill_score"],
                            experience_score=cand["experience_score"],
                            project_score=cand["project_score"],
                            similarity_score=cand["similarity_score"],
                            matched_skills=cand["matched_skills"],
                            missing_skills=cand["missing_skills"],
                        )
                        evaluated_count += 1
                else:
                    eval_schema = self._build_deterministic_evaluation_fallback(
                        cand=cand,
                        job_data=job_data,
                        skill_score=cand["skill_score"],
                        experience_score=cand["experience_score"],
                        project_score=cand["project_score"],
                        similarity_score=cand["similarity_score"],
                        matched_skills=cand["matched_skills"],
                        missing_skills=cand["missing_skills"],
                    )
                    if is_shortlisted:
                        evaluated_count += 1

                llm_score = float(eval_schema.overall_compatibility_score)
                final_score = scoring_service.compute_final_weighted_score(
                    skill_score=cand["skill_score"],
                    experience_score=cand["experience_score"],
                    similarity_score=cand["similarity_score"],
                    project_score=cand["project_score"],
                    llm_score=llm_score,
                    weights=request.weights,
                )
                category = scoring_service.categorize_score(final_score)

                match_record = (
                    db.query(MatchResult)
                    .filter(
                        MatchResult.application_id == app_id,
                        MatchResult.resume_version == resume_version,
                        MatchResult.job_version == job_version,
                        MatchResult.embedding_model_version == settings.GEMINI_EMBEDDING_MODEL,
                        MatchResult.evaluation_model_version == settings.GEMINI_GENERATION_MODEL,
                        MatchResult.scoring_config_version == scoring_config_version,
                    )
                    .first()
                )
                if not match_record:
                    match_record = MatchResult(
                        matching_run_id=matching_id,
                        application_id=app_id,
                        candidate_id=cand["candidate_id"],
                        job_id=request.job_id,
                        company_id=request.company_id,
                        resume_id=cand["resume_id"],
                        resume_version=resume_version,
                        job_version=job_version,
                        embedding_model_version=settings.GEMINI_EMBEDDING_MODEL,
                        evaluation_model_version=settings.GEMINI_GENERATION_MODEL,
                        scoring_config_version=scoring_config_version,
                    )
                    db.add(match_record)
                else:
                    match_record.matching_run_id = matching_id

                match_record.eligible = True
                match_record.filter_reasons = cand["filter_result"].reasons
                match_record.similarity_score = cand["similarity_score"]
                match_record.skill_score = cand["skill_score"]
                match_record.experience_score = cand["experience_score"]
                match_record.project_score = cand["project_score"]
                match_record.llm_score = llm_score
                match_record.final_score = final_score
                match_record.status = "COMPLETED"
                match_record.updated_at = utc_now()
                db.flush()

                eval_record = (
                    db.query(MatchEvaluation)
                    .filter(MatchEvaluation.match_result_id == match_record.id)
                    .first()
                )
                if not eval_record:
                    eval_record = MatchEvaluation(
                        match_result_id=match_record.id,
                        application_id=app_id,
                        candidate_id=cand["candidate_id"],
                        job_id=request.job_id,
                        company_id=request.company_id,
                        resume_version=resume_version,
                        job_version=job_version,
                        model_name=settings.GEMINI_GENERATION_MODEL,
                    )
                    db.add(eval_record)

                eval_record.overall_compatibility_score = eval_schema.overall_compatibility_score
                eval_record.skill_compatibility_score = eval_schema.skill_compatibility_score
                eval_record.experience_score = eval_schema.experience_compatibility_score
                eval_record.project_relevance_score = eval_schema.project_relevance_score
                eval_record.recommendation_category = category
                eval_record.strengths = eval_schema.strengths
                eval_record.weaknesses = eval_schema.weaknesses
                eval_record.missing_skills = eval_schema.missing_skills or cand["missing_skills"]
                eval_record.matched_skills = eval_schema.matched_skills or cand["matched_skills"]
                eval_record.evidence = [ev.model_dump() for ev in eval_schema.evidence]
                eval_record.summary_explanation = eval_schema.summary_explanation
                eval_record.updated_at = utc_now()

                completed_count += 1
                ranked_items_dicts.append(
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
                        "skill_score": cand["skill_score"],
                        "experience_score": cand["experience_score"],
                        "project_score": cand["project_score"],
                        "similarity_score": cand["similarity_score"],
                        "llm_score": llm_score,
                        "recommendation_category": category,
                        "matched_skills": eval_record.matched_skills,
                        "missing_skills": eval_record.missing_skills,
                        "strengths": eval_record.strengths,
                        "weaknesses": eval_record.weaknesses,
                        "evidence": eval_record.evidence,
                        "explanation": eval_record.summary_explanation,
                        "cached_evaluation": used_cache,
                        "_match_record": match_record,
                    }
                )

            sorted_candidates = scoring_service.sort_and_rank_candidates(ranked_items_dicts)
            for item in sorted_candidates:
                match_rec = item.pop("_match_record", None)
                if match_rec is not None:
                    match_rec.rank_position = item["rank"]

            top_k_items = sorted_candidates[: int(request.top_k)]

            duration_ms = int((time.perf_counter() - start_time) * 1000)
            job_log.candidates_evaluated = evaluated_count
            job_log.candidates_completed = completed_count
            job_log.candidates_failed = failed_count
            job_log.duration_ms = duration_ms
            job_log.completed_at = utc_now()
            job_log.result_summary = {
                "job_version": job_version,
                "scoring_config_version": scoring_config_version,
                "top_k": request.top_k,
                "top_candidates": [
                    {
                        **item,
                        "application_id": str(item["application_id"]),
                        "candidate_id": str(item["candidate_id"]),
                        "resume_id": str(item["resume_id"]) if item.get("resume_id") else None,
                    }
                    for item in top_k_items
                ],
            }
            db.flush()
            job_log.status = "COMPLETED"
            db.commit()

            return self.get_matching_status(
                db, matching_id=matching_id, company_id=request.company_id
            )

        except TenantAccessError:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Matching run {matching_id} failed: {exc}")
            err_log = db.query(AIJobLog).filter(AIJobLog.id == matching_id).first()
            if err_log:
                err_log.status = "FAILED"
                err_log.error_code = "MATCHING_EXECUTION_ERROR"
                err_log.error_message = str(exc)[:1000]
                err_log.duration_ms = duration_ms
                err_log.completed_at = utc_now()
                db.commit()
            raise

    def get_matching_status(
        self,
        db: Session,
        *,
        matching_id: UUID,
        company_id: Optional[UUID] = None,
    ) -> MatchingStatusResponse:
        job_log = db.query(AIJobLog).filter(AIJobLog.id == matching_id).first()
        if not job_log:
            raise ValueError(f"Matching job {matching_id} not found")
        if company_id and str(job_log.company_id) != str(company_id):
            raise TenantAccessError(
                f"Cross-company access denied for matching run {matching_id}"
            )

        summary = job_log.result_summary or {}
        raw_top = summary.get("top_candidates") or []
        top_candidates = [RankedCandidateItem(**item) for item in raw_top]

        return MatchingStatusResponse(
            success=job_log.status != "FAILED",
            matching_id=job_log.id,
            job_id=job_log.job_id,
            company_id=job_log.company_id,
            status=job_log.status,
            progress=MatchingProgressSchema(
                total_applications=int(job_log.total_applications or 0),
                eligible_candidates=int(job_log.eligible_candidates or 0),
                candidates_retrieved=int(job_log.candidates_retrieved or 0),
                candidates_evaluated=int(job_log.candidates_evaluated or 0),
                candidates_completed=int(job_log.candidates_completed or 0),
                candidates_failed=int(job_log.candidates_failed or 0),
            ),
            top_candidates=top_candidates,
            error_code=job_log.error_code,
            error_message=job_log.error_message,
            started_at=job_log.started_at,
            completed_at=job_log.completed_at,
            duration_ms=job_log.duration_ms,
        )


matching_service = MatchingService()
