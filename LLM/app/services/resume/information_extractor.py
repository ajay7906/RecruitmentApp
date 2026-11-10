import re
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.schemas.candidate_schema import (
    ExtractedCertification,
    ExtractedEducation,
    ExtractedProject,
    ExtractedWorkExperience,
    StructuredCandidateProfileSchema,
)
from app.services.gemini.gemini_client import gemini_client
from app.services.gemini.prompt_manager import PromptManager
from app.utils.skill_normalizer import default_skill_normalizer


DEGREE_PATTERNS = [
    r"\b(?:B\.?\s*Tech|B\.?\s*E\.?|Bachelor of Technology|Bachelor of Engineering|B\.?\s*Sc|BCA|M\.?\s*Tech|M\.?\s*S\.?|Master of Science|MCA|MBA|Ph\.?\s*D)\b[^\n]*"
]

EXPERIENCE_YEARS_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)?",
    re.IGNORECASE,
)


class InformationExtractor:
    """
    Extracts structured candidate information from cleaned resume text and existing
    candidate profile tables:
    1. Performs fast deterministic Python extraction for skills, experience years,
       degrees, projects, certifications, and evidence snippets.
    2. Optionally enriches via Gemini structured JSON extraction when configured.
    3. Validates all output through `StructuredCandidateProfileSchema` without
       ever fabricating missing fields.
    """

    def extract_structured_profile(
        self,
        db: Session,
        *,
        cleaned_text: str,
        db_candidate_bundle: Optional[Dict[str, Any]] = None,
        company_id: Optional[UUID] = None,
        candidate_id: Optional[UUID] = None,
        use_gemini_enrichment: bool = False,
    ) -> StructuredCandidateProfileSchema:
        det = self._deterministic_extract(cleaned_text, db_candidate_bundle or {})

        if use_gemini_enrichment and len(cleaned_text) >= 40:
            try:
                prompt = PromptManager.build_resume_extraction_prompt(cleaned_text)
                llm_profile = gemini_client.generate_structured_json(
                    db,
                    prompt=prompt,
                    schema_cls=StructuredCandidateProfileSchema,
                    request_type="RESUME_EXTRACTION",
                    company_id=company_id,
                    candidate_id=candidate_id,
                )
                merged_skills = default_skill_normalizer.normalize_many(
                    list(det.skills) + list(llm_profile.skills)
                )
                llm_profile.skills = merged_skills
                llm_profile.normalized_skills = merged_skills
                if llm_profile.total_experience_years is None:
                    llm_profile.total_experience_years = det.total_experience_years
                if not llm_profile.full_name:
                    llm_profile.full_name = det.full_name
                if not llm_profile.location:
                    llm_profile.location = det.location
                if not llm_profile.work_experience and det.work_experience:
                    llm_profile.work_experience = det.work_experience
                if not llm_profile.education and det.education:
                    llm_profile.education = det.education
                if not llm_profile.projects and det.projects:
                    llm_profile.projects = det.projects
                return llm_profile
            except Exception as exc:
                logger.warning(
                    "Gemini resume enrichment skipped/failed; using deterministic extraction: %s",
                    exc,
                )

        return det

    def _deterministic_extract(
        self, text: str, bundle: Dict[str, Any]
    ) -> StructuredCandidateProfileSchema:
        lines = [ln.strip() for ln in (text or "").split("\n") if ln.strip()]
        evidence: Dict[str, str] = {}

        # 1. Full Name
        full_name = bundle.get("full_name")
        if not full_name and lines:
            first_line = lines[0]
            if (
                2 <= len(first_line.split()) <= 5
                and len(first_line) <= 60
                and not any(ch.isdigit() for ch in first_line)
                and "@" not in first_line
            ):
                full_name = first_line
                evidence["full_name"] = first_line

        # 2. Location
        location = bundle.get("location")
        if not location:
            loc_match = re.search(
                r"(?:Location|Address|Based in)\s*[:\-]\s*([A-Za-z ,\-]+)",
                text,
                re.IGNORECASE,
            )
            if loc_match:
                location = loc_match.group(1).strip()
                evidence["location"] = loc_match.group(0).strip()

        # 3. Skills (combine structured DB skills + deterministic text scan)
        db_skills = bundle.get("skills") or []
        text_skills = default_skill_normalizer.extract_known_skills_from_text(text)
        explicit_skills_match = re.search(
            r"(?:Technical\s+Skills|Skills|Core\s+Competencies|Technologies)\s*[:\-]?\s*([^\n]+)",
            text,
            re.IGNORECASE,
        )
        raw_skill_tokens: List[str] = list(db_skills) + list(text_skills)
        if explicit_skills_match:
            skill_line = explicit_skills_match.group(1)
            evidence["skills"] = explicit_skills_match.group(0).strip()[:300]
            parts = [p.strip() for p in re.split(r"[,|•;/]", skill_line) if p.strip()]
            raw_skill_tokens.extend(parts[:30])

        normalized_skills = default_skill_normalizer.normalize_many(raw_skill_tokens)
        if normalized_skills and "skills" not in evidence:
            evidence["skills"] = f"Detected skills in resume: {', '.join(normalized_skills[:12])}"

        # 4. Total Experience Years
        total_exp: Optional[float] = bundle.get("total_experience_years")
        exp_match = EXPERIENCE_YEARS_PATTERN.search(text)
        if exp_match:
            try:
                parsed_exp = float(exp_match.group(1))
                if 0 <= parsed_exp <= 50:
                    total_exp = max(total_exp or 0.0, parsed_exp)
                    evidence["experience"] = exp_match.group(0).strip()
            except ValueError:
                pass

        # 5. Work Experience
        work_items: List[ExtractedWorkExperience] = []
        for exp in bundle.get("work_experience") or []:
            work_items.append(
                ExtractedWorkExperience(
                    job_title=exp.get("job_title"),
                    company_name=exp.get("company_name"),
                    start_date=str(exp.get("start_date")) if exp.get("start_date") else None,
                    end_date=str(exp.get("end_date")) if exp.get("end_date") else None,
                    currently_working=bool(exp.get("currently_working", False)),
                    description=exp.get("description"),
                    technologies=default_skill_normalizer.normalize_many(
                        exp.get("skills_used") or []
                    ),
                    evidence_snippet=f"{exp.get('job_title', '')} at {exp.get('company_name', '')}".strip(),
                )
            )

        if not work_items:
            role_matches = re.finditer(
                r"(?P<title>(?:Senior|Lead|Principal|Staff|Junior|Associate|Full\s*Stack|Backend|Frontend|Software|Data|DevOps|Cloud|ML|AI)\s+[A-Za-z /]+?(?:Engineer|Developer|Architect|Scientist|Analyst))\s+(?:at|@|-|,)\s+(?P<company>[A-Z][A-Za-z0-9 &.,\-]{1,50})",
                text,
            )
            for m in list(role_matches)[:6]:
                snippet = m.group(0).strip()
                work_items.append(
                    ExtractedWorkExperience(
                        job_title=m.group("title").strip(),
                        company_name=m.group("company").strip(),
                        evidence_snippet=snippet,
                    )
                )

        # 6. Education
        edu_items: List[ExtractedEducation] = []
        for edu in bundle.get("education") or []:
            edu_items.append(
                ExtractedEducation(
                    degree=edu.get("degree"),
                    field_of_study=edu.get("field_of_study"),
                    university=edu.get("university_name") or edu.get("institution_name"),
                    evidence_snippet=f"{edu.get('degree', '')} in {edu.get('field_of_study', '')}".strip(),
                )
            )
        if not edu_items:
            for pat in DEGREE_PATTERNS:
                for m in re.finditer(pat, text, re.IGNORECASE):
                    line = m.group(0).strip()
                    edu_items.append(
                        ExtractedEducation(
                            degree=line[:120],
                            evidence_snippet=line[:200],
                        )
                    )

        # 7. Projects
        proj_items: List[ExtractedProject] = []
        for proj in bundle.get("projects") or []:
            proj_items.append(
                ExtractedProject(
                    name=proj.get("project_name") or proj.get("name") or "Project",
                    description=proj.get("project_description") or proj.get("description"),
                    technologies=default_skill_normalizer.normalize_many(
                        proj.get("technologies_used") or []
                    ),
                    evidence_snippet=(proj.get("project_description") or proj.get("name") or "")[:200],
                )
            )
        if not proj_items:
            proj_matches = re.finditer(
                r"(?:Project|Built|Developed)\s*[:\-]\s*([^\n]{10,180})",
                text,
                re.IGNORECASE,
            )
            for idx, pm in enumerate(list(proj_matches)[:5], start=1):
                desc = pm.group(1).strip()
                techs = default_skill_normalizer.extract_known_skills_from_text(desc)
                proj_items.append(
                    ExtractedProject(
                        name=f"Project {idx}",
                        description=desc,
                        technologies=techs,
                        evidence_snippet=pm.group(0).strip(),
                    )
                )

        # 8. Certifications & Languages
        cert_items: List[ExtractedCertification] = [
            ExtractedCertification(
                name=c.get("certification_name") or c.get("name") or "Certification",
                issuing_organization=c.get("issuing_organization"),
            )
            for c in (bundle.get("certifications") or [])
        ]
        languages: List[str] = [
            str(lang.get("language_name") or lang.get("name") or lang)
            for lang in (bundle.get("languages") or [])
            if lang
        ]

        return StructuredCandidateProfileSchema(
            full_name=full_name,
            location=location,
            total_experience_years=total_exp,
            skills=normalized_skills,
            normalized_skills=normalized_skills,
            work_experience=work_items,
            education=edu_items,
            projects=proj_items,
            certifications=cert_items,
            languages=languages,
            extraction_evidence=evidence,
        )


information_extractor = InformationExtractor()
