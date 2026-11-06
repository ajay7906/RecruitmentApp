DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'PUBLISHED',
    'PAUSED',
    'CLOSED',
    'REJECTED',
    'EXPIRED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title                 text NOT NULL,
  company_id                uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by                uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by                uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by               uuid REFERENCES users(id) ON DELETE SET NULL,

  department                text,
  job_category              text,
  job_description           text NOT NULL,
  job_summary               text,
  number_of_openings        integer NOT NULL DEFAULT 1,
  employment_type           text NOT NULL,
  work_mode                 text NOT NULL,

  experience_required       text,
  min_experience            numeric(4, 1) DEFAULT 0,
  max_experience            numeric(4, 1),

  min_salary                numeric(12, 2),
  max_salary                numeric(12, 2),
  salary_currency           text NOT NULL DEFAULT 'INR',
  salary_period             text NOT NULL DEFAULT 'Yearly',
  disclose_salary           boolean NOT NULL DEFAULT true,

  country                   text,
  state                     text,
  city                      text,
  office_location           text,
  pincode                   text,
  location                  text,

  required_skills           text[] NOT NULL DEFAULT '{}',
  preferred_skills          text[] NOT NULL DEFAULT '{}',
  educational_qualification text,
  min_education_level       text,
  preferred_qualifications  text,
  required_certifications   text[] NOT NULL DEFAULT '{}',
  experience_description    text,
  additional_requirements   text,

  responsibilities          text[] NOT NULL DEFAULT '{}',
  benefits                  text[] NOT NULL DEFAULT '{}',
  perks                     text[] NOT NULL DEFAULT '{}',
  additional_info           text,
  application_instructions  text,
  contact_email             text,

  application_deadline      timestamptz,
  allow_after_deadline      boolean NOT NULL DEFAULT false,
  require_resume            boolean NOT NULL DEFAULT true,
  require_cover_letter      boolean NOT NULL DEFAULT false,
  max_applications          integer,
  application_questions     jsonb NOT NULL DEFAULT '[]'::jsonb,

  status                    job_status NOT NULL DEFAULT 'DRAFT',
  require_admin_approval    boolean NOT NULL DEFAULT false,
  rejection_reason          text,
  submitted_at              timestamptz,
  published_at              timestamptz,
  paused_at                 timestamptz,
  closed_at                 timestamptz,
  archived_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id      ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by      ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status          ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode       ON jobs(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at    ON jobs(published_at);
