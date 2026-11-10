from typing import Any, Dict, List, Optional
from app.schemas.matching_schema import ScoringWeightsConfig
from app.utils.skill_normalizer import compute_skill_overlap, normalize_skill_list


class ScoringService:
    """
    Computes deterministic, explainable component scores (0 - 100) and weighted final scores,
    plus deterministic tie-breaking across candidates.
    """

    def compute_skill_score(
        self,
        *,
        candidate_skills: List[str],
        required_skills: List[str],
        preferred_skills: List[str],
    ) -> Dict[str, Any]:
        norm_cand = normalize_skill_list(candidate_skills)
        norm_req = normalize_skill_list(required_skills)
        norm_pref = normalize_skill_list(preferred_skills)

        req_overlap = compute_skill_overlap(norm_cand, norm_req)
        pref_overlap = compute_skill_overlap(norm_cand, norm_pref)

        if norm_req and norm_pref:
            score = (req_overlap["match_ratio"] * 80.0) + (pref_overlap["match_ratio"] * 20.0)
        elif norm_req:
            score = req_overlap["match_ratio"] * 100.0
        elif norm_pref:
            score = pref_overlap["match_ratio"] * 100.0
        else:
            score = 80.0 if norm_cand else 50.0

        matched_all = normalize_skill_list(req_overlap["matched"] + pref_overlap["matched"])
        missing_all = normalize_skill_list(req_overlap["missing"] + pref_overlap["missing"])

        return {
            "score": round(min(max(score, 0.0), 100.0), 2),
            "matched_skills": matched_all,
            "missing_skills": missing_all,
            "matched_required": req_overlap["matched"],
            "missing_required": req_overlap["missing"],
            "matched_preferred": pref_overlap["matched"],
            "missing_preferred": pref_overlap["missing"],
        }

    def compute_experience_score(
        self,
        *,
        candidate_years: float,
        min_experience: Optional[float],
        max_experience: Optional[float],
    ) -> float:
        cand_exp = max(0.0, float(candidate_years or 0.0))
        min_exp = float(min_experience) if min_experience is not None else 0.0
        max_exp = float(max_experience) if max_experience is not None else None

        if min_exp <= 0.0 and (max_exp is None or max_exp <= 0.0):
            return round(min(100.0, 65.0 + min(cand_exp * 5.0, 35.0)), 2)

        if cand_exp >= min_exp:
            if max_exp is None or max_exp <= 0.0 or cand_exp <= max_exp:
                # Within ideal range; slight bonus for mid/upper range
                bonus = min(15.0, (cand_exp - min_exp) * 3.0)
                return round(min(100.0, 85.0 + bonus), 2)
            # Over-experienced beyond max_exp: mild taper, never harsh penalty
            excess = cand_exp - max_exp
            penalty = min(20.0, excess * 3.0)
            return round(max(75.0, 95.0 - penalty), 2)

        # Below min_exp
        deficit = min_exp - cand_exp
        if min_exp > 0:
            ratio = max(0.0, cand_exp / min_exp)
            base = ratio * 80.0
            if deficit <= 1.0:
                base = max(base, 70.0)
            return round(min(85.0, max(10.0, base)), 2)

        return 60.0

    def compute_project_score(
        self,
        *,
        projects: List[Dict[str, Any]],
        experience_entries: List[Dict[str, Any]],
        required_skills: List[str],
        preferred_skills: List[str],
    ) -> float:
        target_skills = normalize_skill_list((required_skills or []) + (preferred_skills or []))
        if not projects and not experience_entries:
            return 40.0

        project_skills: List[str] = []
        descriptions: List[str] = []
        for proj in projects or []:
            if isinstance(proj, dict):
                project_skills.extend(proj.get("technologies") or [])
                descriptions.append(str(proj.get("description") or ""))
                descriptions.append(str(proj.get("name") or ""))

        for exp in experience_entries or []:
            if isinstance(exp, dict):
                project_skills.extend(exp.get("technologies") or [])
                descriptions.append(str(exp.get("description") or ""))
                descriptions.append(str(exp.get("role") or ""))

        combined_text = " ".join(descriptions).lower()
        for skill in target_skills:
            if skill.lower() in combined_text:
                project_skills.append(skill)

        norm_proj_skills = normalize_skill_list(project_skills)
        if not target_skills:
            return 75.0 if (projects or experience_entries) else 50.0

        overlap = compute_skill_overlap(norm_proj_skills, target_skills)
        base = 45.0 if (projects or experience_entries) else 25.0
        score = base + (overlap["match_ratio"] * 55.0)
        return round(min(100.0, max(0.0, score)), 2)

    def compute_final_weighted_score(
        self,
        *,
        skill_score: float,
        experience_score: float,
        similarity_score: float,
        project_score: float,
        llm_score: Optional[float],
        weights: ScoringWeightsConfig,
    ) -> float:
        w_skill = max(0.0, float(weights.skill_weight))
        w_exp = max(0.0, float(weights.experience_weight))
        w_sem = max(0.0, float(weights.semantic_weight))
        w_llm = max(0.0, float(weights.llm_weight))
        w_proj = max(0.0, float(weights.project_weight))

        effective_llm = float(llm_score) if llm_score is not None else (
            (skill_score * 0.45) + (experience_score * 0.25) + (similarity_score * 0.20) + (project_score * 0.10)
        )

        total_weight = w_skill + w_exp + w_sem + w_llm + w_proj
        if total_weight <= 0.0:
            total_weight = 1.0
            w_skill, w_exp, w_sem, w_llm, w_proj = 0.35, 0.20, 0.20, 0.15, 0.10

        weighted_sum = (
            (float(skill_score) * w_skill)
            + (float(experience_score) * w_exp)
            + (float(similarity_score) * w_sem)
            + (effective_llm * w_llm)
            + (float(project_score) * w_proj)
        )
        final = weighted_sum / total_weight
        return round(min(100.0, max(0.0, final)), 2)

    @staticmethod
    def categorize_score(score: float) -> str:
        if score >= 82.0:
            return "STRONG_MATCH"
        if score >= 68.0:
            return "GOOD_MATCH"
        if score >= 50.0:
            return "CONSIDER"
        return "WEAK_MATCH"

    @staticmethod
    def sort_and_rank_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deterministic tie-breaking rules:
        1. overall_score DESC
        2. skill_score DESC
        3. experience_score DESC
        4. similarity_score DESC
        5. application_id ASC
        """
        sorted_items = sorted(
            candidates,
            key=lambda item: (
                -round(float(item.get("overall_score") or 0.0), 4),
                -round(float(item.get("skill_score") or 0.0), 4),
                -round(float(item.get("experience_score") or 0.0), 4),
                -round(float(item.get("similarity_score") or 0.0), 4),
                str(item.get("application_id") or ""),
            ),
        )
        for idx, item in enumerate(sorted_items, start=1):
            item["rank"] = idx
        return sorted_items


scoring_service = ScoringService()
