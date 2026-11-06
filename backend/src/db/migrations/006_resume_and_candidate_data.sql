-- Migration 006: Resume & Candidate Data Management Module

DO $$ BEGIN
    CREATE TYPE resume_processing_status AS ENUM (
        'NOT_PROCESSED',
        'PROCESSING',
        'TEXT_EXTRACTED',
        'FAILED',
        'UNSUPPORTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS profile_image_url text,
    ADD COLUMN IF NOT EXISTS career_summary text,
    ADD COLUMN IF NOT EXISTS pincode text,
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS relevant_experience numeric(4, 1),
    ADD COLUMN IF NOT EXISTS employment_status text,
    ADD COLUMN IF NOT EXISTS expected_salary numeric(12, 2),
    ADD COLUMN IF NOT EXISTS current_salary numeric(12, 2),
    ADD COLUMN IF NOT EXISTS salary_currency text NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS notice_period text,
    ADD COLUMN IF NOT EXISTS preferred_locations text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS preferred_employment_type text,
    ADD COLUMN IF NOT EXISTS preferred_work_mode text;

CREATE TABLE IF NOT EXISTS candidate_resumes (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_title                text,
    original_file_name          text NOT NULL,
    stored_file_name            text NOT NULL,
    storage_key                 text NOT NULL,
    file_type                   text NOT NULL,
    mime_type                   text NOT NULL,
    file_size                   integer NOT NULL,
    version                     integer NOT NULL DEFAULT 1,
    root_resume_id              uuid,
    previous_version_id         uuid REFERENCES candidate_resumes(id) ON DELETE SET NULL,
    is_latest_version           boolean NOT NULL DEFAULT true,
    is_primary                  boolean NOT NULL DEFAULT false,
    is_deleted                  boolean NOT NULL DEFAULT false,
    resume_status               resume_processing_status NOT NULL DEFAULT 'NOT_PROCESSED',
    extracted_text_reference    text,
    extracted_char_count        integer,
    uploaded_at                 timestamptz NOT NULL DEFAULT now(),
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_resumes_user_deleted
    ON candidate_resumes(candidate_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_candidate_resumes_user_primary
    ON candidate_resumes(candidate_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_candidate_resumes_root_id
    ON candidate_resumes(root_resume_id);

-- Partial unique index: at most ONE active primary resume per candidate
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_resumes_one_primary_per_user
    ON candidate_resumes(candidate_id)
    WHERE is_primary = true AND is_deleted = false;

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS resume_id uuid REFERENCES candidate_resumes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS candidate_skills (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name          text NOT NULL,
    normalized_name     text NOT NULL,
    skill_category      text NOT NULL DEFAULT 'Technical',
    experience_years    numeric(4, 1),
    proficiency_level   text,
    last_used           text,
    source              text NOT NULL DEFAULT 'MANUAL',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_candidate_skills_user_name UNIQUE (candidate_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_user ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_normalized ON candidate_skills(normalized_name);

CREATE TABLE IF NOT EXISTS candidate_education (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    degree              text NOT NULL,
    field_of_study      text NOT NULL,
    institution_name    text NOT NULL,
    university_name     text,
    education_level     text NOT NULL,
    start_date          date NOT NULL,
    end_date            date,
    currently_studying  boolean NOT NULL DEFAULT false,
    grade               text,
    description         text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_education_user ON candidate_education(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_experience (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_title           text NOT NULL,
    company_name        text NOT NULL,
    employment_type     text NOT NULL,
    work_location       text,
    start_date          date NOT NULL,
    end_date            date,
    currently_working   boolean NOT NULL DEFAULT false,
    description         text,
    responsibilities    text[] NOT NULL DEFAULT '{}',
    skills_used         text[] NOT NULL DEFAULT '{}',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_experience_user ON candidate_experience(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_projects (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name        text NOT NULL,
    project_description text NOT NULL,
    technologies_used   text[] NOT NULL DEFAULT '{}',
    project_url         text,
    github_url          text,
    start_date          date,
    end_date            date,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_projects_user ON candidate_projects(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_certifications (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certification_name      text NOT NULL,
    issuing_organization    text NOT NULL,
    issue_date              date NOT NULL,
    expiration_date         date,
    credential_id           text,
    credential_url          text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_certifications_user ON candidate_certifications(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_achievements (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_title       text NOT NULL,
    description             text,
    date                    date,
    issuing_organization    text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_achievements_user ON candidate_achievements(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_languages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_name       text NOT NULL,
    proficiency_level   text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_candidate_languages_user_name UNIQUE (candidate_id, language_name)
);

CREATE INDEX IF NOT EXISTS idx_candidate_languages_user ON candidate_languages(candidate_id);
