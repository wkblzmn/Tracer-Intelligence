-- ============================================================================
-- Tracer Intelligence — same-source duplicate / repost detection
--
-- This is the writer that populates job_postings.duplicate_of — the column
-- every dashboard read filters on (`duplicate_of IS NULL`) but which had
-- never been committed to the repo.
--
-- FLAGS (never deletes) reposts of the same job WITHIN a single source. Sets
-- duplicate_of = id of the canonical (earliest) row per cluster; the canonical
-- row keeps duplicate_of = NULL.
--
-- "Same job"  = identical normalized (company, title, location).
-- New cluster = a gap of > 14 days between consecutive postings.
--
-- Cross-source dedup is deliberately NOT handled here. `source` is in every
-- PARTITION BY, so a Bdjobs listing can never be flagged as a duplicate of a
-- Skill.jobs one. Idempotent — safe to re-run after each scrape.
--
-- RUN IT PERIODICALLY, NOT ONCE. It can only flag what exists when it runs,
-- so every posting added since the last run is unflagged by definition. It
-- last ran 2026-07-10 and by 2026-08-01 had accumulated 104 unflagged
-- duplicates, inflating the active count by ~68 (about 1%).
--
--   psql "$DATABASE_URL" -f sql/dedupe_same_source.sql
-- ============================================================================

WITH normalized AS (
    SELECT
        id, source, posted_at,
        lower(trim(company))  AS company_norm,
        lower(trim(title))    AS title_norm,
        lower(trim(location)) AS location_norm
    FROM job_postings
    WHERE is_confidential = FALSE
      AND posted_at IS NOT NULL
),
ordered AS (
    SELECT *,
        LAG(posted_at) OVER (
            PARTITION BY source, company_norm, title_norm, location_norm
            ORDER BY posted_at, id
        ) AS prev_posted_at
    FROM normalized
),
islands AS (
    SELECT *,
        SUM(CASE WHEN prev_posted_at IS NULL
                   OR posted_at - prev_posted_at > 14
                 THEN 1 ELSE 0 END)
        OVER (
            PARTITION BY source, company_norm, title_norm, location_norm
            ORDER BY posted_at, id
            ROWS UNBOUNDED PRECEDING
        ) AS island_id
    FROM ordered
),
canonical AS (
    SELECT id,
        MIN(id) OVER (
            PARTITION BY source, company_norm, title_norm, location_norm, island_id
        ) AS canonical_id
    FROM islands
)
UPDATE job_postings jp
SET duplicate_of = c.canonical_id
FROM canonical c
WHERE jp.id = c.id
  AND c.id <> c.canonical_id;


-- ---------------------------------------------------------------------------
-- Diagnostic: if the UPDATE ever hangs, a stuck "idle in transaction"
-- connection is probably holding a lock. Find it, then terminate that pid.
-- ---------------------------------------------------------------------------
-- SELECT pid, state, query, query_start, wait_event_type, wait_event
-- FROM pg_stat_activity
-- WHERE datname = 'postgres'
--   AND query ILIKE '%job_postings%'
--   AND state <> 'idle';
--
-- SELECT pg_terminate_backend(<pid>);   -- fill in the stuck pid from above
