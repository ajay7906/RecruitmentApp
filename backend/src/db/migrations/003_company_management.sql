DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE company_member_role AS ENUM ('OWNER', 'ADMIN', 'RECRUITER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE company_membership_status AS ENUM ('ACTIVE', 'INVITED', 'REMOVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url             text,
  ADD COLUMN IF NOT EXISTS email                text,
  ADD COLUMN IF NOT EXISTS contact_number       text,
  ADD COLUMN IF NOT EXISTS company_type         text,
  ADD COLUMN IF NOT EXISTS founded_year         integer,
  ADD COLUMN IF NOT EXISTS country              text,
  ADD COLUMN IF NOT EXISTS state                text,
  ADD COLUMN IF NOT EXISTS city                 text,
  ADD COLUMN IF NOT EXISTS address              text,
  ADD COLUMN IF NOT EXISTS linkedin_url         text,
  ADD COLUMN IF NOT EXISTS gstin                text,
  ADD COLUMN IF NOT EXISTS registration_number  text,
  ADD COLUMN IF NOT EXISTS owner_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status               company_status NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS rejection_reason     text,
  ADD COLUMN IF NOT EXISTS suspension_reason    text,
  ADD COLUMN IF NOT EXISTS submitted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at          timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by          uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_status   ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name     ON companies(name);

CREATE TABLE IF NOT EXISTS company_memberships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              company_member_role NOT NULL DEFAULT 'RECRUITER',
  membership_status company_membership_status NOT NULL DEFAULT 'ACTIVE',
  joined_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_memberships_company_user UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id    ON company_memberships(user_id);
