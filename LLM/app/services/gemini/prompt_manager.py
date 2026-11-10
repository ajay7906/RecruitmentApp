import json
from typing import Any, Dict, List


class PromptManager:
    """
    Constructs compact, privacy-preserving, structured JSON prompts for:
    1. Candidate resume structured extraction (only when deterministic extraction needs enrichment).
    2. Shortlisted candidate-to-job compatibility evaluation.
    Never includes candidate email, phone, gender, age, DOB, religion, or protected attributes.
    """

    @staticmethod
    def build_resume_extraction_prompt(cleaned_text: str) -> str:
        truncated = (cleaned_text or "")[:10_000]
        return (
            "You are a precise technical resume parser. Extract structured candidate information "
            "strictly from the provided resume text. Do NOT fabricate or guess missing information; "
            "use null or empty arrays when a field is not explicitly stated.\n\n"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "full_name": string | null,\n'
            '  "location": string | null,\n'
            '  "total_experience_years": number | null,\n'
            '  "skills": [string],\n'
            '  "work_experience": [\n'
            '    {\n'
            '      "job_title": string | null,\n'
            '      "company_name": string | null,\n'
            '      "employment_dates": string | null,\n'
            '      "currently_working": boolean,\n'
            '      "description": string | null,\n'
            '      "technologies": [string],\n'
            '      "evidence_snippet": string | null\n'
            '    }\n'
            "  ],\n"
            '  "education": [\n'
            '    {\n'
            '      "degree": string | null,\n'
            '      "field_of_study": string | null,\n'
            '      "university": string | null,\n'
            '      "graduation_year": string | null,\n'
            '      "evidence_snippet": string | null\n'
            '    }\n'
            "  ],\n"
            '  "projects": [\n'
            '    {\n'
            '      "name": string,\n'
            '      "description": string | null,\n'
            '      "technologies": [string],\n'
            '      "evidence_snippet": string | null\n'
            '    }\n'
            "  ],\n"
            '  "certifications": [{"name": string, "issuing_organization": string | null}],\n'
            '  "languages": [string],\n'
            '  "extraction_evidence": {"skills": string, "experience": string}\n'
            "}\n\n"
            f"RESUME TEXT:\n{truncated}"
        )

    @staticmethod
    def build_candidate_evaluation_prompt(
        *,
        job_data: Dict[str, Any],
        candidate_data: Dict[str, Any],
        relevant_excerpts: str,
    ) -> str:
        safe_job = {
            "job_title": job_data.get("title") or job_data.get("job_title"),
            "department": job_data.get("department"),
            "required_skills": job_data.get("required_skills") or [],
            "preferred_skills": job_data.get("preferred_skills") or [],
            "min_experience_years": job_data.get("min_experience"),
            "max_experience_years": job_data.get("max_experience"),
            "description": (job_data.get("description") or "")[:2500],
            "responsibilities": (job_data.get("responsibilities") or [])[:10],
        }

        safe_candidate = {
            "normalized_skills": candidate_data.get("normalized_skills") or [],
            "total_experience_years": candidate_data.get("total_experience_years"),
            "work_experience": (candidate_data.get("work_experience") or [])[:6],
            "projects": (candidate_data.get("projects") or [])[:5],
            "education": (candidate_data.get("education") or [])[:3],
        }

        return (
            "You are an objective, evidence-based technical recruitment evaluator.\n"
            "Evaluate the candidate strictly against the job requirements below.\n"
            "RULES:\n"
            "1. Every strength, weakness, or score MUST be backed by concrete evidence from the candidate's structured profile or resume excerpts.\n"
            "2. Do NOT penalize missing optional/preferred fields or unstated personal details.\n"
            "3. Never consider age, gender, ethnicity, religion, or any protected characteristic.\n"
            "4. Scores must be numbers between 0 and 100.\n"
            "5. recommendation_category must be one of: STRONG_MATCH, GOOD_MATCH, CONSIDER, WEAK_MATCH.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "overall_compatibility_score": number,\n'
            '  "skill_compatibility_score": number,\n'
            '  "experience_compatibility_score": number,\n'
            '  "project_relevance_score": number,\n'
            '  "strengths": [string],\n'
            '  "weaknesses": [string],\n'
            '  "missing_skills": [string],\n'
            '  "matched_skills": [string],\n'
            '  "evidence": [{"claim": string, "resume_excerpt": string, "section": string}],\n'
            '  "recommendation_category": "STRONG_MATCH" | "GOOD_MATCH" | "CONSIDER" | "WEAK_MATCH",\n'
            '  "summary_explanation": string\n'
            "}\n\n"
            f"JOB REQUIREMENTS:\n{json.dumps(safe_job, ensure_ascii=False)}\n\n"
            f"CANDIDATE STRUCTURED PROFILE:\n{json.dumps(safe_candidate, ensure_ascii=False)}\n\n"
            f"RELEVANT RESUME EXCERPTS:\n{(relevant_excerpts or '')[:1800]}"
        )
