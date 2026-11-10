# AI Recruitment Engine (`LLM/`)

Dedicated Python microservice for AI-driven recruitment workflows:
1. **Resume Processing Engine** (`resume_processing_queue`): PDF validation & text extraction (with OCR fallback for scanned PDFs), text cleaning, structured candidate profile extraction (`ai.candidate_profiles`), skill normalization (`ReactJS -> React.js`, `Postgres -> PostgreSQL`, etc.), and candidate vector embeddings (`ai.candidate_embeddings`).
2. **AI Resume Matching Engine** (`ai_matching_queue`): Multi-stage matching funnel that filters active job applications (`excluding WITHDRAWN/REJECTED`), applies configurable hard/soft eligibility criteria, executes `pgvector` cosine similarity search (`<=>`), shortlists the top $N$ candidates (default `40`), evaluates shortlisted candidates with structured Gemini prompts (`GeminiCandidateEvaluationSchema`), and caches results in `ai.match_results` & `ai.match_evaluations`.
3. **AI Candidate Ranking Engine**: Reusable ranking service that re-ranks candidates using existing processed resumes, embeddings, and cached Gemini evaluations without redundant LLM calls, supporting custom recruiter weight configurations and deterministic tie-breaking.
4. **AI Job Recommendations Engine**: Recommends active `PUBLISHED` jobs from `APPROVED` companies for candidates using `pgvector` semantic similarity, skill overlap, and experience fit, cached in `ai.job_recommendations_cache`.

---

## Architecture & Service Boundary

- **Node.js Backend (`backend/`)**: Remains the primary public API gateway and source of truth for authentication, RBAC, company membership, job ownership, and transactional recruitment workflows.
- **Python AI Service (`LLM/`)**: Internal service accessible only via HMAC-verified (`X-Internal-Secret`) endpoints under `/internal/v1/*`. React never communicates with the Python service directly.
- **Shared PostgreSQL Database**:
  - `public` schema: Core recruitment tables managed by Node.js/Prisma (`users`, `companies`, `jobs`, `applications`, `candidate_resumes`, `candidate_profiles`, etc.).
  - `ai` schema: Dedicated AI tables (`ai.outbox_events`, `ai.resume_processing`, `ai.candidate_profiles`, `ai.candidate_embeddings`, `ai.job_embeddings`, `ai.ai_job_logs`, `ai.match_results`, `ai.match_evaluations`, `ai.job_recommendations_cache`, `ai.ai_usage_logs`) with `pgvector` (`vector(768)`) HNSW indexes.

---

## Directory Structure

```text
LLM/
├── app/
│   ├── main.py                      # FastAPI application entrypoint
│   ├── core/
│   │   ├── config.py                # Environment configuration & budgets
│   │   ├── database.py              # SQLAlchemy 2.0 engine & session management
│   │   ├── logging.py               # Structured logging
│   │   └── security.py              # X-Internal-Secret HMAC verification
│   ├── api/v1/
│   │   ├── resume_routes.py         # POST /internal/v1/resumes/process, GET /status
│   │   ├── matching_routes.py       # POST /internal/v1/matching, GET /{id}, POST /retry
│   │   ├── ranking_routes.py        # POST /internal/v1/ranking, GET /jobs/{id}/ranking
│   │   └── recommendation_routes.py # POST /internal/v1/recommendations
│   ├── services/
│   │   ├── resume/                  # PDF extractor, text cleaner, info extractor, processor
│   │   ├── embeddings/              # Candidate/job embedding service & pgvector search
│   │   ├── matching/                # Eligibility filter, scoring service, matching pipeline
│   │   ├── ranking/                 # Reusable candidate ranking service
│   │   ├── recommendations/         # Candidate-to-job recommendation engine
│   │   └── gemini/                  # Centralized Gemini client, prompts, parser, usage tracker
│   ├── workers/
│   │   ├── celery_app.py            # Celery configuration (resume & matching queues)
│   │   ├── resume_tasks.py          # Background resume processing worker tasks
│   │   └── matching_tasks.py        # Background AI matching worker tasks
│   ├── models/                      # SQLAlchemy 2.0 ORM models (`ai` schema)
│   ├── schemas/                     # Pydantic v2 request/response & LLM validation schemas
│   └── utils/                       # Skill normalizer, text cleaner, version hash helpers
├── migrations/                      # Alembic migration environment & revisions
├── tests/                           # Automated pytest unit & integration test suite
├── requirements.txt
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## Setup & Running Locally

### 1. Install Python Dependencies
```bash
cd LLM
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your PostgreSQL, Redis, internal secret, and Gemini API credentials:
```bash
cp .env.example .env
```

### 3. Run Database Migrations (`pgvector` + `ai` Schema)
```bash
alembic upgrade head
```

### 4. Start the FastAPI Internal Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Start Celery Workers (Separate Queues)
```bash
# Resume Processing Worker
celery -A app.workers.celery_app worker -Q resume_processing_queue -c 4 --loglevel=info

# AI Matching Worker
celery -A app.workers.celery_app worker -Q ai_matching_queue -c 2 --loglevel=info
```

### 6. Run Automated Tests
```bash
python -m pytest tests/test_ai_engine.py -v
```
