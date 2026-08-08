-- ============================================================================
-- One-off repair — the 2026-08-04 mass link_dead misfire
--
-- On 2026-08-04 a single link_checker.py run flagged 4,043 postings link_dead.
-- A 150-row random sample of that batch, re-checked on 2026-08-09 through the
-- checker's own code path, returned HTTP 200 for all 150: full-size pages, no
-- soft-404s, 130 with deadlines still in the future. 2,736 of the batch were
-- still being scraped off the board daily.
--
-- The old checker only ever selected rows WHERE link_dead = FALSE, so nothing
-- ever revisited them. Every dashboard figure filters on link_dead, so the
-- site reported 1,495 active postings against ~6,000 live.
--
-- This clears that batch and hands the rows back to the checker to re-judge on
-- the new two-strike rule. It deliberately scopes to link_checked_at::date =
-- '2026-08-04': the two rows flagged on 07-27 and 07-29 were flagged alone, on
-- days with no mass event, and are left alone as probably-genuine.
--
-- Idempotent — running it twice changes nothing the second time.
--
--   psql "$DATABASE_URL" -f sql/repair_link_dead_2026_08_04.sql
-- ============================================================================

BEGIN;

-- Column backing the two-strike rule in link_checker.py.
ALTER TABLE job_postings
    ADD COLUMN IF NOT EXISTS link_404_streak INTEGER NOT NULL DEFAULT 0;

-- What is about to change.
SELECT COUNT(*) AS rows_to_clear
FROM job_postings
WHERE link_dead
  AND link_checked_at::date = DATE '2026-08-04';

-- link_checked_at = NULL puts these first in the checker's queue
-- (ORDER BY link_checked_at ASC NULLS FIRST), so they are re-judged on the
-- next run rather than sitting revived-but-unverified.
UPDATE job_postings
SET link_dead       = FALSE,
    link_404_streak = 0,
    link_checked_at = NULL
WHERE link_dead
  AND link_checked_at::date = DATE '2026-08-04';

-- What the site should read afterwards, by the canonical active predicate in
-- dashboard/app/api/stats/metrics/route.ts.
SELECT source, COUNT(*) AS active_now
FROM job_postings
WHERE last_seen_at >= NOW() - INTERVAL '3 days'
  AND duplicate_of IS NULL
  AND is_confidential = FALSE
  AND link_dead = FALSE
GROUP BY source
ORDER BY source;

COMMIT;
