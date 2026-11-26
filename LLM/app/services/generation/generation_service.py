import logging
from typing import List
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.schemas.ai_generation_schema import (
    InterviewQuestionItem,
    JobDescriptionGeneratorRequest,
    JobDescriptionGeneratorResponse,
    TailoredInterviewQuestionsRequest,
    TailoredInterviewQuestionsResponse,
)
from app.services.gemini.gemini_client import GeminiClient
from app.services.gemini.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


class GenerationService:
    @classmethod
    def generate_job_description(
        cls,
        db: Session,
        req: JobDescriptionGeneratorRequest,
        client: GeminiClient = None,
    ) -> JobDescriptionGeneratorResponse:
        client = client or GeminiClient()
        prompt = PromptManager.build_job_description_prompt(
            title=req.title,
            department=req.department or "",
            experience_level=req.experience_level or "MID",
            employment_type=req.employment_type or "FULL_TIME",
            work_mode=req.work_mode or "HYBRID",
            company_name=req.company_name or "",
            key_requirements_or_notes=req.key_requirements_or_notes or "",
        )

        settings = get_settings()
        if client.is_configured and settings.GEMINI_API_KEY and settings.APP_ENV != "test":
            try:
                return client.generate_structured_json(
                    db,
                    prompt=prompt,
                    schema_cls=JobDescriptionGeneratorResponse,
                    request_type="JOB_DESCRIPTION_GENERATION",
                )
            except Exception as e:
                logger.warning("Gemini JD generation call failed, falling back to synthesis: %s", e)

        # Fallback synthesis based on role title, experience level, and notes
        level = (req.experience_level or "MID").upper()
        min_exp = 0 if level == "ENTRY" else (2 if level == "MID" else (5 if level == "SENIOR" else 8))
        max_exp = min_exp + 3

        # Extract tokens from title & notes to synthesize skills
        raw_text = f"{req.title} {req.key_requirements_or_notes or ''}"
        tokens = [t.strip(",.()[]") for t in raw_text.split() if len(t.strip(",.()[]")) > 2]
        
        common_tech = ["React", "TypeScript", "Node.js", "Python", "PostgreSQL", "Docker", "AWS", "REST APIs", "Git", "System Design"]
        found_skills = [s for s in common_tech if any(s.lower() in t.lower() for t in tokens)]
        if not found_skills:
            found_skills = ["Communication", "Problem Solving", "Team Leadership", "Agile Methodologies"]
        if "React" not in found_skills and "Frontend" in req.title:
            found_skills.extend(["React", "TypeScript", "Tailwind CSS"])
        if "Backend" in req.title and "Node.js" not in found_skills:
            found_skills.extend(["Node.js", "PostgreSQL", "Microservices"])

        required_skills = list(dict.fromkeys(found_skills[:6]))
        preferred_skills = ["CI/CD pipelines", "Cloud architecture (AWS/GCP)", "Automated testing", "Mentorship"]

        responsibilities = [
            f"Architect, develop, and maintain production-grade capabilities for {req.title} initiatives.",
            "Collaborate closely with product managers, designers, and engineering colleagues to define technical scope.",
            "Write clean, maintainable, high-test-coverage code following established engineering standards.",
            "Participate in code reviews, technical design discussions, and system observability improvements.",
            "Identify bottlenecks, debug critical production issues, and optimize application performance.",
        ]

        summary = (
            f"We are seeking a talented and proactive {req.title} to join our growing team. "
            f"In this role, you will lead impactful technical deliverables, solve challenging problems, "
            f"and help drive innovation in a collaborative, {req.work_mode.lower()} environment."
        )

        description = (
            f"### About the Role\n\n{summary}\n\n"
            f"### Key Responsibilities\n\n" + "\n".join(f"- {r}" for r in responsibilities) + "\n\n"
            f"### Requirements\n\n" + "\n".join(f"- Proven proficiency with {s}." for s in required_skills) +
            f"\n- Minimum of {min_exp} years of relevant industry experience in modern software delivery.\n"
            f"- Strong problem-solving aptitude, communication skills, and commitment to code quality.\n\n"
            f"### Nice to Have\n\n" + "\n".join(f"- Experience with {p}." for p in preferred_skills)
        )

        return JobDescriptionGeneratorResponse(
            title=req.title,
            summary=summary,
            description=description,
            responsibilities=responsibilities,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            min_experience_years=min_exp,
            max_experience_years=max_exp,
            suggested_education_level="BACHELORS",
        )

    @classmethod
    def generate_interview_questions(
        cls,
        db: Session,
        req: TailoredInterviewQuestionsRequest,
        client: GeminiClient = None,
    ) -> TailoredInterviewQuestionsResponse:
        client = client or GeminiClient()
        prompt = PromptManager.build_interview_questions_prompt(
            job_title=req.job_title,
            job_description=req.job_description or "",
            required_skills=req.required_skills,
            responsibilities=req.responsibilities,
            candidate_name=req.candidate_name or "Candidate",
            candidate_experience_years=req.candidate_experience_years or 0.0,
            candidate_skills=req.candidate_skills,
            candidate_work_history=req.candidate_work_history,
            interview_round=req.interview_round or "TECHNICAL",
            focus_areas=req.focus_areas,
        )

        settings = get_settings()
        if client.is_configured and settings.GEMINI_API_KEY and settings.APP_ENV != "test":
            try:
                return client.generate_structured_json(
                    db,
                    prompt=prompt,
                    schema_cls=TailoredInterviewQuestionsResponse,
                    request_type="INTERVIEW_QUESTION_GENERATION",
                )
            except Exception as e:
                logger.warning("Gemini interview generation call failed, falling back to synthesis: %s", e)

        # Fallback synthesis: generate tailored questions based on candidate profile vs job requirements
        questions: List[InterviewQuestionItem] = []
        cand_skills_lower = {s.lower() for s in req.candidate_skills}
        matched_skills = [s for s in req.required_skills if s.lower() in cand_skills_lower]
        gap_skills = [s for s in req.required_skills if s.lower() not in cand_skills_lower]

        # 1. Technical Depth on Matched Skills
        if matched_skills:
            primary_skill = matched_skills[0]
            questions.append(
                InterviewQuestionItem(
                    category="Technical Deep-Dive",
                    question=(
                        f"In your recent projects, how did you architect solutions using {primary_skill}? "
                        f"Can you walk through a difficult technical trade-off or performance bottleneck you resolved?"
                    ),
                    context_or_rationale=(
                        f"The candidate claims experience with {primary_skill}, which is a core requirement for {req.job_title}. "
                        f"This question tests practical architectural depth and real-world troubleshooting."
                    ),
                    what_to_look_for=[
                        "Clear articulation of trade-offs (e.g. latency, memory, complexity)",
                        "Specific metrics or measurable outcomes achieved",
                        "Deep understanding of internal mechanics rather than surface-level API usage",
                    ],
                    difficulty="Intermediate",
                )
            )

        # 2. Skill Gap or Learning Agility
        if gap_skills:
            gap_skill = gap_skills[0]
            questions.append(
                InterviewQuestionItem(
                    category="Skill Gap Verification",
                    question=(
                        f"This role requires working with {gap_skill}, which isn't prominently featured in your recent background. "
                        f"How have you previously ramped up on unfamiliar technologies under tight delivery timelines?"
                    ),
                    context_or_rationale=(
                        f"{gap_skill} is listed as a required skill for this role. "
                        f"Verifies adaptability, conceptual transfer from related tools, and self-learning speed."
                    ),
                    what_to_look_for=[
                        "Examples of analogies drawn from similar paradigms candidate already knows",
                        "Structured learning methodology (documentation, prototyping, asking the right questions)",
                        "Humility and eagerness to master new domain areas",
                    ],
                    difficulty="Basic",
                )
            )

        # 3. Work History & Project Architecture
        if req.candidate_work_history:
            recent_role = req.candidate_work_history[0]
            role_title = recent_role.get("job_title") or "recent position"
            questions.append(
                InterviewQuestionItem(
                    category="Project Architecture & Impact",
                    question=(
                        f"In your role as {role_title}, what was the most complex feature or system you owned end-to-end? "
                        f"How did you ensure fault tolerance, scalability, and code maintainability?"
                    ),
                    context_or_rationale=(
                        f"Directly assesses candidate's ownership scope and engineering maturity in their past role."
                    ),
                    what_to_look_for=[
                        "Demonstrates clear end-to-end ownership beyond simple assigned tickets",
                        "Consideration of edge cases, data consistency, and error handling",
                        "Collaboration with cross-functional stakeholders",
                    ],
                    difficulty="Advanced",
                )
            )

        # 4. Behavioral & Culture / Seniority
        questions.append(
            InterviewQuestionItem(
                category="Behavioral & Collaboration",
                question=(
                    "Describe a time when you had a strong technical disagreement with a team member or product manager. "
                    "How did you navigate the conflict, and what was the ultimate resolution?"
                ),
                context_or_rationale=(
                    "Ensures high-functioning teamwork, constructive debate skills, and lack of ego."
                ),
                what_to_look_for=[
                    "Focuses on data, user impact, and prototype evidence rather than personal opinion",
                    "Listened attentively and respected alternative viewpoints",
                    "Disagreed and committed once a decision was made",
                ],
                difficulty="Intermediate",
            )
        )

        # 5. Role-Specific Delivery / System Design
        questions.append(
            InterviewQuestionItem(
                category="System Design & Reliability",
                question=(
                    f"How would you approach designing a high-throughput, low-latency service for {req.job_title}? "
                    "What caching strategies, database schema considerations, and monitoring alerts would you put in place?"
                ),
                context_or_rationale=(
                    f"Assesses whether the candidate can design scalable software that aligns with {req.job_title} standards."
                ),
                what_to_look_for=[
                    "Proper layer separation (API gateway, caching, database indexing)",
                    "Awareness of observability (logging, metrics, tracing, alerts)",
                    "Security considerations (authentication, input sanitization, rate limiting)",
                ],
                difficulty="Advanced",
            )
        )

        return TailoredInterviewQuestionsResponse(
            candidate_name=req.candidate_name or "Candidate",
            job_title=req.job_title,
            interview_round=req.interview_round or "TECHNICAL",
            overall_interview_focus=(
                f"Evaluate technical competence in {', '.join(req.required_skills[:3]) if req.required_skills else 'core role domains'}, "
                f"verify depth on claimed resume accomplishments, and assess collaboration and problem-solving abilities."
            ),
            questions=questions,
        )
