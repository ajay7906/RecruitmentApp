-- =============================================================================
-- Migration 010: Notifications & Reports Module
--   * Centralized In-App Notifications (`notifications`)
--   * Email Delivery Tracking & Retry Queue (`email_deliveries`)
--   * Per-User Channel & Category Preferences (`notification_preferences`)
--   * Reusable Notification & Email Templates (`notification_templates`)
--   * Additional RBAC permissions & performance indexes for analytics/reporting
-- =============================================================================

-- 1. Enums -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('EMAIL', 'IN_APP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'ACCOUNT',
    'COMPANY',
    'JOB',
    'APPLICATION',
    'INTERVIEW',
    'HIRING',
    'SYSTEM',
    'SECURITY',
    'ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Notification Templates --------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   text NOT NULL,
  channel        notification_channel NOT NULL,
  category       notification_category NOT NULL DEFAULT 'SYSTEM',
  subject        text,
  title_template text,
  content        text NOT NULL,
  text_fallback  text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_templates_key_channel UNIQUE (template_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active
  ON notification_templates(template_key, channel) WHERE is_active = true;

-- 3. In-App Notifications ----------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_role      text,
  title               text NOT NULL,
  message             text NOT NULL,
  category            notification_category NOT NULL DEFAULT 'SYSTEM',
  event_type          text NOT NULL,
  related_entity_type text,
  related_entity_id   text,
  action_url          text,
  metadata            jsonb,
  idempotency_key     text UNIQUE,
  is_read             boolean NOT NULL DEFAULT false,
  read_at             timestamptz,
  is_dismissed        boolean NOT NULL DEFAULT false,
  dismissed_at        timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_id, is_dismissed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications(recipient_id, is_read, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_category
  ON notifications(recipient_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type
  ON notifications(event_type, created_at DESC);

-- 4. Email Delivery Records & Retry Tracking ---------------------------------
CREATE TABLE IF NOT EXISTS email_deliveries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_email     text NOT NULL,
  template_id         uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_key        text,
  category            notification_category NOT NULL DEFAULT 'SYSTEM',
  event_type          text NOT NULL,
  subject             text NOT NULL,
  body_html           text NOT NULL,
  body_text           text,
  variables           jsonb,
  related_entity_type text,
  related_entity_id   text,
  idempotency_key     text UNIQUE,
  status              notification_delivery_status NOT NULL DEFAULT 'PENDING',
  provider            text NOT NULL DEFAULT 'SMTP',
  provider_message_id text,
  provider_response   jsonb,
  attempt_count       int NOT NULL DEFAULT 0,
  max_attempts        int NOT NULL DEFAULT 3,
  last_attempt_at     timestamptz,
  next_retry_at       timestamptz,
  sent_at             timestamptz,
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_retry
  ON email_deliveries(status, next_retry_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_recipient
  ON email_deliveries(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_event_type
  ON email_deliveries(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_created_at
  ON email_deliveries(created_at DESC);

-- 5. Notification Preferences ------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    notification_channel NOT NULL,
  category   notification_category NOT NULL,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_preferences_user_channel_category UNIQUE (user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences(user_id);

-- 6. Seed Default Admin Role Permissions for Notifications & Exports ---------
INSERT INTO admin_role_permissions (role, permission)
VALUES
  ('SUPER_ADMIN', 'notifications.read'),
  ('SUPER_ADMIN', 'notifications.manage'),
  ('SUPER_ADMIN', 'reports.export'),
  ('ADMIN', 'notifications.read'),
  ('ADMIN', 'notifications.manage'),
  ('ADMIN', 'reports.export'),
  ('MODERATOR', 'notifications.read'),
  ('SUPPORT_ADMIN', 'notifications.read')
ON CONFLICT DO NOTHING;
