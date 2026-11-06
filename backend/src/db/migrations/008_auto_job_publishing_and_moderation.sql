-- =============================================================================
-- Migration 008: Automatic Job Publishing & Asynchronous Moderation
-- =============================================================================

-- 1. Extend job_status enum with UNDER_REVIEW
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'job_status' AND e.enumlabel = 'UNDER_REVIEW'
  ) THEN
    ALTER TYPE job_status ADD VALUE 'UNDER_REVIEW';
  END IF;
END$$;

-- 2. Create job_moderation_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_moderation_status') THEN
    CREATE TYPE job_moderation_status AS ENUM (
      'NOT_REVIEWED',
      'FLAGGED',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'CLEARED'
    );
  END IF;
END$$;

-- 3. Add moderation & duplicate-detection columns to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS moderation_status job_moderation_status NOT NULL DEFAULT 'NOT_REVIEWED',
  ADD COLUMN IF NOT EXISTS moderation_flags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_moderation_status ON jobs(moderation_status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_content_hash ON jobs(company_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_report_count ON jobs(report_count);

-- 4. Create job_moderation_logs table (audit trail for automated & admin actions)
CREATE TABLE IF NOT EXISTS job_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'SYSTEM',
  action TEXT NOT NULL,
  previous_status job_status,
  new_status job_status,
  previous_moderation_status job_moderation_status,
  new_moderation_status job_moderation_status,
  reason TEXT,
  flags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_moderation_logs_job ON job_moderation_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_moderation_logs_created_at ON job_moderation_logs(created_at DESC);

-- 5. Create job_reports table (candidate/user reports of suspicious listings)
CREATE TABLE IF NOT EXISTS job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_job_reports_job_reporter UNIQUE (job_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_job_reports_job ON job_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reports_status ON job_reports(status);
