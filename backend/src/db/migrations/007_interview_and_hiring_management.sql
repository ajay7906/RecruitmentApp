-- 007_interview_and_hiring_management.sql
-- Interview & Hiring Management Module Migration

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'RESCHEDULED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interview_mode AS ENUM (
    'ONLINE',
    'IN_PERSON',
    'TELEPHONIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interviewer_role AS ENUM (
    'PRIMARY_INTERVIEWER',
    'TECHNICAL_INTERVIEWER',
    'HR_INTERVIEWER',
    'OBSERVER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interviewer_assignment_status AS ENUM (
    'ASSIGNED',
    'ACCEPTED',
    'DECLINED',
    'COMPLETED',
    'REMOVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_recommendation AS ENUM (
    'STRONG_HIRE',
    'HIRE',
    'HOLD',
    'REJECT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hiring_decision_type AS ENUM (
    'SELECTED',
    'REJECTED',
    'ON_HOLD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reschedule_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS interviews (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id             UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_id                     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id                 UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  interview_title            TEXT NOT NULL,
  round_number               INT NOT NULL DEFAULT 1,
  interview_type             TEXT NOT NULL,
  interview_mode             interview_mode NOT NULL DEFAULT 'ONLINE',

  interview_date             TIMESTAMPTZ NOT NULL,
  start_time                 TIMESTAMPTZ NOT NULL,
  end_time                   TIMESTAMPTZ NOT NULL,
  time_zone                  TEXT NOT NULL DEFAULT 'Asia/Kolkata',

  location                   TEXT,
  meeting_link               TEXT,
  description                TEXT,
  instructions               TEXT,
  allow_candidate_reschedule BOOLEAN NOT NULL DEFAULT TRUE,

  status                     interview_status NOT NULL DEFAULT 'SCHEDULED',
  candidate_confirmed_at     TIMESTAMPTZ,
  no_show_party              TEXT,

  cancellation_reason        TEXT,
  cancellation_type          TEXT,
  cancelled_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at               TIMESTAMPTZ,

  created_by                 UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application_round ON interviews(application_id, round_number);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_start_time ON interviews(start_time);

CREATE TABLE IF NOT EXISTS interviewer_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id      UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interviewer_role  interviewer_role NOT NULL DEFAULT 'TECHNICAL_INTERVIEWER',
  assignment_status interviewer_assignment_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_interviewer_assignments_interview_user UNIQUE (interview_id, interviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_interviewer_assignments_user ON interviewer_assignments(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviewer_assignments_interview ON interviewer_assignments(interview_id);

CREATE TABLE IF NOT EXISTS interview_feedbacks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id           UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  application_id         UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  overall_rating         INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  technical_rating       INT CHECK (technical_rating BETWEEN 1 AND 5),
  communication_rating   INT CHECK (communication_rating BETWEEN 1 AND 5),
  problem_solving_rating INT CHECK (problem_solving_rating BETWEEN 1 AND 5),
  experience_rating      INT CHECK (experience_rating BETWEEN 1 AND 5),

  strengths              TEXT,
  weaknesses             TEXT,
  detailed_feedback      TEXT NOT NULL,
  recommendation         feedback_recommendation NOT NULL,
  is_final_submitted     BOOLEAN NOT NULL DEFAULT TRUE,

  submitted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_interview_feedbacks_interview_interviewer UNIQUE (interview_id, interviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_interview ON interview_feedbacks(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_application ON interview_feedbacks(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_interviewer ON interview_feedbacks(interviewer_id);

CREATE TABLE IF NOT EXISTS interview_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id      UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  previous_status   interview_status,
  new_status        interview_status,
  previous_schedule JSONB,
  new_schedule      JSONB,
  metadata          JSONB,
  reason            TEXT,
  changed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role   TEXT NOT NULL,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_history_interview ON interview_history(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_history_changed_at ON interview_history(changed_at);

CREATE TABLE IF NOT EXISTS interview_reschedule_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id         UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  candidate_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_date       TIMESTAMPTZ NOT NULL,
  requested_start_time TIMESTAMPTZ NOT NULL,
  requested_end_time   TIMESTAMPTZ NOT NULL,
  time_zone            TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reason               TEXT NOT NULL,
  status               reschedule_request_status NOT NULL DEFAULT 'PENDING',
  reviewed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes         TEXT,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_interview ON interview_reschedule_requests(interview_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_candidate ON interview_reschedule_requests(candidate_id);

CREATE TABLE IF NOT EXISTS hiring_decisions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_id                    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision                  hiring_decision_type NOT NULL,
  target_application_status application_status,
  decision_reason           TEXT NOT NULL,
  internal_notes            TEXT,
  decided_by                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decided_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hiring_decisions_application ON hiring_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_company ON hiring_decisions(company_id);
CREATE INDEX IF NOT EXISTS idx_hiring_decisions_job ON hiring_decisions(job_id);
