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

    def compute_education_score(
        self,
        *,
        education_entries: List[Dict[str, Any]],
        min_education_level: Optional[str] = None,
        educational_qualification: Optional[str] = None,
    ) -> float:
        """
        Computes education match score (0 - 100).
        Evaluates candidate's degrees against job requirements.
        """
        if not education_entries:
            return 60.0 if not (min_education_level or educational_qualification) else 40.0

        level_map = {
            "doctorate": 5, "phd": 5, "ph.d": 5, "doctor": 5, "philosophy": 5,
            "master": 4, "masters": 4, "postgraduate": 4, "ms": 4, "mtech": 4, "m.tech": 4, "mba": 4, "mca": 4,
            "bachelor": 3, "bachelors": 3, "undergraduate": 3, "bs": 3, "btech": 3, "b.tech": 3, "be": 3, "b.e": 3, "bca": 3, "ba": 3, "bsc": 3,
            "diploma": 2, "associate": 2,
            "high_school": 1, "secondary": 1, "12th": 1, "10th": 1,
        }

        req_level = 3  # default bachelor if unspecified
        req_text = f"{min_education_level or ''} {educational_qualification or ''}".lower()
        for kw, lvl in level_map.items():
            if kw in req_text:
                req_level = max(req_level, lvl)
                break

        highest_cand_level = 0
        cand_text = ""
        for entry in education_entries:
            deg = str(entry.get("degree") or "").lower()
            field = str(entry.get("field_of_study") or entry.get("field") or "").lower()
            cand_text += f" {deg} {field}"
            for kw, lvl in level_map.items():
                if kw in deg or kw in field:
                    highest_cand_level = max(highest_cand_level, lvl)

        if highest_cand_level == 0:
            highest_cand_level = 3 if ("degree" in cand_text or "university" in cand_text) else 2

        if highest_cand_level >= req_level:
            return 100.0
        elif highest_cand_level == req_level - 1:
            return 80.0
        else:
            return 60.0

    def compute_certifications_score(
        self,
        *,
        certifications: List[Dict[str, Any]],
        required_certifications: Optional[List[str]] = None,
        target_skills: Optional[List[str]] = None,
    ) -> float:
        """
        Computes certifications match score (0 - 100).
        """
        req_certs = [c.strip().lower() for c in (required_certifications or []) if c.strip()]
        cand_cert_names = [
            str(c.get("certification_name") or c.get("name") or "").strip().lower()
            for c in (certifications or [])
        ]

        if req_certs:
            matched = sum(
                1 for rc in req_certs
                if any(rc in cc or cc in rc for cc in cand_cert_names)
            )
            ratio = matched / len(req_certs)
            return round(ratio * 100.0, 2)

        if not certifications:
            return 70.0

        # Bonus if certifications match any technical skills
        norm_targets = [s.lower() for s in (target_skills or [])]
        skill_matched = sum(
            1 for cc in cand_cert_names
            if any(ts in cc for ts in norm_targets)
        )
        if skill_matched > 0:
            return round(min(100.0, 85.0 + (skill_matched * 5.0)), 2)

        return round(min(90.0, 75.0 + (len(certifications) * 5.0)), 2)

    def compute_jd_alignment_score(
        self,
        *,
        similarity_score: float,
        llm_score: Optional[float] = None,
    ) -> float:
        """
        Combines vector semantic similarity and structured LLM evaluation evidence alignment.
        """
        sem = max(0.0, min(100.0, float(similarity_score or 0.0)))
        if llm_score is not None:
            llm = max(0.0, min(100.0, float(llm_score)))
            return round((sem * 0.40) + (llm * 0.60), 2)
        return sem

    def compute_location_preference_score(
        self,
        *,
        candidate_location: Optional[str],
        preferred_locations: List[str],
        job_location: Optional[str],
        job_work_mode: Optional[str],
    ) -> float:
        """
        Location preference score (0 - 100).
        100% for REMOTE jobs.
        100% for exact location match.
        """
        if (job_work_mode or "").upper() == "REMOTE":
            return 100.0

        if not job_location:
            return 85.0

        norm_job_loc = job_location.lower().strip()
        all_candidate_locs = [
            loc.lower().strip()
            for loc in ([candidate_location] if candidate_location else []) + (preferred_locations or [])
            if loc and loc.strip()
        ]

        if not all_candidate_locs:
            return 75.0  # candidate didn't specify strict preference

        for cloc in all_candidate_locs:
            if cloc in norm_job_loc or norm_job_loc in cloc:
                return 100.0

        # Partial city/state tokens
        job_tokens = set(norm_job_loc.replace(",", " ").split())
        for cloc in all_candidate_locs:
            cand_tokens = set(cloc.replace(",", " ").split())
            if job_tokens.intersection(cand_tokens):
                return 80.0

        return 40.0

    def compute_employment_type_score(
        self,
        *,
        candidate_preferred_type: Optional[str],
        job_employment_type: Optional[str],
    ) -> float:
        """
        Employment type preference score (0 - 100).
        """
        if not candidate_preferred_type or not job_employment_type:
            return 85.0
        pref = candidate_preferred_type.upper().replace("-", "_").replace(" ", "_")
        job_type = job_employment_type.upper().replace("-", "_").replace(" ", "_")
        if pref == job_type:
            return 100.0
        return 50.0

    def compute_final_weighted_score(
        self,
        *,
        skill_score: float,
        experience_score: float,
        similarity_score: float,
        project_score: float,
        llm_score: Optional[float] = None,
        education_score: Optional[float] = None,
        certifications_score: Optional[float] = None,
        jd_alignment_score: Optional[float] = None,
        weights: Optional[ScoringWeightsConfig] = None,
    ) -> float:
        """
        Calculates final deterministic recruiter score based on specification:
        - Skills Match: 40%
        - Relevant Experience: 25%
        - Project Relevance: 15%
        - Education Match: 10%
        - Certifications: 5%
        - Job Description Alignment: 5%
        """
        if weights is None:
            weights = ScoringWeightsConfig()

        edu = education_score if education_score is not None else 80.0
        cert = certifications_score if certifications_score is not None else 75.0
        jd = jd_alignment_score if jd_alignment_score is not None else (
            self.compute_jd_alignment_score(similarity_score=similarity_score, llm_score=llm_score)
        )

        # Check if caller supplied legacy weights
        has_legacy = any([
            weights.skill_weight is not None,
            weights.experience_weight is not None,
            weights.semantic_weight is not None,
            weights.llm_weight is not None,
            weights.project_weight is not None,
        ])

        if has_legacy:
            w_skill = max(0.0, float(weights.skill_weight if weights.skill_weight is not None else 0.35))
            w_exp = max(0.0, float(weights.experience_weight if weights.experience_weight is not None else 0.20))
            w_sem = max(0.0, float(weights.semantic_weight if weights.semantic_weight is not None else 0.20))
            w_llm = max(0.0, float(weights.llm_weight if weights.llm_weight is not None else 0.15))
            w_proj = max(0.0, float(weights.project_weight if weights.project_weight is not None else 0.10))

            effective_llm = float(llm_score) if llm_score is not None else jd
            total = w_skill + w_exp + w_sem + w_llm + w_proj
            if total <= 0:
                total = 1.0
            score = (
                (float(skill_score) * w_skill)
                + (float(experience_score) * w_exp)
                + (float(similarity_score) * w_sem)
                + (effective_llm * w_llm)
                + (float(project_score) * w_proj)
            ) / total
            return round(min(100.0, max(0.0, score)), 2)

        # Specification 6-criteria Recruiter Weights
        w_skills = max(0.0, float(weights.skills_match_weight))
        w_exp = max(0.0, float(weights.relevant_experience_weight))
        w_proj = max(0.0, float(weights.project_relevance_weight))
        w_edu = max(0.0, float(weights.education_match_weight))
        w_cert = max(0.0, float(weights.certifications_weight))
        w_jd = max(0.0, float(weights.jd_alignment_weight))

        total_weight = w_skills + w_exp + w_proj + w_edu + w_cert + w_jd
        if total_weight <= 0.0:
            total_weight = 1.0

        weighted_sum = (
            (float(skill_score) * w_skills)
            + (float(experience_score) * w_exp)
            + (float(project_score) * w_proj)
            + (float(edu) * w_edu)
            + (float(cert) * w_cert)
            + (float(jd) * w_jd)
        )
        final = weighted_sum / total_weight
        return round(min(100.0, max(0.0, final)), 2)

    def compute_candidate_job_score(
        self,
        *,
        skill_score: float,
        experience_score: float,
        jd_relevance_score: float,
        location_score: float,
        education_score: float,
        employment_type_score: float,
    ) -> float:
        """
        Specification Candidate Recommendation Weights:
        - Skills Match: 40%
        - Experience Match: 25%
        - Job Description Relevance: 15%
        - Location Preference: 10%
        - Education Match: 5%
        - Employment Type Preference: 5%
        Total: 100%
        """
        final = (
            (float(skill_score) * 0.40)
            + (float(experience_score) * 0.25)
            + (float(jd_relevance_score) * 0.15)
            + (float(location_score) * 0.10)
            + (float(education_score) * 0.05)
            + (float(employment_type_score) * 0.05)
        )
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
