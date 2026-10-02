CREATE TABLE candidate_profiles (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id             uuid NOT NULL UNIQUE
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    phone               text,
    date_of_birth       date,
    gender              text,

    headline            text,
    bio                 text,

    location            text,
    city                text,
    state               text,
    country             text,

    years_of_experience numeric(4,1),

    current_job_title   text,
    current_company     text,

    linkedin_url        text,
    github_url          text,
    portfolio_url       text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_profiles_city
    ON candidate_profiles(city);

CREATE INDEX idx_candidate_profiles_state
    ON candidate_profiles(state);





CREATE TABLE companies (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name                text NOT NULL,
    website             text,
    description         text,

    industry            text,
    company_size        text,

    location            text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE recruiter_profiles (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id             uuid NOT NULL UNIQUE
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    phone               text,
    designation         text,

    company_id          uuid
                        REFERENCES companies(id)
                        ON DELETE SET NULL,

    linkedin_url        text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX idx_recruiter_profiles_company_id
    ON recruiter_profiles(company_id);    