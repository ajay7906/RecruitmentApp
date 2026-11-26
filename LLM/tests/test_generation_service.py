from app.schemas.ai_generation_schema import (
    JobDescriptionGeneratorRequest,
    TailoredInterviewQuestionsRequest,
)
from app.services.generation.generation_service import GenerationService


def test_job_description_synthesis():
    req = JobDescriptionGeneratorRequest(
        title="Senior Full Stack Engineer",
        department="Engineering",
        experience_level="SENIOR",
        work_mode="REMOTE",
        key_requirements_or_notes="React, Node.js, PostgreSQL, AWS, High scale systems",
    )
    # Using None for db since fallback does not query db
    res = GenerationService.generate_job_description(None, req)
    assert res.title == "Senior Full Stack Engineer"
    assert "Senior Full Stack Engineer" in res.summary
    assert len(res.responsibilities) >= 3
    assert len(res.required_skills) >= 2
    assert res.min_experience_years == 5
    assert "React" in res.required_skills or "Node.js" in res.required_skills


def test_interview_questions_synthesis():
    req = TailoredInterviewQuestionsRequest(
        job_title="Frontend Lead",
        required_skills=["React", "TypeScript", "GraphQL"],
        responsibilities=["Build component systems", "Optimize bundle size"],
        candidate_name="Alex River",
        candidate_experience_years=6.0,
        candidate_skills=["React", "JavaScript", "Tailwind CSS"],
        candidate_work_history=[
            {"job_title": "Senior Frontend Developer", "company_name": "Acme Corp"}
        ],
        interview_round="TECHNICAL",
    )
    res = GenerationService.generate_interview_questions(None, req)
    assert res.job_title == "Frontend Lead"
    assert res.candidate_name == "Alex River"
    assert len(res.questions) >= 4
    # Check that it generated a technical deep dive and a skill gap verification
    categories = [q.category for q in res.questions]
    assert any("Deep-Dive" in c for c in categories)
    assert any("Skill Gap" in c for c in categories)
