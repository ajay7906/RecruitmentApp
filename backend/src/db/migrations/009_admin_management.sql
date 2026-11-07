-- =============================================================================
-- Migration 009: Admin Management
--   * hierarchical platform admin roles + permission model (role defaults + per-admin overrides)
--   * account / company status history, admin role history
--   * append-only audit log
--   * reports & moderation queue
--   * indexes used by dashboard / activity / analytics aggregation
-- =============================================================================

-- 1. Enums -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'JOB_APPROVER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_entity_type AS ENUM ('USER', 'COMPANY', 'JOB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 'inactive' = deactivated account. (ACTIVE / PENDING_VERIFICATION are derived from
-- status = 'active' and email_verified_at, following the existing convention.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_status' AND e.enumlabel = 'inactive'
  ) THEN
    ALTER TYPE user_status ADD VALUE 'inactive';
  END IF;
END $$;

-- 2. users -------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_role         admin_role,
  ADD COLUMN IF NOT EXISTS last_login_at      timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at       timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason  text,
  ADD COLUMN IF NOT EXISTS status_changed_at  timestamptz;

-- Existing admin accounts predate admin roles: give them the standard ADMIN role (least surprise,
-- NOT super admin). The first SUPER_ADMIN is provisioned with `npm run admin:create-super`.
UPDATE users SET admin_role = 'ADMIN' WHERE role = 'admin' AND admin_role IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_admin_role;
ALTER TABLE users ADD CONSTRAINT ck_users_admin_role
  CHECK ((role = 'admin') = (admin_role IS NOT NULL));

-- 3. Permissions -------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_admin_role_history_user ON admin_role_history(user_id, created_at DESC);

-- Default permissions per role (the application treats SUPER_ADMIN as holding every permission).
INSERT INTO admin_role_permissions (role, permission)
SELECT r.role::admin_role, p.permission
FROM (VALUES
  -- SUPER_ADMIN
  ('SUPER_ADMIN','dashboard.read'),('SUPER_ADMIN','users.read'),('SUPER_ADMIN','users.read_contact'),
  ('SUPER_ADMIN','users.update'),('SUPER_ADMIN','users.suspend'),('SUPER_ADMIN','users.activate'),
  ('SUPER_ADMIN','users.deactivate'),('SUPER_ADMIN','companies.read'),('SUPER_ADMIN','companies.approve'),
  ('SUPER_ADMIN','companies.reject'),('SUPER_ADMIN','companies.suspend'),('SUPER_ADMIN','companies.activate'),
  ('SUPER_ADMIN','jobs.read'),('SUPER_ADMIN','jobs.approve'),('SUPER_ADMIN','jobs.reject'),
  ('SUPER_ADMIN','jobs.close'),('SUPER_ADMIN','jobs.suspend'),('SUPER_ADMIN','jobs.flag'),
  ('SUPER_ADMIN','applications.read'),('SUPER_ADMIN','applications.read_resume'),
  ('SUPER_ADMIN','applications.read_notes'),('SUPER_ADMIN','activities.read'),
  ('SUPER_ADMIN','reports.read'),('SUPER_ADMIN','reports.manage'),('SUPER_ADMIN','analytics.read'),
  ('SUPER_ADMIN','audit_logs.read'),('SUPER_ADMIN','admins.read'),('SUPER_ADMIN','admins.manage'),
  ('SUPER_ADMIN','platform_settings.manage'),
  -- ADMIN
  ('ADMIN','dashboard.read'),('ADMIN','users.read'),('ADMIN','users.read_contact'),('ADMIN','users.update'),
  ('ADMIN','users.suspend'),('ADMIN','users.activate'),('ADMIN','users.deactivate'),
  ('ADMIN','companies.read'),('ADMIN','companies.approve'),('ADMIN','companies.reject'),
  ('ADMIN','companies.suspend'),('ADMIN','companies.activate'),
  ('ADMIN','jobs.read'),('ADMIN','jobs.approve'),('ADMIN','jobs.reject'),('ADMIN','jobs.close'),
  ('ADMIN','jobs.suspend'),('ADMIN','jobs.flag'),('ADMIN','applications.read'),
  ('ADMIN','activities.read'),('ADMIN','reports.read'),('ADMIN','reports.manage'),('ADMIN','analytics.read'),
  -- MODERATOR
  ('MODERATOR','dashboard.read'),('MODERATOR','users.read'),('MODERATOR','companies.read'),
  ('MODERATOR','companies.suspend'),('MODERATOR','jobs.read'),('MODERATOR','jobs.flag'),
  ('MODERATOR','jobs.suspend'),('MODERATOR','activities.read'),('MODERATOR','reports.read'),
  ('MODERATOR','reports.manage'),
  -- SUPPORT_ADMIN
  ('SUPPORT_ADMIN','dashboard.read'),('SUPPORT_ADMIN','users.read'),('SUPPORT_ADMIN','users.read_contact'),
  ('SUPPORT_ADMIN','users.update'),('SUPPORT_ADMIN','users.activate'),('SUPPORT_ADMIN','companies.read'),
  ('SUPPORT_ADMIN','jobs.read'),('SUPPORT_ADMIN','applications.read'),('SUPPORT_ADMIN','activities.read'),
  ('SUPPORT_ADMIN','reports.read'),('SUPPORT_ADMIN','reports.manage'),
  -- JOB_APPROVER
  ('JOB_APPROVER','dashboard.read'),('JOB_APPROVER','jobs.read'),('JOB_APPROVER','jobs.approve'),
  ('JOB_APPROVER','jobs.reject'),('JOB_APPROVER','jobs.flag'),('JOB_APPROVER','companies.read'),
  ('JOB_APPROVER','reports.read')
) AS p(role, permission)
JOIN (VALUES ('SUPER_ADMIN'),('ADMIN'),('MODERATOR'),('SUPPORT_ADMIN'),('JOB_APPROVER')) AS r(role)
  ON r.role = p.role
ON CONFLICT DO NOTHING;

-- 4. Status history -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status      text NOT NULL,
  reason          text,
  actor_id        uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_status_history_user ON account_status_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS company_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  previous_status company_status NOT NULL,
  new_status      company_status NOT NULL,
  reason          text,
  actor_id        uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_status_history_company ON company_status_history(company_id, created_at DESC);

-- 5. Audit log (append-only) ------------------------------------------------------
-- No FK on actor_id on purpose: audit records must outlive any user row.
CREATE TABLE IF NOT EXISTS audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       uuid,
  actor_role     text NOT NULL,
  action         text NOT NULL,
  entity_type    text NOT NULL,
  entity_id      text,
  previous_value jsonb,
  new_value      jsonb,
  reason         text,
  ip_address     text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);

CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_immutable();

-- 6. Reports & moderation queue -----------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         report_entity_type NOT NULL,
  entity_id           uuid NOT NULL,
  reported_by         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason              text NOT NULL,
  description         text,
  status              report_status NOT NULL DEFAULT 'OPEN',
  assigned_to         uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution          text,
  resolved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         timestamptz,
  legacy_job_report_id uuid UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_entity   ON reports(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reports_assigned ON reports(assigned_to);
-- One open report per reporter per entity (stops spam), a new one is allowed after resolution.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_open_per_reporter
  ON reports(entity_type, entity_id, reported_by) WHERE status IN ('OPEN', 'UNDER_REVIEW');

CREATE TABLE IF NOT EXISTS report_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  note       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_notes_report ON report_notes(report_id, created_at);

-- Bring the existing candidate job reports into the unified moderation queue.
INSERT INTO reports (entity_type, entity_id, reported_by, reason, description, status, legacy_job_report_id, created_at)
SELECT 'JOB', jr.job_id, jr.reporter_id, jr.category, jr.details,
       (CASE jr.status WHEN 'OPEN' THEN 'OPEN' WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
                       WHEN 'DISMISSED' THEN 'DISMISSED' ELSE 'RESOLVED' END)::report_status,
       jr.id, jr.created_at
FROM job_reports jr
ON CONFLICT DO NOTHING;

-- 7. Indexes for aggregation / listing --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_created_at        ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role_status       ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_admin_role        ON users(admin_role) WHERE admin_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_created_at    ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at         ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_closed_at          ON jobs(closed_at);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at   ON interviews(created_at);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_decided_at ON hiring_decisions(decided_at);
CREATE INDEX IF NOT EXISTS idx_app_status_history_new_status ON application_status_history(new_status, changed_at);
