from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from app.schemas.matching_schema import MatchingFilterConfig
from app.utils.skill_normalizer import compute_skill_overlap, normalize_skill_list


@dataclass
class FilterResult:
    eligible: bool
    reasons: List[str] = field(default_factory=list)
    matched_required_skills: List[str] = field(default_factory=list)
    missing_required_skills: List[str] = field(default_factory=list)
    matched_preferred_skills: List[str] = field(default_factory=list)
    missing_preferred_skills: List[str] = field(default_factory=list)
    required_match_ratio: float = 1.0
    preferred_match_ratio: float = 0.0


class CandidateFilterService:
    """
    Applies configurable hard and soft eligibility rules to job applicants.
    Ensures missing optional candidate fields do not unfairly disqualify candidates
    and never uses protected attributes (age, gender, nationality, marital status).
    """

    def evaluate_candidate(
        self,
        *,
        candidate_data: Dict[str, Any],
        job_data: Dict[str, Any],
        filter_config: MatchingFilterConfig,
    ) -> FilterResult:
        reasons: List[str] = []
        eligible = True

        candidate_skills = normalize_skill_list(candidate_data.get("normalized_skills") or [])
        req_skills = normalize_skill_list(job_data.get("required_skills") or [])
        pref_skills = normalize_skill_list(job_data.get("preferred_skills") or [])

        req_overlap = compute_skill_overlap(candidate_skills, req_skills)
        pref_overlap = compute_skill_overlap(candidate_skills, pref_skills)

        req_ratio = float(req_overlap["match_ratio"])
        pref_ratio = float(pref_overlap["match_ratio"])

        # 1. Required skills filter (configurable hard vs soft)
        if req_skills:
            if filter_config.strict_required_skills and req_overlap["missing"]:
                eligible = False
                reasons.append(
                    f"Missing mandatory required skills: {', '.join(req_overlap['missing'])}"
                )
            elif (
                filter_config.min_required_skill_match_ratio > 0.0
                and req_ratio < filter_config.min_required_skill_match_ratio
            ):
                eligible = False
                reasons.append(
                    f"Required skill match ratio ({req_ratio:.0%}) below minimum threshold ({filter_config.min_required_skill_match_ratio:.0%})"
                )

        # 2. Experience range filter (with configurable tolerance)
        cand_exp = float(candidate_data.get("total_experience_years") or 0.0)
        min_exp = job_data.get("min_experience")
        max_exp = job_data.get("max_experience")
        tolerance = float(filter_config.experience_tolerance_years or 0.0)

        if filter_config.enforce_experience_range:
            if min_exp is not None and float(min_exp) > 0:
                effective_min = max(0.0, float(min_exp) - tolerance)
                if cand_exp < effective_min:
                    eligible = False
                    reasons.append(
                        f"Experience ({cand_exp:.1f} yrs) is below minimum required ({float(min_exp):.1f} yrs with {tolerance:.1f} yr tolerance)"
                    )
            if max_exp is not None and float(max_exp) > 0:
                effective_max = float(max_exp) + max(tolerance, 2.0)
                if cand_exp > effective_max:
                    eligible = False
                    reasons.append(
                        f"Experience ({cand_exp:.1f} yrs) exceeds maximum range ({float(max_exp):.1f} yrs)"
                    )

        # 3. Location constraint (only when job is ONSITE and mandatory_location is enabled)
        work_mode = str(job_data.get("work_mode") or "").upper()
        if filter_config.mandatory_location and work_mode == "ONSITE":
            job_loc = str(job_data.get("location") or "").strip().lower()
            cand_loc = str(candidate_data.get("location") or "").strip().lower()
            # Do not penalize missing optional location unless strictly provided and mismatched
            if job_loc and cand_loc and job_loc not in cand_loc and cand_loc not in job_loc:
                eligible = False
                reasons.append(
                    f"Candidate location '{candidate_data.get('location')}' does not match mandatory onsite location '{job_data.get('location')}'"
                )

        # 4. Salary constraint (optional, only if both candidate expected salary and job max_salary exist)
        if filter_config.enforce_salary_budget:
            max_salary = job_data.get("max_salary")
            expected_salary = candidate_data.get("expected_salary")
            if max_salary is not None and expected_salary is not None:
                try:
                    if float(expected_salary) > float(max_salary) * 1.15:
                        eligible = False
                        reasons.append("Candidate expected salary exceeds job budget tolerance")
                except (TypeError, ValueError):
                    pass

        return FilterResult(
            eligible=eligible,
            reasons=reasons,
            matched_required_skills=req_overlap["matched"],
            missing_required_skills=req_overlap["missing"],
            matched_preferred_skills=pref_overlap["matched"],
            missing_preferred_skills=pref_overlap["missing"],
            required_match_ratio=req_ratio,
            preferred_match_ratio=pref_ratio,
        )


candidate_filter_service = CandidateFilterService()
