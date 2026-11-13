-- =============================================================================
-- Migration 012: Schema Alignment, Consistency & Index Harmonization
--   * Guarantees citext extension and verifies users.email CITEXT native type
--   * Ensures admin_role enum, column, consistency constraint, and history table
--   * Harmonizes all DESC and composite performance indexes with Prisma schema
--   * Preserves critical partial unique indexes (primary resume, open reports)
--   * Fully idempotent, transactional, and safe for existing data
-- =============================================================================

-- 1. Extensions & Citext Verification ----------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email'
      AND udt_name != 'citext'
  ) THEN
    ALTER TABLE users ALTER COLUMN email TYPE citext;
  END IF;
END $$;

-- 2. Admin Role & User Alignment ---------------------------------------------
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'MODERATOR',
    'SUPPORT_ADMIN',
    'JOB_APPROVER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_status' AND e.enumlabel = 'inactive'
  ) THEN
    ALTER TYPE user_status ADD VALUE 'inactive';
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_role        admin_role,
  ADD COLUMN IF NOT EXISTS last_login_at     timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at      timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- Safely assign standard ADMIN to any existing admin user without an admin_role
UPDATE users
SET admin_role = 'ADMIN'
WHERE role = 'admin' AND admin_role IS NULL;

-- Ensure consistency between user.role and user.admin_role
ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_admin_role;
ALTER TABLE users ADD CONSTRAINT ck_users_admin_role
  CHECK ((role = 'admin') = (admin_role IS NOT NULL));

-- 3. Admin Tables Alignment --------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role       admin_role NOT NULL,
  permission text       NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  effect     text NOT NULL CHECK (effect IN ('GRANT', 'DENY')),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE IF NOT EXISTS admin_role_history (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type          text NOT NULL CHECK (change_type IN ('CREATED', 'ROLE', 'PERMISSIONS', 'STATUS')),
  previous_role        admin_role,
  new_role             admin_role,
  previous_permissions jsonb,
  new_permissions      jsonb,
  changed_by           uuid,
  reason               text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- 4. Missing Standard Performance Indexes ------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_users_role_status
  ON users(role, status);

CREATE INDEX IF NOT EXISTS idx_companies_created_at
  ON companies(created_at);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_jobs_closed_at
  ON jobs(closed_at);

CREATE INDEX IF NOT EXISTS idx_interviews_created_at
  ON interviews(created_at);

CREATE INDEX IF NOT EXISTS idx_hiring_decisions_decided_at
  ON hiring_decisions(decided_at);

CREATE INDEX IF NOT EXISTS idx_app_status_history_new_status
  ON application_status_history(new_status, changed_at);

-- 5. Descending (DESC) Indexes Alignment -------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_role_history_user
  ON admin_role_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_status_history_user
  ON account_status_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_status_history_company
  ON company_status_history(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_moderation_logs_created_at
  ON job_moderation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_id, is_dismissed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_category
  ON notifications(recipient_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_event_type
  ON notifications(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_retry
  ON email_deliveries(status, next_retry_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient
  ON email_deliveries(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_event_type
  ON email_deliveries(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_created_at
  ON email_deliveries(created_at DESC);

-- 6. Preserve Partial Indexes (Managed in PostgreSQL) ------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_resumes_one_primary_per_user
  ON candidate_resumes(candidate_id)
  WHERE is_primary = true AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_open_per_reporter
  ON reports(entity_type, entity_id, reported_by)
  WHERE status IN ('OPEN', 'UNDER_REVIEW');

CREATE INDEX IF NOT EXISTS idx_users_admin_role
  ON users(admin_role)
  WHERE admin_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_templates_active
  ON notification_templates(template_key, channel)
  WHERE is_active = true;
