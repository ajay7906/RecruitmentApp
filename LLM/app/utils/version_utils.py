import hashlib
import json
from typing import Any, Dict, List


def compute_sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data or b"").hexdigest()


def compute_sha256_text(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def compute_job_version_hash(job_row: Dict[str, Any]) -> str:
    """
    Computes a deterministic version hash from a job's matching-relevant fields
    (title, description, required_skills, preferred_skills, min_experience, max_experience,
    employment_type, work_mode, location).
    If `content_hash` is already present and up to date, incorporates it.
    """
    payload = {
        "title": (job_row.get("job_title") or job_row.get("title") or "").strip(),
        "description": (job_row.get("job_description") or job_row.get("description") or "").strip(),
        "required_skills": sorted(
            [str(s).strip().lower() for s in (job_row.get("required_skills") or []) if str(s).strip()]
        ),
        "preferred_skills": sorted(
            [str(s).strip().lower() for s in (job_row.get("preferred_skills") or []) if str(s).strip()]
        ),
        "min_experience": float(job_row.get("min_experience") or 0),
        "max_experience": (
            float(job_row["max_experience"])
            if job_row.get("max_experience") is not None
            else None
        ),
        "employment_type": (job_row.get("employment_type") or "").strip().lower(),
        "work_mode": (job_row.get("work_mode") or "").strip().lower(),
        "city": (job_row.get("city") or "").strip().lower(),
        "country": (job_row.get("country") or "").strip().lower(),
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:32]


def compute_scoring_config_hash(weights: Dict[str, float], base_version: str = "v1") -> str:
    normalized = {k: round(float(v), 4) for k, v in sorted((weights or {}).items())}
    digest = hashlib.sha256(json.dumps(normalized, sort_keys=True).encode("utf-8")).hexdigest()[:12]
    return f"{base_version}:{digest}"


def compute_jobs_state_hash(job_versions: List[Any]) -> str:
    items = [
        json.dumps(item, sort_keys=True) if isinstance(item, dict) else str(item)
        for item in (job_versions or [])
    ]
    joined = "|".join(sorted(items))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:32]


def compute_config_version_hash(config_dict: Dict[str, Any], base_version: str = "v1") -> str:
    serialized = json.dumps(config_dict or {}, sort_keys=True, default=str)
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:12]
    return f"{base_version}:{digest}"

