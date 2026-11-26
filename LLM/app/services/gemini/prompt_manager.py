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

    @staticmethod
    def build_job_description_prompt(
        *,
        title: str,
        department: str = "",
        experience_level: str = "MID",
        employment_type: str = "FULL_TIME",
        work_mode: str = "HYBRID",
        company_name: str = "",
        key_requirements_or_notes: str = "",
    ) -> str:
        return (
            "You are an expert talent acquisition leader and hiring manager.\n"
            "Generate a comprehensive, compelling, inclusive, and professional Job Description based on the parameters.\n"
            "Do NOT use biased or exclusionary jargon.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "title": string,\n'
            '  "summary": string,\n'
            '  "description": string,\n'
            '  "responsibilities": [string],\n'
            '  "required_skills": [string],\n'
            '  "preferred_skills": [string],\n'
            '  "min_experience_years": number,\n'
            '  "max_experience_years": number,\n'
            '  "suggested_education_level": string\n'
            "}\n\n"
            f"PARAMETERS:\n"
            f"- Target Title: {title}\n"
            f"- Department: {department or 'Engineering/Product'}\n"
            f"- Seniority / Experience Level: {experience_level}\n"
            f"- Employment Type: {employment_type}\n"
            f"- Work Mode: {work_mode}\n"
            f"- Company: {company_name or 'Our Company'}\n"
            f"- Recruiter Notes & Keywords: {key_requirements_or_notes or 'Standard industry best practices'}\n"
        )

    @staticmethod
    def build_interview_questions_prompt(
        *,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        responsibilities: List[str],
        candidate_name: str,
        candidate_experience_years: float,
        candidate_skills: List[str],
        candidate_work_history: List[Dict[str, Any]],
        interview_round: str = "TECHNICAL",
        focus_areas: List[str] = None,
    ) -> str:
        safe_candidate = {
            "name": candidate_name or "Candidate",
            "experience_years": candidate_experience_years,
            "skills": candidate_skills[:20],
            "recent_experience": candidate_work_history[:4],
        }
        return (
            "You are a principal technical interviewer and hiring committee bar-raiser.\n"
            "Generate a tailored interview question kit specifically designed for this candidate applying to this job.\n"
            "RULES:\n"
            "1. Deeply analyze the intersection and delta between the candidate's experience/skills and the job requirements.\n"
            "2. If the candidate lists a skill or past role, craft questions that verify real depth and problem-solving, not generic trivia.\n"
            "3. If there is a missing required skill or gap, generate questions assessing their ability to learn or bridge that gap.\n"
            "4. Provide 5 to 7 high-impact questions categorized logically.\n"
            "5. For every question, include what key signals/responses indicate a strong versus weak candidate.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "candidate_name": string,\n'
            '  "job_title": string,\n'
            '  "interview_round": string,\n'
            '  "overall_interview_focus": string,\n'
            '  "questions": [\n'
            "    {\n"
            '      "category": string,\n'
            '      "question": string,\n'
            '      "context_or_rationale": string,\n'
            '      "what_to_look_for": [string],\n'
            '      "difficulty": "Basic" | "Intermediate" | "Advanced"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"TARGET ROLE:\n"
            f"- Title: {job_title}\n"
            f"- Required Skills: {json.dumps(required_skills)}\n"
            f"- Key Responsibilities: {json.dumps(responsibilities[:6])}\n"
            f"- Job Description Snippet: {(job_description or '')[:1200]}\n\n"
            f"CANDIDATE PROFILE:\n{json.dumps(safe_candidate, ensure_ascii=False)}\n\n"
            f"INTERVIEW ROUND: {interview_round}\n"
            f"EXTRA FOCUS AREAS: {json.dumps(focus_areas or [])}"
        )
