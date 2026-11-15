import sys
from pathlib import Path
from uuid import uuid4
import pytest

LLM_ROOT = Path(__file__).resolve().parents[1]
if str(LLM_ROOT) not in sys.path:
    sys.path.insert(0, str(LLM_ROOT))

from app.schemas.matching_schema import ScoringWeightsConfig, RankedCandidateItem
from app.schemas.recommendation_schema import RecommendedJobItem
from app.services.matching.scoring_service import ScoringService


def test_recruiter_scoring_weights_defaults():
    weights = ScoringWeightsConfig()
    assert weights.skills_match_weight == 0.40
    assert weights.relevant_experience_weight == 0.25
    assert weights.project_relevance_weight == 0.15
    assert weights.education_match_weight == 0.10
    assert weights.certifications_weight == 0.05
    assert weights.jd_alignment_weight == 0.05
    total = (
        weights.skills_match_weight
        + weights.relevant_experience_weight
        + weights.project_relevance_weight
        + weights.education_match_weight
        + weights.certifications_weight
        + weights.jd_alignment_weight
    )
    assert round(total, 2) == 1.00


def test_recruiter_final_weighted_score():
    scorer = ScoringService()
    weights = ScoringWeightsConfig()

    # 1. Perfect 100 score test
    perfect_score = scorer.compute_final_weighted_score(
        skill_score=100.0,
        experience_score=100.0,
        project_score=100.0,
        similarity_score=100.0,
        education_score=100.0,
        certifications_score=100.0,
        jd_alignment_score=100.0,
        weights=weights,
    )
    assert perfect_score == 100.0

    # 2. Weighted components:
    # 40% Skills, 25% Experience, 15% Projects, 10% Education, 5% Certifications, 5% JD Alignment
    score = scorer.compute_final_weighted_score(
        skill_score=80.0,          # 80 * 0.40 = 32.0
        experience_score=100.0,     # 100 * 0.25 = 25.0
        project_score=60.0,         # 60 * 0.15 = 9.0
        similarity_score=70.0,
        education_score=90.0,       # 90 * 0.10 = 9.0
        certifications_score=100.0, # 100 * 0.05 = 5.0
        jd_alignment_score=70.0,    # 70 * 0.05 = 3.5
        weights=weights,
    )
    # Expected: 32 + 25 + 9 + 9 + 5 + 3.5 = 83.5
    assert round(score, 1) == 83.5


def test_education_score_calculation():
    scorer = ScoringService()
    # PhD requirement with PhD candidate
    phd_cand = [{"degree": "Doctor of Philosophy", "field_of_study": "Computer Science"}]
    assert scorer.compute_education_score(
        education_entries=phd_cand,
        min_education_level="PhD",
    ) == 100.0

    # Master's requirement with Bachelor's candidate (1 level below -> 80.0)
    bachelor_cand = [{"degree": "Bachelor of Technology", "field_of_study": "CS"}]
    assert scorer.compute_education_score(
        education_entries=bachelor_cand,
        min_education_level="Master",
    ) == 80.0

    # Bachelor's requirement with Bachelor candidate -> 100.0
    assert scorer.compute_education_score(
        education_entries=bachelor_cand,
        educational_qualification="B.Tech",
    ) == 100.0


def test_certifications_score_calculation():
    scorer = ScoringService()
    cand_certs = [
        {"name": "AWS Certified Solutions Architect"},
        {"name": "Certified Kubernetes Administrator (CKA)"},
    ]

    # Required cert matched
    score = scorer.compute_certifications_score(
        certifications=cand_certs,
        required_certifications=["AWS Certified Solutions Architect"],
    )
    assert score == 100.0

    # 1 of 2 required matched
    score_half = scorer.compute_certifications_score(
        certifications=cand_certs,
        required_certifications=["AWS Certified Solutions Architect", "GCP Professional Cloud Architect"],
    )
    assert score_half == 50.0

    # No specific requirements but relevant skills match
    score_skills = scorer.compute_certifications_score(
        certifications=cand_certs,
        target_skills=["AWS", "Kubernetes"],
    )
    assert score_skills >= 85.0


def test_location_and_employment_type_scoring():
    scorer = ScoringService()

    # Remote job is always 100%
    assert scorer.compute_location_preference_score(
        candidate_location="New Delhi",
        preferred_locations=["Noida"],
        job_location="Bengaluru",
        job_work_mode="REMOTE",
    ) == 100.0

    # Matching location is 100%
    assert scorer.compute_location_preference_score(
        candidate_location="Bengaluru, Karnataka",
        preferred_locations=["Bengaluru"],
        job_location="Bengaluru",
        job_work_mode="HYBRID",
    ) == 100.0

    # Employment type matching
    assert scorer.compute_employment_type_score(
        candidate_preferred_type="FULL_TIME",
        job_employment_type="FULL_TIME",
    ) == 100.0
    assert scorer.compute_employment_type_score(
        candidate_preferred_type="PART_TIME",
        job_employment_type="FULL_TIME",
    ) == 50.0


def test_candidate_job_recommendation_scoring():
    scorer = ScoringService()
    # 40% Skills, 25% Experience, 15% JD Relevance, 10% Location, 5% Education, 5% Employment Type
    # All 100% -> 100.0
    perfect = scorer.compute_candidate_job_score(
        skill_score=100.0,
        experience_score=100.0,
        jd_relevance_score=100.0,
        location_score=100.0,
        education_score=100.0,
        employment_type_score=100.0,
    )
    assert perfect == 100.0

    # Weighted check:
    # 80 * 0.40 = 32.0
    # 90 * 0.25 = 22.5
    # 70 * 0.15 = 10.5
    # 100 * 0.10 = 10.0
    # 80 * 0.05 = 4.0
    # 100 * 0.05 = 5.0
    # Total = 32.0 + 22.5 + 10.5 + 10.0 + 4.0 + 5.0 = 84.0
    score = scorer.compute_candidate_job_score(
        skill_score=80.0,
        experience_score=90.0,
        jd_relevance_score=70.0,
        location_score=100.0,
        education_score=80.0,
        employment_type_score=100.0,
    )
    assert round(score, 1) == 84.0


def test_schemas_validation():
    cid = uuid4()
    aid = uuid4()
    candidate_item = RankedCandidateItem(
        rank=1,
        application_id=aid,
        candidate_id=cid,
        full_name="Jane Doe",
        email="jane@example.com",
        designation="Senior Full Stack Engineer",
        experience_years=5.5,
        location="San Francisco, CA",
        education="M.S. Computer Science",
        overall_score=92.5,
        match_score=92.5,
        match_percentage=92.5,
        skill_score=95.0,
        experience_score=100.0,
        similarity_score=88.0,
        project_score=85.0,
        education_score=90.0,
        certifications_score=80.0,
        jd_alignment_score=88.0,
        match_tier="STRONG_MATCH",
        matched_skills=["React", "Node.js", "Python"],
        missing_skills=["Kubernetes"],
        ai_explanation="Excellent match with strong React and Node background.",
        relevant_experience_summary="5+ years in full-stack web architectures.",
    )
    assert candidate_item.match_percentage == 92.5
    assert candidate_item.designation == "Senior Full Stack Engineer"
    assert candidate_item.rank == 1

    jid = uuid4()
    cid_company = uuid4()
    job_item = RecommendedJobItem(
        rank=1,
        job_id=jid,
        company_id=cid_company,
        job_title="Staff AI Engineer",
        title="Staff AI Engineer",
        company_name="Acme Corp",
        location="Remote",
        work_mode="REMOTE",
        employment_type="FULL_TIME",
        salary_range="$150,000 - $180,000",
        min_salary=150000,
        max_salary=180000,
        salary_currency="USD",
        experience_required="4 - 8 yrs",
        min_experience=4.0,
        max_experience=8.0,
        required_skills=["Python", "PyTorch", "FastAPI"],
        matched_skills=["Python", "FastAPI"],
        missing_skills=["PyTorch"],
        overall_score=89.0,
        match_score=89.0,
        match_percentage=89.0,
        has_applied=False,
        application_status=None,
        explanation="Strong match with Python and FastAPI experience.",
        ai_explanation="Great alignment with Python backend and microservice experience.",
    )
    assert job_item.match_percentage == 89.0
    assert job_item.has_applied is False
    assert job_item.salary_range == "$150,000 - $180,000"
