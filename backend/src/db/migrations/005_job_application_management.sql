-- Migration 005: Job Application Management Module

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'SUBMITTED',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW',
        'OFFERED',
        'HIRED',
        'REJECTED',
        'WITHDRAWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS resume_key text,
    ADD COLUMN IF NOT EXISTS resume_file_name text,
    ADD COLUMN IF NOT EXISTS resume_mime_type text,
    ADD COLUMN IF NOT EXISTS resume_file_size integer,
    ADD COLUMN IF NOT EXISTS resume_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS applications (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                  uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id              uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reviewed_by             uuid REFERENCES users(id) ON DELETE SET NULL,

    resume_key              text,
    resume_file_name        text,
    resume_mime_type        text,
    resume_file_size        integer,

    cover_letter            text,
    answers                 jsonb NOT NULL DEFAULT '[]'::jsonb,
    additional_information  text,

    candidate_skills        text[] NOT NULL DEFAULT '{}',
    candidate_experience    numeric(4, 1),
    candidate_snapshot      jsonb NOT NULL DEFAULT '{}'::jsonb,
    job_snapshot            jsonb NOT NULL DEFAULT '{}'::jsonb,

    status                  application_status NOT NULL DEFAULT 'SUBMITTED',
    applied_at              timestamptz NOT NULL DEFAULT now(),
    last_status_updated_at  timestamptz NOT NULL DEFAULT now(),
    withdrawn_at            timestamptz,
    withdrawal_reason       text,
    rejection_reason        text,
    recruiter_notes         jsonb NOT NULL DEFAULT '[]'::jsonb,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_applications_job_candidate UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);

CREATE TABLE IF NOT EXISTS application_status_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    previous_status application_status,
    new_status      application_status NOT NULL,
    changed_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_by_role text NOT NULL,
    reason          text,
    notes           text,
    changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history_application_id
    ON application_status_history(application_id);

CREATE INDEX IF NOT EXISTS idx_app_status_history_changed_at
    ON application_status_history(changed_at);
