import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.logging import logger
from app.models.candidate import AICandidateProfile
from app.models.embedding import CandidateEmbedding
from app.models.resume import ResumeProcessing
from app.services.resume.information_extractor import information_extractor
from app.services.resume.pdf_extractor import PDFExtractor, ResumeExtractionError, pdf_extractor
from app.services.resume.text_cleaner import clean_resume_text
from app.utils.version_utils import compute_sha256_bytes


class ResumeProcessorService:
    """
    End-to-end resume processing orchestrator:
    1. Fetches resume metadata and candidate structured tables from PostgreSQL (`public` schema).
    2. Computes SHA-256 content hash and checks `ai.resume_processing` for duplicate/unchanged versions.
    3. Extracts text via PyMuPDF / DOCX / OCR fallback (`pdf_extractor`).
    4. Cleans text and extracts structured candidate profile (`ai.candidate_profiles`).
    5. Generates and stores candidate embeddings (`ai.candidate_embeddings`) via `embedding_service`.
    6. Invalidates outdated embeddings for older resume versions of the same candidate.
    7. Updates `public.candidate_resumes.resume_status` and marks `ai.resume_processing` COMPLETED.
    """

    def __init__(self, extractor: PDFExtractor = pdf_extractor) -> None:
        self.extractor = extractor

    def _load_resume_row(self, db: Session, resume_id: UUID) -> Optional[Dict[str, Any]]:
        row = (
            db.execute(
                text(
                    """
                    SELECT
                      r.id,
                      r.candidate_id,
                      r.original_file_name,
                      r.storage_key,
                      r.file_type,
                      r.mime_type,
                      r.file_size,
                      r.version,
                      r.is_latest_version,
                      r.is_deleted,
                      r.resume_status,
                      u.full_name,
                      cp.location,
                      cp.city,
                      cp.state,
                      cp.country,
                      cp.years_of_experience,
                      cp.skills AS profile_skills
                    FROM public.candidate_resumes r
                    JOIN public.users u ON u.id = r.candidate_id
                    LEFT JOIN public.candidate_profiles cp ON cp.user_id = r.candidate_id
                    WHERE r.id = :resume_id
                    """
                ),
                {"resume_id": str(resume_id)},
            )
            .mappings()
            .first()
        )
        return dict(row) if row else None

    def _load_candidate_db_bundle(self, db: Session, candidate_id: UUID, base_row: Dict[str, Any]) -> Dict[str, Any]:
        skills_rows = (
            db.execute(
                text("SELECT skill_name FROM public.candidate_skills WHERE candidate_id = :cid"),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .all()
        )
        exp_rows = (
            db.execute(
                text(
                    """
                    SELECT job_title, company_name, start_date, end_date, currently_working, description, skills_used
                    FROM public.candidate_experience
                    WHERE candidate_id = :cid
                    ORDER BY start_date DESC NULLS LAST
                    """
                ),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .all()
        )
        edu_rows = (
            db.execute(
                text(
                    """
                    SELECT degree, field_of_study, institution_name, university_name, start_date, end_date
                    FROM public.candidate_education
                    WHERE candidate_id = :cid
                    """
                ),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .all()
        )
        proj_rows = (
            db.execute(
                text(
                    """
                    SELECT project_name, project_description, technologies_used
                    FROM public.candidate_projects
                    WHERE candidate_id = :cid
                    """
                ),
                {"cid": str(candidate_id)},
            )
            .mappings()
            .all()
        )

        combined_skills = list(base_row.get("profile_skills") or []) + [
            r["skill_name"] for r in skills_rows if r.get("skill_name")
        ]
        loc_parts = [
            base_row.get("city"),
            base_row.get("state"),
            base_row.get("country"),
        ]
        loc_str = ", ".join([p for p in loc_parts if p]) or base_row.get("location")

        return {
            "full_name": base_row.get("full_name"),
            "location": loc_str,
            "total_experience_years": (
                float(base_row["years_of_experience"])
                if base_row.get("years_of_experience") is not None
                else None
            ),
            "skills": combined_skills,
            "work_experience": [dict(r) for r in exp_rows],
            "education": [dict(r) for r in edu_rows],
            "projects": [dict(r) for r in proj_rows],
        }

    def _resolve_file_bytes(
        self,
        *,
        content_base64: Optional[str],
        storage_key: Optional[str],
    ) -> bytes:
        if content_base64:
            raw_b64 = content_base64.strip()
            if raw_b64.startswith("data:") and "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                return base64.b64decode(raw_b64)
            except Exception as exc:
                raise ResumeExtractionError(
                    f"Malformed base64 resume payload: {exc}", code="INVALID_BASE64"
                ) from exc

        if storage_key:
            settings = get_settings()
            root = Path(settings.RESUME_STORAGE_ROOT).resolve()
            clean_rel = storage_key.replace("\\", "/").lstrip("/")
            full_path = (root / clean_rel).resolve()
            if not str(full_path).startswith(str(root)):
                raise ResumeExtractionError(
                    "Invalid storage key path traversal rejected",
                    code="FORBIDDEN_STORAGE_KEY",
                )
            if full_path.exists():
                return full_path.read_bytes()

        raise ResumeExtractionError(
            "Resume binary not provided and not found on shared storage",
            code="RESUME_BINARY_NOT_FOUND",
        )

    def process_resume(
        self,
        db: Session,
        *,
        resume_id: UUID,
        candidate_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
        resume_version: Optional[int] = None,
        storage_key: Optional[str] = None,
        file_type: Optional[str] = None,
        content_base64: Optional[str] = None,
        force_reprocess: bool = False,
        task_id: Optional[str] = None,
        use_gemini_enrichment: bool = False,
    ) -> Dict[str, Any]:
        from app.services.embeddings.embedding_service import embedding_service

        resume_row = self._load_resume_row(db, resume_id)
        if not resume_row:
            raise ValueError(f"Resume {resume_id} not found in public.candidate_resumes")

        resolved_candidate_id = UUID(str(resume_row["candidate_id"]))
        resolved_version = int(resume_version or resume_row.get("version") or 1)
        resolved_storage_key = storage_key or resume_row.get("storage_key")
        resolved_file_type = (file_type or resume_row.get("file_type") or "PDF").upper()

        # Check if already COMPLETED for this exact version (or identical content hash)
        existing_proc = (
            db.query(ResumeProcessing)
            .filter(
                ResumeProcessing.resume_id == resume_id,
                ResumeProcessing.resume_version == resolved_version,
            )
            .first()
        )

        file_bytes: Optional[bytes] = None
        content_hash = existing_proc.content_hash if existing_proc else ""
        try:
            file_bytes = self._resolve_file_bytes(
                content_base64=content_base64,
                storage_key=resolved_storage_key,
            )
            content_hash = compute_sha256_bytes(file_bytes)
        except ResumeExtractionError as exc:
            if existing_proc and existing_proc.status == "COMPLETED" and not force_reprocess:
                return {
                    "resume_id": resume_id,
                    "candidate_id": resolved_candidate_id,
                    "resume_version": resolved_version,
                    "status": "COMPLETED",
                    "content_hash": existing_proc.content_hash,
                    "cached": True,
                }
            # Record failed processing row and commit cleanly
            proc = self._upsert_processing_row(
                db,
                existing_proc=existing_proc,
                resume_id=resume_id,
                candidate_id=resolved_candidate_id,
                resume_version=resolved_version,
                content_hash=content_hash or "invalid",
                storage_key=resolved_storage_key,
                file_type=resolved_file_type,
                file_size=0,
                status="FAILED",
                error_code=exc.code,
                error_message=str(exc),
                task_id=task_id,
                increment_retry=True,
            )
            db.commit()
            return {
                "resume_id": resume_id,
                "candidate_id": resolved_candidate_id,
                "resume_version": resolved_version,
                "status": "FAILED",
                "content_hash": proc.content_hash,
                "cached": False,
                "error_code": exc.code,
                "error_message": str(exc),
            }

        # Idempotency & version check: if already COMPLETED with the same content_hash, reuse!
        if (
            not force_reprocess
            and existing_proc
            and existing_proc.status == "COMPLETED"
            and existing_proc.content_hash == content_hash
        ):
            return {
                "resume_id": resume_id,
                "candidate_id": resolved_candidate_id,
                "resume_version": resolved_version,
                "status": "COMPLETED",
                "content_hash": content_hash,
                "cached": True,
            }

        # Also check if another version of this candidate's resume has the exact same content_hash
        same_hash_profile = (
            db.query(AICandidateProfile)
            .filter(
                AICandidateProfile.candidate_id == resolved_candidate_id,
                AICandidateProfile.content_hash == content_hash,
            )
            .first()
        )
        if same_hash_profile and not force_reprocess and existing_proc and existing_proc.status == "COMPLETED":
            return {
                "resume_id": resume_id,
                "candidate_id": resolved_candidate_id,
                "resume_version": resolved_version,
                "status": "COMPLETED",
                "content_hash": content_hash,
                "cached": True,
            }

        proc = self._upsert_processing_row(
            db,
            existing_proc=existing_proc,
            resume_id=resume_id,
            candidate_id=resolved_candidate_id,
            resume_version=resolved_version,
            content_hash=content_hash,
            storage_key=resolved_storage_key,
            file_type=resolved_file_type,
            file_size=len(file_bytes),
            status="PROCESSING",
            error_code=None,
            error_message=None,
            task_id=task_id,
            increment_retry=bool(existing_proc and existing_proc.status == "FAILED"),
        )
        db.flush()

        try:
            extraction = self.extractor.extract_from_bytes(file_bytes, file_type=resolved_file_type)
            cleaned_text = clean_resume_text(extraction.text)
            if not cleaned_text:
                raise ResumeExtractionError(
                    "Resume text empty after normalization", code="EMPTY_CLEANED_TEXT"
                )

            db_bundle = self._load_candidate_db_bundle(db, resolved_candidate_id, resume_row)
            structured = information_extractor.extract_structured_profile(
                db,
                cleaned_text=cleaned_text,
                db_candidate_bundle=db_bundle,
                company_id=company_id,
                candidate_id=resolved_candidate_id,
                use_gemini_enrichment=use_gemini_enrichment,
            )

            # Mark prior AICandidateProfile rows for this candidate as is_latest = False
            db.query(AICandidateProfile).filter(
                AICandidateProfile.candidate_id == resolved_candidate_id,
                AICandidateProfile.is_latest.is_(True),
            ).update({"is_latest": False}, synchronize_session=False)

            ai_profile = (
                db.query(AICandidateProfile)
                .filter(
                    AICandidateProfile.resume_id == resume_id,
                    AICandidateProfile.resume_version == resolved_version,
                )
                .first()
            )
            if not ai_profile:
                ai_profile = AICandidateProfile(
                    candidate_id=resolved_candidate_id,
                    resume_id=resume_id,
                    resume_version=resolved_version,
                    content_hash=content_hash,
                )
                db.add(ai_profile)

            ai_profile.content_hash = content_hash
            ai_profile.is_latest = True
            ai_profile.full_name = structured.full_name
            ai_profile.location = structured.location
            ai_profile.total_experience_years = structured.total_experience_years
            ai_profile.extracted_text = extraction.text
            ai_profile.cleaned_text = cleaned_text
            ai_profile.technical_skills = structured.skills
            ai_profile.normalized_skills = structured.normalized_skills
            ai_profile.work_experience = [w.model_dump() for w in structured.work_experience]
            ai_profile.education = [e.model_dump() for e in structured.education]
            ai_profile.projects = [p.model_dump() for p in structured.projects]
            ai_profile.certifications = [c.model_dump() for c in structured.certifications]
            ai_profile.languages = structured.languages
            ai_profile.extraction_evidence = structured.extraction_evidence
            ai_profile.extraction_source = "GEMINI_ENRICHED" if use_gemini_enrichment else "HYBRID"
            ai_profile.updated_at = datetime.now(timezone.utc)
            db.flush()

            # Generate / reuse candidate embeddings and deactivate older resume_version embeddings
            embedding_service.ensure_candidate_embeddings(
                db,
                ai_profile=ai_profile,
                company_id=company_id,
            )

            # Update public.candidate_resumes status to TEXT_EXTRACTED
            db.execute(
                text(
                    """
                    UPDATE public.candidate_resumes
                    SET resume_status = 'TEXT_EXTRACTED',
                        extracted_char_count = :char_count,
                        updated_at = NOW()
                    WHERE id = :resume_id
                    """
                ),
                {"char_count": len(cleaned_text), "resume_id": str(resume_id)},
            )

            proc.page_count = extraction.page_count
            proc.is_scanned = extraction.is_scanned
            proc.ocr_used = extraction.ocr_used
            proc.status = "COMPLETED"
            proc.error_code = None
            proc.error_message = None
            proc.completed_at = datetime.now(timezone.utc)
            proc.updated_at = datetime.now(timezone.utc)

            # Commit transaction BEFORE returning COMPLETED status
            db.commit()

            return {
                "resume_id": resume_id,
                "candidate_id": resolved_candidate_id,
                "resume_version": resolved_version,
                "status": "COMPLETED",
                "content_hash": content_hash,
                "cached": False,
            }

        except ResumeExtractionError as exc:
            db.rollback()
            proc = self._upsert_processing_row(
                db,
                existing_proc=existing_proc,
                resume_id=resume_id,
                candidate_id=resolved_candidate_id,
                resume_version=resolved_version,
                content_hash=content_hash,
                storage_key=resolved_storage_key,
                file_type=resolved_file_type,
                file_size=len(file_bytes or b""),
                status="FAILED",
                error_code=exc.code,
                error_message=str(exc),
                task_id=task_id,
                increment_retry=True,
            )
            db.execute(
                text(
                    "UPDATE public.candidate_resumes SET resume_status = 'FAILED', updated_at = NOW() WHERE id = :id"
                ),
                {"id": str(resume_id)},
            )
            db.commit()
            return {
                "resume_id": resume_id,
                "candidate_id": resolved_candidate_id,
                "resume_version": resolved_version,
                "status": "FAILED",
                "content_hash": content_hash,
                "cached": False,
                "error_code": exc.code,
                "error_message": str(exc),
            }
        except Exception as exc:
            db.rollback()
            logger.exception("Unexpected error processing resume %s: %s", resume_id, exc)
            proc = self._upsert_processing_row(
                db,
                existing_proc=existing_proc,
                resume_id=resume_id,
                candidate_id=resolved_candidate_id,
                resume_version=resolved_version,
                content_hash=content_hash or "error",
                storage_key=resolved_storage_key,
                file_type=resolved_file_type,
                file_size=len(file_bytes or b""),
                status="FAILED",
                error_code="PROCESSING_ERROR",
                error_message=str(exc)[:1000],
                task_id=task_id,
                increment_retry=True,
            )
            db.commit()
            raise

    @staticmethod
    def _upsert_processing_row(
        db: Session,
        *,
        existing_proc: Optional[ResumeProcessing],
        resume_id: UUID,
        candidate_id: UUID,
        resume_version: int,
        content_hash: str,
        storage_key: Optional[str],
        file_type: str,
        file_size: int,
        status: str,
        error_code: Optional[str],
        error_message: Optional[str],
        task_id: Optional[str],
        increment_retry: bool = False,
    ) -> ResumeProcessing:
        now = datetime.now(timezone.utc)
        proc = existing_proc
        if proc is None:
            proc = (
                db.query(ResumeProcessing)
                .filter(
                    ResumeProcessing.resume_id == resume_id,
                    ResumeProcessing.resume_version == resume_version,
                )
                .first()
            )
        if proc is None:
            proc = ResumeProcessing(
                resume_id=resume_id,
                candidate_id=candidate_id,
                resume_version=resume_version,
                content_hash=content_hash,
                storage_key=storage_key,
                file_type=file_type,
                file_size=file_size,
                status=status,
                retry_count=1 if increment_retry else 0,
                error_code=error_code,
                error_message=error_message,
                task_id=task_id,
                started_at=now if status == "PROCESSING" else None,
            )
            db.add(proc)
        else:
            proc.content_hash = content_hash
            proc.storage_key = storage_key
            proc.file_type = file_type
            proc.file_size = file_size
            proc.status = status
            if increment_retry:
                proc.retry_count = (proc.retry_count or 0) + 1
            proc.error_code = error_code
            proc.error_message = error_message
            if task_id:
                proc.task_id = task_id
            if status == "PROCESSING":
                proc.started_at = now
            proc.updated_at = now
        return proc

    def get_resume_status(self, db: Session, resume_id: UUID) -> Optional[Dict[str, Any]]:
        proc = (
            db.query(ResumeProcessing)
            .filter(ResumeProcessing.resume_id == resume_id)
            .order_by(ResumeProcessing.resume_version.desc())
            .first()
        )
        if not proc:
            return None

        profile = (
            db.query(AICandidateProfile)
            .filter(
                AICandidateProfile.resume_id == proc.resume_id,
                AICandidateProfile.resume_version == proc.resume_version,
            )
            .first()
        )

        return {
            "resume_id": proc.resume_id,
            "candidate_id": proc.candidate_id,
            "resume_version": proc.resume_version,
            "status": proc.status,
            "content_hash": proc.content_hash,
            "page_count": proc.page_count,
            "is_scanned": proc.is_scanned,
            "ocr_used": proc.ocr_used,
            "retry_count": proc.retry_count,
            "error_code": proc.error_code,
            "error_message": proc.error_message,
            "started_at": proc.started_at,
            "completed_at": proc.completed_at,
            "extracted_profile": (
                {
                    "full_name": profile.full_name,
                    "location": profile.location,
                    "total_experience_years": (
                        float(profile.total_experience_years)
                        if profile.total_experience_years is not None
                        else None
                    ),
                    "normalized_skills": profile.normalized_skills,
                    "work_experience": profile.work_experience,
                    "education": profile.education,
                    "projects": profile.projects,
                }
                if profile
                else None
            ),
        }


resume_processor = ResumeProcessorService()
resume_processor_service = resume_processor

