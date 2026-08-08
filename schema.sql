-- ============================================================================
-- Tracer Intelligence — database schema
--
-- Column layer VERIFIED against the live DB (information_schema.columns):
-- every table, column, type, nullability, and default below matches production.
--
-- NOT returned by that query, so still sourced from code/original schema.sql
-- (reliable, but the only remaining unverified slice):
--   * constraints  — PK, the dedupe_key UNIQUE, the FKs, job_skills UNIQUE,
--                    skill_map composite PK
--   * indexes      — base + trigram from the original schema; later-column
--                    indexes inferred from query patterns
-- If you ever want 100% fidelity on those too, `pg_dump --schema-only` emits
-- them exactly. Not needed for a working rebuild.
--
-- NOTE: title_map is populated in the live database only and has no loader in
-- this repo. /api/stats/top-roles and /api/stats/portability both depend on
-- it, so neither works from a clean checkout until it is repopulated.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- job_postings — single source of truth. One row per (source, listing).
-- Column order matches production. NB: scraped_at is timestamptz, but
-- last_seen_at + link_checked_at are plain `timestamp` (a real live quirk).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_postings (
    id              BIGSERIAL    PRIMARY KEY,             -- bigint, nextval(job_postings_id_seq)
    source          TEXT         NOT NULL,                -- 'bdjobs' | 'skilljobs' | 'shomvob'
    source_url      TEXT         NOT NULL,
    dedupe_key      TEXT         NOT NULL UNIQUE,          -- '<source>_<listingid>'; upsert conflict target
    title           TEXT         NOT NULL,
    company         TEXT         NOT NULL,
    location        TEXT,
    category        TEXT,
    salary_raw      TEXT,
    salary_min      INTEGER,
    salary_max      INTEGER,
    description     TEXT,
    deadline        DATE,
    posted_at       DATE,
    scraped_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),   -- first insert time
    is_confidential BOOLEAN      NOT NULL DEFAULT FALSE,   -- placeholder employer ("A Reputed Group")
    duplicate_of    BIGINT       REFERENCES job_postings(id),  -- same-source repost -> canonical row; NULL = canonical
    last_seen_at    TIMESTAMP,                             -- bumped every run the listing is still live
    link_dead       BOOLEAN      NOT NULL DEFAULT FALSE,   -- source_url 404'd twice running; reversible
    link_checked_at TIMESTAMP,                             -- last link_checker.py visit
    link_404_streak INTEGER      NOT NULL DEFAULT 0,       -- consecutive 404s; 2 = dead. See link_checker.py
    district        TEXT,                                  -- from location_map.py; NULL = unmapped/national/overseas
    hub             TEXT                                   -- analytical industrial cluster
);

-- ---------------------------------------------------------------------------
-- job_skills — many skills per posting. UNIQUE from skill_extractor.py.
-- posting_id is INTEGER while job_postings.id is BIGINT — a real live type
-- mismatch. Works today; consider BIGINT if you ever rebuild from scratch.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_skills (
    posting_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    skill      TEXT    NOT NULL,
    UNIQUE (posting_id, skill)
);

-- ---------------------------------------------------------------------------
-- skill_map — raw tag -> canonical skill. Composite PK from load_skill_map.py.
-- canonical_skill = 'DROP' means filler (excluded from analytics).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_map (
    raw_skill       TEXT NOT NULL,
    canonical_skill TEXT NOT NULL,   -- 'DROP' = filler/non-skill
    PRIMARY KEY (raw_skill, canonical_skill)
);

-- ---------------------------------------------------------------------------
-- bdjobs_categories — still live, but UNUSED by current code (bdjobs.py
-- hardcodes the CATEGORIES dict). Kept because it exists; drop if you confirm
-- nothing reads it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bdjobs_categories (
    cat_id   INTEGER PRIMARY KEY,
    cat_name TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes  (base + trigram from original schema; later-column set inferred)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_job_postings_source     ON job_postings (source);
CREATE INDEX IF NOT EXISTS idx_job_postings_company    ON job_postings (company);
CREATE INDEX IF NOT EXISTS idx_job_postings_posted_at  ON job_postings (posted_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_scraped_at ON job_postings (scraped_at);

CREATE INDEX IF NOT EXISTS idx_job_postings_title_trgm
    ON job_postings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_trgm
    ON job_postings USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_postings_description_trgm
    ON job_postings USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_job_postings_last_seen_at ON job_postings (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_category     ON job_postings (category);
CREATE INDEX IF NOT EXISTS idx_job_postings_district     ON job_postings (district);
CREATE INDEX IF NOT EXISTS idx_job_postings_duplicate_of ON job_postings (duplicate_of);
CREATE INDEX IF NOT EXISTS idx_job_skills_posting_id     ON job_skills (posting_id);
