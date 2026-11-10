from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.candidate import AICandidateProfile
from app.models.embedding import CandidateEmbedding, JobEmbedding
from app.services.gemini.gemini_client import gemini_client
from app.services.gemini.usage_tracker import UsageTracker
from app.utils.skill_normalizer import default_skill_normalizer
from app.utils.version_utils import compute_job_version_hash, compute_sha256_text


class EmbeddingService:
    """
    Manages candidate and job vector embeddings with strict version tracking,
    source-text hash deduplication, and multi-type support:
    - Candidate embedding types: FULL_PROFILE, SKILLS, EXPERIENCE, PROJECTS
    - Job embedding types: FULL_JOB, DESCRIPTION, REQUIREMENTS
    Never regenerates unchanged embeddings.
    """

    @staticmethod
    def build_candidate_texts(ai_profile: AICandidateProfile) -> Dict[str, str]:
        skills_str = ", ".join(ai_profile.normalized_skills or [])
        exp_parts = []
        for exp in ai_profile.work_experience or []:
            if isinstance(exp, dict):
                title = exp.get("job_title") or ""
                comp = exp.get("company_name") or ""
                desc = exp.get("description") or ""
                exp_parts.append(f"{title} at {comp}. {desc}".strip())
        exp_str = "\n".join(exp_parts)

        proj_parts = []
        for p in ai_profile.projects or []:
            if isinstance(p, dict):
                name = p.get("name") or ""
                desc = p.get("description") or ""
                techs = ", ".join(p.get("technologies") or [])
                proj_parts.append(f"{name}: {desc} ({techs})".strip())
        proj_str = "\n".join(proj_parts)

        full_text = (
            f"Candidate Profile | Experience: {ai_profile.total_experience_years or 0} years | "
            f"Skills: {skills_str}\n"
            f"Work Experience:\n{exp_str}\n"
            f"Projects:\n{proj_str}\n"
            f"Resume Summary:\n{(ai_profile.cleaned_text or '')[:3500]}"
        ).strip()

        return {
            "FULL_PROFILE": full_text,
            "SKILLS": f"Technical Skills: {skills_str}" if skills_str else full_text[:800],
        }

    def ensure_candidate_embeddings(
        self,
        db: Session,
        *,
        ai_profile: AICandidateProfile,
        company_id: Optional[UUID] = None,
        embedding_types: Optional[List[str]] = None,
    ) -> Dict[str, CandidateEmbedding]:
        settings = get_settings()
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dim = settings.EMBEDDING_DIMENSION
        target_types = embedding_types or ["FULL_PROFILE", "SKILLS"]

        texts_by_type = self.build_candidate_texts(ai_profile)

        # Deactivate older resume versions' embeddings for this candidate only
        db.query(CandidateEmbedding).filter(
            CandidateEmbedding.candidate_id == ai_profile.candidate_id,
            CandidateEmbedding.resume_version != ai_profile.resume_version,
            CandidateEmbedding.is_active.is_(True),
        ).update({"is_active": False}, synchronize_session=False)

        results: Dict[str, CandidateEmbedding] = {}
        missing_types: List[str] = []
        missing_texts: List[str] = []
        missing_hashes: List[str] = []

        for emb_type in target_types:
            raw_text = texts_by_type.get(emb_type) or texts_by_type["FULL_PROFILE"]
            src_hash = compute_sha256_text(raw_text)

            existing = (
                db.query(CandidateEmbedding)
                .filter(
                    CandidateEmbedding.candidate_id == ai_profile.candidate_id,
                    CandidateEmbedding.resume_version == ai_profile.resume_version,
                    CandidateEmbedding.embedding_type == emb_type,
                    CandidateEmbedding.model_name == model_name,
                )
                .first()
            )
            if existing and existing.source_text_hash == src_hash:
                existing.is_active = True
                results[emb_type] = existing
                UsageTracker.record_usage(
                    db,
                    request_type="EMBEDDING",
                    model_name=model_name,
                    input_tokens=0,
                    output_tokens=0,
                    company_id=company_id,
                    candidate_id=ai_profile.candidate_id,
                    cached_hit=True,
                )
                continue

            # Check if an earlier resume version of the same candidate already computed this exact source_text_hash
            cached_other_ver = (
                db.query(CandidateEmbedding)
                .filter(
                    CandidateEmbedding.candidate_id == ai_profile.candidate_id,
                    CandidateEmbedding.embedding_type == emb_type,
                    CandidateEmbedding.model_name == model_name,
                    CandidateEmbedding.source_text_hash == src_hash,
                )
                .first()
            )
            if cached_other_ver is not None:
                if existing is None:
                    existing = CandidateEmbedding(
                        candidate_id=ai_profile.candidate_id,
                        resume_id=ai_profile.resume_id,
                        resume_version=ai_profile.resume_version,
                        content_hash=ai_profile.content_hash,
                        embedding_type=emb_type,
                        model_name=model_name,
                        dimension=dim,
                        embedding=list(cached_other_ver.embedding),
                        source_text_hash=src_hash,
                        is_active=True,
                    )
                    db.add(existing)
                else:
                    existing.embedding = list(cached_other_ver.embedding)
                    existing.source_text_hash = src_hash
                    existing.content_hash = ai_profile.content_hash
                    existing.is_active = True
                    existing.updated_at = datetime.now(timezone.utc)
                results[emb_type] = existing
                continue

            missing_types.append(emb_type)
            missing_texts.append(raw_text)
            missing_hashes.append(src_hash)

        if missing_texts:
            vectors = gemini_client.generate_embeddings(
                db,
                missing_texts,
                company_id=company_id,
                candidate_id=ai_profile.candidate_id,
            )
            for emb_type, vec, src_hash in zip(missing_types, vectors, missing_hashes):
                existing = (
                    db.query(CandidateEmbedding)
                    .filter(
                        CandidateEmbedding.candidate_id == ai_profile.candidate_id,
                        CandidateEmbedding.resume_version == ai_profile.resume_version,
                        CandidateEmbedding.embedding_type == emb_type,
                        CandidateEmbedding.model_name == model_name,
                    )
                    .first()
                )
                if existing is None:
                    existing = CandidateEmbedding(
                        candidate_id=ai_profile.candidate_id,
                        resume_id=ai_profile.resume_id,
                        resume_version=ai_profile.resume_version,
                        content_hash=ai_profile.content_hash,
                        embedding_type=emb_type,
                        model_name=model_name,
                        dimension=dim,
                        embedding=vec,
                        source_text_hash=src_hash,
                        is_active=True,
                    )
                    db.add(existing)
                else:
                    existing.embedding = vec
                    existing.source_text_hash = src_hash
                    existing.content_hash = ai_profile.content_hash
                    existing.dimension = dim
                    existing.is_active = True
                    existing.updated_at = datetime.now(timezone.utc)
                results[emb_type] = existing

        db.flush()
        return results

    @staticmethod
    def load_job_row(db: Session, job_id: UUID) -> Optional[Dict[str, Any]]:
        row = (
            db.execute(
                text(
                    """
                    SELECT
                      j.id,
                      j.company_id,
                      j.job_title,
                      j.department,
                      j.job_category,
                      j.job_description,
                      j.job_summary,
                      j.employment_type,
                      j.work_mode,
                      j.experience_required,
                      j.min_experience,
                      j.max_experience,
                      j.min_salary,
                      j.max_salary,
                      j.salary_currency,
                      j.country,
                      j.state,
                      j.city,
                      j.location,
                      j.required_skills,
                      j.preferred_skills,
                      j.responsibilities,
                      j.status,
                      j.content_hash,
                      c.name AS company_name,
                      c.status AS company_status
                    FROM public.jobs j
                    JOIN public.companies c ON c.id = j.company_id
                    WHERE j.id = :job_id
                    """
                ),
                {"job_id": str(job_id)},
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def ensure_job_embeddings(
        self,
        db: Session,
        *,
        job_id: UUID,
        company_id: Optional[UUID] = None,
        force_refresh: bool = False,
    ) -> Tuple[JobEmbedding, Dict[str, Any], bool]:
        settings = get_settings()
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dim = settings.EMBEDDING_DIMENSION

        job_row = self.load_job_row(db, job_id)
        if not job_row:
            raise ValueError(f"Job {job_id} not found in public.jobs")

        actual_company_id = UUID(str(job_row["company_id"]))
        if company_id and actual_company_id != company_id:
            raise PermissionError("Cross-company job access denied")

        job_version = compute_job_version_hash(job_row)
        norm_req_skills = default_skill_normalizer.normalize_many(
            list(job_row.get("required_skills") or [])
            + default_skill_normalizer.extract_known_skills_from_text(
                f"{job_row.get('job_title', '')} {job_row.get('job_description', '')}"
            )
        )

        # Deactivate older job_version embeddings for this job ONLY
        db.query(JobEmbedding).filter(
            JobEmbedding.job_id == job_id,
            JobEmbedding.job_version != job_version,
            JobEmbedding.is_active.is_(True),
        ).update({"is_active": False}, synchronize_session=False)

        existing = (
            db.query(JobEmbedding)
            .filter(
                JobEmbedding.job_id == job_id,
                JobEmbedding.job_version == job_version,
                JobEmbedding.embedding_type == "FULL_JOB",
                JobEmbedding.model_name == model_name,
            )
            .first()
        )

        if existing and not force_refresh:
            existing.is_active = True
            return existing, job_row, True

        req_skills_str = ", ".join(norm_req_skills)
        pref_skills_str = ", ".join(
            default_skill_normalizer.normalize_many(job_row.get("preferred_skills") or [])
        )
        responsibilities_str = "\n".join(job_row.get("responsibilities") or [])

        full_job_text = (
            f"Job Title: {job_row.get('job_title')}\n"
            f"Required Skills: {req_skills_str}\n"
            f"Preferred Skills: {pref_skills_str}\n"
            f"Experience Range: {job_row.get('min_experience') or 0} to {job_row.get('max_experience') or 'any'} years\n"
            f"Description:\n{(job_row.get('job_description') or '')[:3500]}\n"
            f"Responsibilities:\n{responsibilities_str[:1500]}"
        ).strip()

        vectors = gemini_client.generate_embeddings(
            db,
            [full_job_text],
            company_id=actual_company_id,
            job_id=job_id,
        )
        vec = vectors[0]

        if existing is None:
            existing = JobEmbedding(
                job_id=job_id,
                company_id=actual_company_id,
                job_version=job_version,
                embedding_type="FULL_JOB",
                model_name=model_name,
                dimension=dim,
                embedding=vec,
                normalized_skills=norm_req_skills,
                is_active=True,
            )
            db.add(existing)
        else:
            existing.embedding = vec
            existing.dimension = dim
            existing.normalized_skills = norm_req_skills
            existing.is_active = True
            existing.updated_at = datetime.now(timezone.utc)

        db.flush()
        return existing, job_row, False


embedding_service = EmbeddingService()
