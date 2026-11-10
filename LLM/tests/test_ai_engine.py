import base64
import io
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from sqlalchemy import text

# Ensure LLM root is on sys.path
LLM_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = LLM_ROOT.parent
if str(LLM_ROOT) not in sys.path:
    sys.path.insert(0, str(LLM_ROOT))


def build_valid_pdf_bytes(text_content: str) -> bytes:
    """
    Constructs a valid minimal single-page PDF containing `text_content` in a content stream
    so pypdf / PyMuPDF extracts it cleanly.
    """
    escaped = (
        text_content.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )
    lines = escaped.splitlines() or [escaped]
    stream_ops = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"]
    for idx, line in enumerate(lines):
        if idx == 0:
            stream_ops.append(f"({line}) Tj")
        else:
            stream_ops.append(f"T* ({line}) Tj")
    stream_ops.append("ET")
    stream_data = "\n".join(stream_ops).encode("latin-1", errors="ignore")

    objs: List[bytes] = []
    objs.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objs.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objs.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    )
    objs.append(
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    )
    objs.append(
        f"5 0 obj\n<< /Length {len(stream_data)} >>\nstream\n".encode("ascii")
        + stream_data
        + b"\nendstream\nendobj\n"
    )

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objs:
        offsets.append(len(out))
        out.extend(obj)

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(out)


def build_blank_scanned_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.fixture(scope="session")
def pg_test_db(tmp_path_factory):
    """
    Uses pre-started PGlite server when PGLITE_EXTERNAL_SERVER=1 is set,
    or starts an in-process PGlite + pgvector socket server via Node.js.
    """
    if os.environ.get("PGLITE_EXTERNAL_SERVER") == "1" and os.environ.get("DATABASE_URL"):
        db_url = os.environ["DATABASE_URL"]
        os.environ["APP_ENV"] = "test"
        os.environ["DB_POOL_SIZE"] = "1"
        os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"
        os.environ["INTERNAL_API_SECRET"] = "test_internal_secret_2026"
        from app.core.config import reload_settings
        from app.core.database import get_engine

        reload_settings()
        get_engine()
        yield db_url
        return

    import time

    tmp_dir = tmp_path_factory.mktemp("pglite")
    url_file = tmp_dir / "db_url.txt"
    log_file = tmp_dir / "pglite.log"

    node_script = (
        "const fs = require('fs');\n"
        "const { startTestDatabase } = require('./tests/helpers/testDb');\n"
        "(async () => {\n"
        "  const srv = await startTestDatabase();\n"
        f"  fs.writeFileSync({json.dumps(str(url_file))}, srv.url, 'utf8');\n"
        "  setInterval(() => {}, 10000);\n"
        "  process.on('SIGTERM', async () => { await srv.stop(); process.exit(0); });\n"
        "})().catch(err => { console.error(err); process.exit(1); });\n"
    )
    log_fh = open(log_file, "w", encoding="utf-8")
    proc = subprocess.Popen(
        ["node", "-e", node_script],
        cwd=str(PROJECT_ROOT / "backend"),
        stdin=subprocess.DEVNULL,
        stdout=log_fh,
        stderr=log_fh,
        text=True,
    )
    db_url = None
    for _ in range(120):
        if url_file.exists():
            raw_url = url_file.read_text(encoding="utf-8").strip()
            if raw_url:
                db_url = (
                    raw_url.replace("postgres://", "postgresql+psycopg://")
                    + "?sslmode=disable&gssencmode=disable"
                )
                break
        if proc.poll() is not None:
            break
        time.sleep(0.25)

    if not db_url:
        log_fh.flush()
        err_out = log_file.read_text(encoding="utf-8") if log_file.exists() else ""
        proc.kill()
        log_fh.close()
        raise RuntimeError(f"Failed to start PGlite test server: {err_out}")

    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = db_url
    os.environ["DB_POOL_SIZE"] = "1"
    os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"
    os.environ["INTERNAL_API_SECRET"] = "test_internal_secret_2026"

    from app.core.config import reload_settings
    from app.core.database import get_engine

    reload_settings()
    get_engine()

    yield db_url

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    log_fh.close()



@pytest.fixture()
def client(pg_test_db):
    from app.main import app

    return TestClient(app)


@pytest.fixture()
def auth_headers():
    return {"X-Internal-Secret": "test_internal_secret_2026"}


def seed_company_and_jobs(db) -> Dict[str, UUID]:
    owner_a = uuid4()
    owner_b = uuid4()
    company_a = uuid4()
    company_b = uuid4()
    job_published_a = uuid4()
    job_draft_a = uuid4()
    job_published_b = uuid4()

    db.execute(
        text(
            """
            INSERT INTO public.users (id, full_name, email, password_hash, role, status)
            VALUES
              (:oa, 'Recruiter Alpha', :ea, 'hash', 'recruiter', 'active'),
              (:ob, 'Recruiter Beta', :eb, 'hash', 'recruiter', 'active')
            """
        ),
        {
            "oa": str(owner_a),
            "ea": f"alpha_{owner_a}@test.com",
            "ob": str(owner_b),
            "eb": f"beta_{owner_b}@test.com",
        },
    )

    db.execute(
        text(
            """
            INSERT INTO public.companies (id, owner_id, name, status)
            VALUES
              (:ca, :oa, 'Alpha Tech Corp', 'APPROVED'),
              (:cb, :ob, 'Beta Systems Inc', 'APPROVED')
            """
        ),
        {
            "ca": str(company_a),
            "oa": str(owner_a),
            "cb": str(company_b),
            "ob": str(owner_b),
        },
    )

    db.execute(
        text(
            """
            INSERT INTO public.jobs (
              id, company_id, created_by, job_title, job_description,
              required_skills, preferred_skills, min_experience, max_experience,
              employment_type, work_mode, city, state, country, status, published_at
            )
            VALUES
              (
                :jp_a, :ca, :oa, 'Senior Full Stack Engineer',
                'Build scalable web apps using React.js, Node.js, PostgreSQL, Redis, and Docker.',
                ARRAY['React.js', 'Node.js', 'PostgreSQL'],
                ARRAY['Docker', 'Redis', 'TypeScript'],
                3.0, 8.0, 'FULL_TIME', 'HYBRID', 'Bengaluru', 'Karnataka', 'India', 'PUBLISHED', NOW()
              ),
              (
                :jd_a, :ca, :oa, 'Stealth Draft Role',
                'Internal draft role for React.js and Node.js.',
                ARRAY['React.js', 'Node.js'],
                ARRAY[]::TEXT[],
                1.0, 5.0, 'FULL_TIME', 'REMOTE', 'Bengaluru', 'Karnataka', 'India', 'DRAFT', NULL
              ),
              (
                :jp_b, :cb, :ob, 'Python AI Backend Engineer',
                'Design FastAPI and PyTorch microservices with PostgreSQL and pgvector.',
                ARRAY['Python', 'FastAPI', 'PostgreSQL'],
                ARRAY['PyTorch', 'Docker'],
                2.0, 6.0, 'FULL_TIME', 'REMOTE', 'Hyderabad', 'Telangana', 'India', 'PUBLISHED', NOW()
              )
            """
        ),
        {
            "jp_a": str(job_published_a),
            "jd_a": str(job_draft_a),
            "jp_b": str(job_published_b),
            "ca": str(company_a),
            "oa": str(owner_a),
            "cb": str(company_b),
            "ob": str(owner_b),
        },
    )
    db.commit()
    return {
        "owner_a": owner_a,
        "owner_b": owner_b,
        "company_a": company_a,
        "company_b": company_b,
        "job_published_a": job_published_a,
        "job_draft_a": job_draft_a,
        "job_published_b": job_published_b,
    }


def create_candidate_with_resume(
    db,
    *,
    full_name: str,
    skills: List[str],
    years_exp: float,
    version: int = 1,
    candidate_id: UUID | None = None,
) -> Dict[str, UUID]:
    cid = candidate_id or uuid4()
    rid = uuid4()

    existing_user = db.execute(
        text("SELECT id FROM public.users WHERE id = :id"), {"id": str(cid)}
    ).first()
    if not existing_user:
        db.execute(
            text(
                """
                INSERT INTO public.users (id, full_name, email, password_hash, role, status)
                VALUES (:id, :name, :email, 'hash', 'candidate', 'active')
                """
            ),
            {"id": str(cid), "name": full_name, "email": f"cand_{cid}@test.com"},
        )
        db.execute(
            text(
                """
                INSERT INTO public.candidate_profiles (user_id, headline, bio, skills, years_of_experience, location)
                VALUES (:id, :headline, :bio, :skills, :exp, 'Bengaluru, India')
                """
            ),
            {
                "id": str(cid),
                "headline": f"{full_name} - Software Engineer",
                "bio": f"Experienced engineer skilled in {', '.join(skills)}",
                "skills": skills,
                "exp": years_exp,
            },
        )

    db.execute(
        text(
            """
            UPDATE public.candidate_resumes
            SET is_primary = FALSE, is_latest_version = FALSE
            WHERE candidate_id = :cid
            """
        ),
        {"cid": str(cid)},
    )

    db.execute(
        text(
            """
            INSERT INTO public.candidate_resumes (
              id, candidate_id, original_file_name, stored_file_name, storage_key,
              file_type, mime_type, file_size, version, is_latest_version, is_primary, resume_status
            )
            VALUES (
              :rid, :cid, 'resume.pdf', 'resume.pdf', :skey,
              'PDF', 'application/pdf', 2048, :ver, TRUE, TRUE, 'NOT_PROCESSED'
            )
            """
        ),
        {
            "rid": str(rid),
            "cid": str(cid),
            "skey": f"{cid}/{rid}.pdf",
            "ver": version,
        },
    )
    db.commit()
    return {"candidate_id": cid, "resume_id": rid}


def test_01_internal_auth_and_health(client, auth_headers):
    # Health check is accessible
    health_res = client.get("/internal/v1/health")
    assert health_res.status_code == 200
    body = health_res.json()
    assert body["success"] is True
    assert body["database"] == "ok"
    assert body["pgvector"] is True

    # Missing or invalid X-Internal-Secret is rejected with 401
    unauth_res = client.post("/internal/v1/resumes/process", json={"resume_id": str(uuid4())})
    assert unauth_res.status_code == 401

    bad_secret_res = client.post(
        "/internal/v1/resumes/process",
        headers={"X-Internal-Secret": "wrong_secret"},
        json={"resume_id": str(uuid4())},
    )
    assert bad_secret_res.status_code == 401


def test_02_pdf_extractor_and_skill_normalizer():
    from app.services.resume.pdf_extractor import PDFExtractor, ResumeExtractionError
    from app.utils.skill_normalizer import default_skill_normalizer, normalize_skill_list

    # Skill normalization aliases & distinct languages
    normalized = normalize_skill_list(
        ["ReactJS", "react.js", "NodeJS", "Postgres", "Java", "JavaScript", "k8s"]
    )
    assert "React.js" in normalized
    assert "Node.js" in normalized
    assert "PostgreSQL" in normalized
    assert "Java" in normalized
    assert "JavaScript" in normalized
    assert "Kubernetes" in normalized
    assert normalized.count("React.js") == 1

    extractor = PDFExtractor()

    # 1. Empty PDF rejected
    with pytest.raises(ResumeExtractionError) as exc_empty:
        extractor.extract_from_bytes(b"", file_type="PDF")
    assert exc_empty.value.code == "EMPTY_PDF"

    # 2. Corrupted PDF rejected
    with pytest.raises(ResumeExtractionError) as exc_corrupt:
        extractor.extract_from_bytes(b"NOT_A_VALID_PDF_HEADER_12345", file_type="PDF")
    assert exc_corrupt.value.code == "CORRUPTED_PDF"

    # 3. Scanned blank PDF without OCR fails with EMPTY_PDF_TEXT/SCANNED_PDF_UNREADABLE, with OCR callback succeeds
    blank_pdf = build_blank_scanned_pdf_bytes()
    with pytest.raises(ResumeExtractionError) as exc_scanned:
        extractor.extract_from_bytes(blank_pdf, file_type="PDF")
    assert exc_scanned.value.code in ("EMPTY_PDF_TEXT", "SCANNED_PDF_UNREADABLE")

    ocr_extractor = PDFExtractor(
        ocr_callback=lambda _bytes: "OCR Extracted Candidate Name\nSkills: Python, FastAPI, PostgreSQL, Docker\nExperience: 4 years"
    )
    ocr_res = ocr_extractor.extract_from_bytes(blank_pdf, file_type="PDF")
    assert ocr_res.is_scanned is True
    assert ocr_res.ocr_used is True
    assert "FastAPI" in ocr_res.text


def test_03_resume_processing_deduplication_and_version_invalidation(client, auth_headers):
    from app.core.database import session_scope
    from app.models.embedding import CandidateEmbedding

    with session_scope() as db:
        seeded = create_candidate_with_resume(
            db,
            full_name="Aarav Sharma",
            skills=["ReactJS", "NodeJS", "Postgres", "Docker"],
            years_exp=4.5,
            version=1,
        )
        cid = seeded["candidate_id"]
        rid_v1 = seeded["resume_id"]

    pdf_v1 = build_valid_pdf_bytes(
        "Aarav Sharma\nSenior Full Stack Developer\n"
        "Skills: ReactJS, NodeJS, Postgres, Docker, TypeScript\n"
        "Work Experience: 4.5 years building React.js and Node.js microservices.\n"
        "Education: B.Tech Computer Science"
    )
    b64_v1 = base64.b64encode(pdf_v1).decode("ascii")

    # First processing call -> COMPLETED, cached=False
    res1 = client.post(
        "/internal/v1/resumes/process",
        headers=auth_headers,
        json={
            "resume_id": str(rid_v1),
            "candidate_id": str(cid),
            "resume_version": 1,
            "content_base64": b64_v1,
            "async_execution": False,
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "COMPLETED"
    assert data1["cached"] is False

    # Second identical call -> reuses cached processing & embeddings (cached=True)
    res2 = client.post(
        "/internal/v1/resumes/process",
        headers=auth_headers,
        json={
            "resume_id": str(rid_v1),
            "candidate_id": str(cid),
            "resume_version": 1,
            "content_base64": b64_v1,
            "async_execution": False,
        },
    )
    assert res2.status_code == 200
    assert res2.json()["cached"] is True

    # Upload resume v2 for the same candidate -> invalidates v1 active embeddings
    with session_scope() as db:
        seeded_v2 = create_candidate_with_resume(
            db,
            full_name="Aarav Sharma",
            skills=["React.js", "Node.js", "PostgreSQL", "Kubernetes", "AWS"],
            years_exp=5.0,
            version=2,
            candidate_id=cid,
        )
        rid_v2 = seeded_v2["resume_id"]

    pdf_v2 = build_valid_pdf_bytes(
        "Aarav Sharma\nLead Full Stack Architect\n"
        "Skills: React.js, Node.js, PostgreSQL, Kubernetes, AWS, Redis\n"
        "Work Experience: 5 years leading distributed cloud systems.\n"
    )
    res_v2 = client.post(
        "/internal/v1/resumes/process",
        headers=auth_headers,
        json={
            "resume_id": str(rid_v2),
            "candidate_id": str(cid),
            "resume_version": 2,
            "content_base64": base64.b64encode(pdf_v2).decode("ascii"),
            "async_execution": False,
        },
    )
    assert res_v2.status_code == 200
    assert res_v2.json()["status"] == "COMPLETED"

    with session_scope() as db:
        v1_embs = (
            db.query(CandidateEmbedding)
            .filter(
                CandidateEmbedding.candidate_id == cid,
                CandidateEmbedding.resume_version == 1,
            )
            .all()
        )
        v2_embs = (
            db.query(CandidateEmbedding)
            .filter(
                CandidateEmbedding.candidate_id == cid,
                CandidateEmbedding.resume_version == 2,
            )
            .all()
        )
        assert len(v1_embs) > 0 and all(not e.is_active for e in v1_embs)
        assert len(v2_embs) > 0 and all(e.is_active for e in v2_embs)

    # Status endpoint returns extracted profile
    status_res = client.get(f"/internal/v1/resumes/{rid_v2}/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_body = status_res.json()
    assert status_body["status"] == "COMPLETED"
    assert "React.js" in status_body["extracted_profile"]["normalized_skills"]


def test_04_matching_500_candidates_shortlist_and_tenant_isolation(client, auth_headers):
    """
    Verifies:
    1. Multi-tenant isolation: Company B cannot match or view Company A's job.
    2. When a job has 500 applications (including WITHDRAWN/REJECTED), WITHDRAWN/REJECTED are excluded,
       vector search + deterministic filtering runs across all eligible candidates, and ONLY the
       shortlisted top N (e.g., shortlist_size=8) are sent to Gemini evaluation!
    3. Re-running matching with unchanged resumes & job reuses cached MatchEvaluation rows (0 new Gemini calls).
    """
    from app.core.database import session_scope
    from app.services.gemini.gemini_client import gemini_client

    gemini_call_counter = {"count": 0}

    def mock_gemini_eval(prompt: str, model_name: str) -> Dict[str, Any]:
        gemini_call_counter["count"] += 1
        return {
            "text": json.dumps(
                {
                    "overall_compatibility_score": 88.5,
                    "skill_compatibility_score": 92.0,
                    "experience_compatibility_score": 85.0,
                    "project_relevance_score": 84.0,
                    "strengths": [
                        "Strong production experience with React.js, Node.js, and PostgreSQL",
                        "Solid cloud containerization background with Docker and Redis",
                    ],
                    "weaknesses": ["Could expand Kubernetes cluster administration depth"],
                    "missing_skills": [],
                    "matched_skills": ["React.js", "Node.js", "PostgreSQL", "Docker", "Redis"],
                    "evidence": [
                        {
                            "claim": "Full-stack React.js and Node.js production experience",
                            "resume_excerpt": "Built scalable web apps with React.js, Node.js, PostgreSQL, and Docker",
                            "section": "experience",
                        }
                    ],
                    "recommendation_category": "STRONG_MATCH",
                    "summary_explanation": "Excellent full-stack match with verified React.js, Node.js, and PostgreSQL experience.",
                }
            ),
            "input_tokens": 350,
            "output_tokens": 140,
        }

    gemini_client.set_custom_handlers(generate_fn=mock_gemini_eval)

    try:
        with session_scope() as db:
            env = seed_company_and_jobs(db)
            job_id = env["job_published_a"]
            company_a = env["company_a"]
            company_b = env["company_b"]

            user_rows = []
            profile_rows = []
            resume_rows = []
            ai_profile_rows = []
            emb_rows = []
            app_rows = []

            base_vec = gemini_client.deterministic_local_embedding(
                "React.js Node.js PostgreSQL Docker Redis TypeScript Full Stack Engineer", 768
            )
            vec_literal = "[" + ",".join(f"{v:.6f}" for v in base_vec) + "]"

            for i in range(500):
                cid = uuid4()
                rid = uuid4()
                aid = uuid4()
                if i < 5:
                    app_status = "WITHDRAWN"
                elif i < 10:
                    app_status = "REJECTED"
                else:
                    app_status = "SUBMITTED"

                if 10 <= i < 35:
                    skills = ["React.js", "Node.js", "PostgreSQL", "Docker", "Redis"]
                    exp_yrs = 4.0 + (i % 4)
                else:
                    skills = ["Python", "Flask"] if (i % 2 == 0) else ["React.js", "HTML5"]
                    exp_yrs = 2.0

                user_rows.append(
                    {
                        "id": str(cid),
                        "name": f"Applicant {i}",
                        "email": f"applicant_{i}_{cid}@test.com",
                    }
                )
                profile_rows.append(
                    {
                        "uid": str(cid),
                        "skills": skills,
                        "exp": exp_yrs,
                    }
                )
                resume_rows.append(
                    {
                        "rid": str(rid),
                        "cid": str(cid),
                        "skey": f"{cid}/{rid}.pdf",
                    }
                )
                ai_profile_rows.append(
                    {
                        "id": str(uuid4()),
                        "cid": str(cid),
                        "rid": str(rid),
                        "hash": f"hash_{cid}",
                        "name": f"Applicant {i}",
                        "exp": exp_yrs,
                        "text": f"Applicant {i} built scalable web apps with {', '.join(skills)} for {exp_yrs} years.",
                        "skills_json": json.dumps(skills),
                    }
                )
                emb_rows.append(
                    {
                        "id": str(uuid4()),
                        "cid": str(cid),
                        "rid": str(rid),
                        "hash": f"hash_{cid}",
                        "vec": vec_literal,
                    }
                )
                app_rows.append(
                    {
                        "id": str(aid),
                        "jid": str(job_id),
                        "cid": str(cid),
                        "comp_id": str(company_a),
                        "rid": str(rid),
                        "status": app_status,
                    }
                )

            db.execute(
                text(
                    """
                    INSERT INTO public.users (id, full_name, email, password_hash, role, status)
                    VALUES (:id, :name, :email, 'hash', 'candidate', 'active')
                    """
                ),
                user_rows,
            )
            db.execute(
                text(
                    """
                    INSERT INTO public.candidate_profiles (user_id, skills, years_of_experience, location)
                    VALUES (:uid, :skills, :exp, 'Bengaluru, India')
                    """
                ),
                profile_rows,
            )
            db.execute(
                text(
                    """
                    INSERT INTO public.candidate_resumes (
                      id, candidate_id, original_file_name, stored_file_name, storage_key,
                      file_type, mime_type, file_size, version, is_latest_version, is_primary, resume_status
                    )
                    VALUES (
                      CAST(:rid AS uuid), CAST(:cid AS uuid), 'resume.pdf', 'resume.pdf', :skey,
                      'PDF', 'application/pdf', 2048, 1, TRUE, TRUE, 'TEXT_EXTRACTED'
                    )
                    """
                ),
                resume_rows,
            )
            db.execute(
                text(
                    """
                    INSERT INTO ai.candidate_profiles (
                      id, candidate_id, resume_id, resume_version, content_hash, is_latest,
                      full_name, location, total_experience_years, extracted_text, cleaned_text,
                      technical_skills, normalized_skills
                    )
                    VALUES (
                      CAST(:id AS uuid), CAST(:cid AS uuid), CAST(:rid AS uuid), 1, :hash, TRUE,
                      :name, 'Bengaluru, India', :exp, :text, :text,
                      CAST(:skills_json AS jsonb), CAST(:skills_json AS jsonb)
                    )
                    """
                ),
                ai_profile_rows,
            )
            db.execute(
                text(
                    """
                    INSERT INTO ai.candidate_embeddings (
                      id, candidate_id, resume_id, resume_version, content_hash,
                      embedding_type, model_name, dimension, embedding, source_text_hash, is_active
                    )
                    VALUES (
                      CAST(:id AS uuid), CAST(:cid AS uuid), CAST(:rid AS uuid), 1, :hash,
                      'FULL_PROFILE', 'text-embedding-004', 768, CAST(:vec AS vector), :hash, TRUE
                    )
                    """
                ),
                emb_rows,
            )
            db.execute(
                text(
                    """
                    INSERT INTO public.applications (id, job_id, candidate_id, company_id, resume_id, status)
                    VALUES (
                      CAST(:id AS uuid), CAST(:jid AS uuid), CAST(:cid AS uuid),
                      CAST(:comp_id AS uuid), CAST(:rid AS uuid), :status
                    )
                    """
                ),
                app_rows,
            )

        # 1. Cross-company access attempt by Company B on Company A's job -> 403 FORBIDDEN
        cross_res = client.post(
            "/internal/v1/matching",
            headers={**auth_headers, "X-Company-Id": str(company_b)},
            json={
                "job_id": str(job_id),
                "company_id": str(company_b),
                "top_k": 5,
                "shortlist_size": 8,
                "async_execution": False,
            },
        )
        assert cross_res.status_code == 403

        # 2. Authorized matching run for Company A on 500 total applications with shortlist_size=8
        match_res = client.post(
            "/internal/v1/matching",
            headers={**auth_headers, "X-Company-Id": str(company_a)},
            json={
                "job_id": str(job_id),
                "company_id": str(company_a),
                "top_k": 5,
                "shortlist_size": 8,
                "async_execution": False,
            },
        )
        assert match_res.status_code == 200
        match_body = match_res.json()
        assert match_body["status"] == "COMPLETED"
        assert match_body["progress"]["total_applications"] == 490
        assert match_body["progress"]["eligible_candidates"] == 490
        assert gemini_call_counter["count"] == 8
        assert len(match_body["results"]) == 5
        top_cand = match_body["results"][0]
        assert top_cand["rank"] == 1
        assert top_cand["overall_score"] >= 80.0
        assert "React.js" in top_cand["matched_skills"]
        assert len(top_cand["evidence"]) >= 1

        # 3. Re-running matching without force_refresh reuses cached evaluations (0 new Gemini calls)
        gemini_call_counter["count"] = 0
        match_res_cached = client.post(
            "/internal/v1/matching",
            headers={**auth_headers, "X-Company-Id": str(company_a)},
            json={
                "job_id": str(job_id),
                "company_id": str(company_a),
                "top_k": 5,
                "shortlist_size": 8,
                "force_refresh": False,
                "async_execution": False,
            },
        )
        assert match_res_cached.status_code == 200
        assert gemini_call_counter["count"] == 0
        assert match_res_cached.json()["results"][0]["cached_evaluation"] is True

        # 4. Ranking engine re-ranks with custom recruiter weights without calling Gemini
        rank_res = client.post(
            "/internal/v1/ranking",
            headers={**auth_headers, "X-Company-Id": str(company_a)},
            json={
                "job_id": str(job_id),
                "company_id": str(company_a),
                "top_k": 10,
                "weights": {
                    "skill_weight": 0.50,
                    "experience_weight": 0.25,
                    "semantic_weight": 0.15,
                    "llm_weight": 0.05,
                    "project_weight": 0.05,
                },
            },
        )
        assert rank_res.status_code == 200
        rank_body = rank_res.json()
        assert rank_body["total_ranked"] == 490
        assert len(rank_body["candidates"]) == 10
        assert gemini_call_counter["count"] == 0
        scores = [c["overall_score"] for c in rank_body["candidates"]]
        assert scores == sorted(scores, reverse=True)
    finally:
        gemini_client.set_custom_handlers(generate_fn=None, embed_fn=None)


def test_05_job_recommendations_and_caching(client, auth_headers):
    """
    Verifies:
    1. Only PUBLISHED jobs from APPROVED companies are recommended (DRAFT jobs are never recommended).
    2. Candidate receives explainable job recommendations ranked by semantic + skill + experience fit.
    3. Subsequent call returns cached recommendations (`cached=True`).
    """
    from app.core.database import session_scope

    with session_scope() as db:
        env = seed_company_and_jobs(db)
        seeded = create_candidate_with_resume(
            db,
            full_name="Priya Nair",
            skills=["React.js", "Node.js", "PostgreSQL", "Docker", "TypeScript"],
            years_exp=4.0,
            version=1,
        )
        cid = seeded["candidate_id"]
        rid = seeded["resume_id"]

    pdf_bytes = build_valid_pdf_bytes(
        "Priya Nair\nSenior Full Stack Engineer\n"
        "Skills: React.js, Node.js, PostgreSQL, Docker, TypeScript, Redis\n"
        "Experience: 4 years building web applications."
    )
    client.post(
        "/internal/v1/resumes/process",
        headers=auth_headers,
        json={
            "resume_id": str(rid),
            "candidate_id": str(cid),
            "resume_version": 1,
            "content_base64": base64.b64encode(pdf_bytes).decode("ascii"),
            "async_execution": False,
        },
    )

    rec_res = client.post(
        "/internal/v1/recommendations",
        headers=auth_headers,
        json={
            "candidate_id": str(cid),
            "limit": 10,
            "force_refresh": False,
        },
    )
    assert rec_res.status_code == 200
    rec_body = rec_res.json()
    assert rec_body["cached"] is False
    assert rec_body["total_recommendations"] >= 1

    rec_job_ids = [r["job_id"] for r in rec_body["recommendations"]]
    assert str(env["job_published_a"]) in rec_job_ids
    assert str(env["job_draft_a"]) not in rec_job_ids

    rec_res_2 = client.post(
        "/internal/v1/recommendations",
        headers=auth_headers,
        json={
            "candidate_id": str(cid),
            "limit": 10,
            "force_refresh": False,
        },
    )
    assert rec_res_2.status_code == 200
    assert rec_res_2.json()["cached"] is True

