-- =============================================================================
-- Migration 011: AI Recruitment Engine Schema (`ai`) & pgvector Extension
-- Shared PostgreSQL database between Node.js (public schema) & Python AI (`ai` schema)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;
  ELSE
    RAISE NOTICE 'pgvector extension not installed in this PostgreSQL instance - skipping vector extension creation';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS ai;

-- -----------------------------------------------------------------------------
-- 1. Reliable Outbox Table for Node.js -> Python Background Event Dispatch
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.outbox_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        VARCHAR(64) NOT NULL, -- 'RESUME_UPLOADED', 'RESUME_UPDATED', 'JOB_PUBLISHED', 'JOB_UPDATED'
  entity_type       VARCHAR(32) NOT NULL, -- 'RESUME', 'JOB'
  entity_id         UUID NOT NULL,
  candidate_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL DEFAULT 1,
  content_hash      VARCHAR(64),
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            VARCHAR(24) NOT NULL DEFAULT 'PENDING', -- PENDING, DISPATCHED, PROCESSED, FAILED
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 5,
  next_retry_at     TIMESTAMPTZ,
  last_error        TEXT,
  dispatched_at     TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_outbox_status_retry
  ON ai.outbox_events (status, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_outbox_entity
  ON ai.outbox_events (entity_type, entity_id, version);

-- -----------------------------------------------------------------------------
-- 2. ai.resume_processing
-- Tracks background resume processing lifecycle per resume & version
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.resume_processing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id         UUID NOT NULL REFERENCES public.candidate_resumes(id) ON DELETE CASCADE,
  candidate_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_version    INTEGER NOT NULL DEFAULT 1,
  content_hash      VARCHAR(64) NOT NULL,
  storage_key       TEXT,
  file_type         VARCHAR(16) NOT NULL DEFAULT 'PDF',
  file_size         INTEGER NOT NULL DEFAULT 0,
  page_count        INTEGER NOT NULL DEFAULT 0,
  is_scanned        BOOLEAN NOT NULL DEFAULT FALSE,
  ocr_used          BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(24) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 3,
  error_code        VARCHAR(64),
  error_message     TEXT,
  task_id           VARCHAR(128),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ai_resume_processing_version UNIQUE (resume_id, resume_version)
);

CREATE INDEX IF NOT EXISTS idx_ai_resume_processing_candidate
  ON ai.resume_processing (candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_resume_processing_hash
  ON ai.resume_processing (candidate_id, content_hash);

-- -----------------------------------------------------------------------------
-- 3. ai.candidate_profiles
-- Structured AI-extracted candidate profile & resume text per resume version
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.candidate_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_id               UUID NOT NULL REFERENCES public.candidate_resumes(id) ON DELETE CASCADE,
  resume_version          INTEGER NOT NULL DEFAULT 1,
  content_hash            VARCHAR(64) NOT NULL,
  is_latest               BOOLEAN NOT NULL DEFAULT TRUE,

  full_name               TEXT,
  location                TEXT,
  total_experience_years  NUMERIC(5, 2),
  extracted_text          TEXT NOT NULL DEFAULT '',
  cleaned_text            TEXT NOT NULL DEFAULT '',

  technical_skills        JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_skills       JSONB NOT NULL DEFAULT '[]'::jsonb,
  education               JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_experience         JSONB NOT NULL DEFAULT '[]'::jsonb,
  projects                JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications          JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages               JSONB NOT NULL DEFAULT '[]'::jsonb,
  extraction_evidence     JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_source       VARCHAR(32) NOT NULL DEFAULT 'HYBRID', -- PYTHON_PARSER, GEMINI_ENRICHED, HYBRID
  extraction_model        VARCHAR(64),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ai_candidate_profiles_resume_ver UNIQUE (resume_id, resume_version)
);

CREATE INDEX IF NOT EXISTS idx_ai_candidate_profiles_candidate_latest
  ON ai.candidate_profiles (candidate_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_ai_candidate_profiles_skills_gin
  ON ai.candidate_profiles USING GIN (normalized_skills);

-- -----------------------------------------------------------------------------
-- 4. ai.candidate_embeddings
-- Multi-type vector embeddings for semantic candidate search via pgvector
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ai.candidate_embeddings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        resume_id         UUID REFERENCES public.candidate_resumes(id) ON DELETE CASCADE,
        resume_version    INTEGER NOT NULL DEFAULT 1,
        content_hash      VARCHAR(64) NOT NULL,
        embedding_type    VARCHAR(32) NOT NULL DEFAULT ''FULL_PROFILE''
                          CHECK (embedding_type IN (''FULL_PROFILE'', ''SKILLS'', ''EXPERIENCE'', ''PROJECTS'')),
        model_name        VARCHAR(64) NOT NULL,
        dimension         INTEGER NOT NULL DEFAULT 768,
        embedding         vector(768) NOT NULL,
        source_text_hash  VARCHAR(64) NOT NULL,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_candidate_embedding_ver UNIQUE (candidate_id, resume_version, embedding_type, model_name)
      )';
  ELSE
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ai.candidate_embeddings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        resume_id         UUID REFERENCES public.candidate_resumes(id) ON DELETE CASCADE,
        resume_version    INTEGER NOT NULL DEFAULT 1,
        content_hash      VARCHAR(64) NOT NULL,
        embedding_type    VARCHAR(32) NOT NULL DEFAULT ''FULL_PROFILE''
                          CHECK (embedding_type IN (''FULL_PROFILE'', ''SKILLS'', ''EXPERIENCE'', ''PROJECTS'')),
        model_name        VARCHAR(64) NOT NULL,
        dimension         INTEGER NOT NULL DEFAULT 768,
        embedding         JSONB NOT NULL DEFAULT ''[]''::jsonb,
        source_text_hash  VARCHAR(64) NOT NULL,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_candidate_embedding_ver UNIQUE (candidate_id, resume_version, embedding_type, model_name)
      )';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_candidate_embeddings_active
  ON ai.candidate_embeddings (candidate_id, embedding_type, is_active);

-- -----------------------------------------------------------------------------
-- 5. ai.job_embeddings
-- Job description & requirement vector embeddings with version tracking
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ai.job_embeddings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id            UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
        company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        job_version       VARCHAR(64) NOT NULL,
        embedding_type    VARCHAR(32) NOT NULL DEFAULT ''FULL_JOB''
                          CHECK (embedding_type IN (''FULL_JOB'', ''DESCRIPTION'', ''REQUIREMENTS'')),
        model_name        VARCHAR(64) NOT NULL,
        dimension         INTEGER NOT NULL DEFAULT 768,
        embedding         vector(768) NOT NULL,
        normalized_skills JSONB NOT NULL DEFAULT ''[]''::jsonb,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_job_embedding_ver UNIQUE (job_id, job_version, embedding_type, model_name)
      )';
  ELSE
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ai.job_embeddings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id            UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
        company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        job_version       VARCHAR(64) NOT NULL,
        embedding_type    VARCHAR(32) NOT NULL DEFAULT ''FULL_JOB''
                          CHECK (embedding_type IN (''FULL_JOB'', ''DESCRIPTION'', ''REQUIREMENTS'')),
        model_name        VARCHAR(64) NOT NULL,
        dimension         INTEGER NOT NULL DEFAULT 768,
        embedding         JSONB NOT NULL DEFAULT ''[]''::jsonb,
        normalized_skills JSONB NOT NULL DEFAULT ''[]''::jsonb,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_job_embedding_ver UNIQUE (job_id, job_version, embedding_type, model_name)
      )';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_job_embeddings_active
  ON ai.job_embeddings (job_id, embedding_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_job_embeddings_company
  ON ai.job_embeddings (company_id, is_active);

-- -----------------------------------------------------------------------------
-- 6. ai.ai_job_logs
-- Tracks asynchronous AI jobs (matching runs, resume processing runs, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.ai_job_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type                  VARCHAR(32) NOT NULL, -- 'RESUME_MATCHING', 'RESUME_PROCESSING', 'JOB_EMBEDDING', 'RECOMMENDATION'
  status                    VARCHAR(24) NOT NULL DEFAULT 'QUEUED'
                            CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  company_id                UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id                    UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id              UUID REFERENCES public.users(id) ON DELETE CASCADE,
  requested_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  celery_task_id            VARCHAR(128),
  config_snapshot           JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Granular progress counters for asynchronous matching polling
  total_applications        INTEGER NOT NULL DEFAULT 0,
  eligible_candidates       INTEGER NOT NULL DEFAULT 0,
  candidates_retrieved      INTEGER NOT NULL DEFAULT 0,
  candidates_evaluated      INTEGER NOT NULL DEFAULT 0,
  candidates_completed      INTEGER NOT NULL DEFAULT 0,
  candidates_failed         INTEGER NOT NULL DEFAULT 0,

  result_summary            JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count               INTEGER NOT NULL DEFAULT 0,
  duration_ms               INTEGER,
  error_code                VARCHAR(64),
  error_message             TEXT,
  started_at                TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_job_logs_company_job
  ON ai.ai_job_logs (company_id, job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_job_logs_status
  ON ai.ai_job_logs (status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. ai.match_results
-- Cached & versioned candidate-job matching & ranking scores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.match_results (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_run_id           UUID REFERENCES ai.ai_job_logs(id) ON DELETE SET NULL,
  application_id            UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id                    UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resume_id                 UUID REFERENCES public.candidate_resumes(id) ON DELETE SET NULL,

  resume_version            INTEGER NOT NULL DEFAULT 1,
  job_version               VARCHAR(64) NOT NULL,
  embedding_model_version   VARCHAR(64) NOT NULL,
  evaluation_model_version  VARCHAR(64) NOT NULL,
  scoring_config_version    VARCHAR(64) NOT NULL DEFAULT 'v1',

  eligible                  BOOLEAN NOT NULL DEFAULT TRUE,
  filter_reasons            JSONB NOT NULL DEFAULT '[]'::jsonb,

  similarity_score          NUMERIC(6, 2) NOT NULL DEFAULT 0,
  skill_score               NUMERIC(6, 2) NOT NULL DEFAULT 0,
  experience_score          NUMERIC(6, 2) NOT NULL DEFAULT 0,
  project_score             NUMERIC(6, 2) NOT NULL DEFAULT 0,
  llm_score                 NUMERIC(6, 2),
  final_score               NUMERIC(6, 2) NOT NULL DEFAULT 0,
  rank_position             INTEGER,

  status                    VARCHAR(24) NOT NULL DEFAULT 'COMPLETED'
                            CHECK (status IN ('PENDING', 'SHORTLISTED', 'EVALUATED', 'COMPLETED', 'FILTERED_OUT', 'FAILED')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ai_match_results_cache UNIQUE (
    application_id,
    resume_version,
    job_version,
    embedding_model_version,
    evaluation_model_version,
    scoring_config_version
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_match_results_job_score
  ON ai.match_results (job_id, company_id, final_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_match_results_application
  ON ai.match_results (application_id);

-- -----------------------------------------------------------------------------
-- 8. ai.match_evaluations
-- Detailed Gemini LLM evaluation with evidence, strengths, weaknesses, gaps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.match_evaluations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id             UUID NOT NULL UNIQUE REFERENCES ai.match_results(id) ON DELETE CASCADE,
  application_id              UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id                      UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resume_version              INTEGER NOT NULL DEFAULT 1,
  job_version                 VARCHAR(64) NOT NULL,
  model_name                  VARCHAR(64) NOT NULL,

  overall_compatibility_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
  skill_compatibility_score   NUMERIC(6, 2) NOT NULL DEFAULT 0,
  experience_score            NUMERIC(6, 2) NOT NULL DEFAULT 0,
  project_relevance_score     NUMERIC(6, 2) NOT NULL DEFAULT 0,
  recommendation_category     VARCHAR(32) NOT NULL DEFAULT 'CONSIDER', -- STRONG_MATCH, GOOD_MATCH, CONSIDER, WEAK_MATCH

  strengths                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_skills              JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_skills              JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence                    JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_explanation         TEXT NOT NULL DEFAULT '',
  evaluation_metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_match_evaluations_job
  ON ai.match_evaluations (job_id, company_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_evaluations_candidate_ver
  ON ai.match_evaluations (candidate_id, resume_version, job_id, job_version);

-- -----------------------------------------------------------------------------
-- 9. ai.job_recommendations_cache
-- Cached candidate-to-published-job recommendations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.job_recommendations_cache (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  resume_version    INTEGER NOT NULL DEFAULT 1,
  jobs_state_hash   VARCHAR(64) NOT NULL,
  config_hash       VARCHAR(64) NOT NULL,
  recommendations   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_ai_job_recommendations_cache UNIQUE (candidate_id, company_id, resume_version, jobs_state_hash, config_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_job_recommendations_candidate
  ON ai.job_recommendations_cache (candidate_id, expires_at);

-- -----------------------------------------------------------------------------
-- 10. ai.ai_usage_logs
-- Token & cost tracking for Gemini LLM and Embedding requests per company/job
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.ai_usage_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  job_id            UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  candidate_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_type      VARCHAR(32) NOT NULL, -- 'EMBEDDING', 'RESUME_EXTRACTION', 'CANDIDATE_EVALUATION', 'RECOMMENDATION'
  model_name        VARCHAR(64) NOT NULL,
  input_tokens      INTEGER NOT NULL DEFAULT 0,
  output_tokens     INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  cached_hit        BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(24) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, RATE_LIMITED, BUDGET_EXCEEDED
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_date
  ON ai.ai_usage_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON ai.ai_usage_logs (created_at DESC);
