import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  // Most-posted ROLES, with seniority preserved as its own dimension.
  //
  // Pipeline, in order — the order matters:
  //   1. map Bangla titles to English (title_map), so ড্রাইভার merges with driver
  //   2. extract seniority into its own field rather than discarding it
  //   3. strip brackets / dash suffixes / gender+shift qualifiers
  //   4. if what remains is only a generic rank ("manager"), promote the
  //      qualifier in front of it, so "Assistant Manager (Accounts)" becomes
  //      "accounts manager" instead of collapsing into "manager"
  //
  // Steps 2 and 4 exist because BD job titles are rank-first, with the actual
  // function in a bracket or after a dash. Naive normalization keeps the rank
  // and throws away the job — at one point "executive" absorbed 676 distinct
  // titles.
  const { rows } = await pool.query(
    `WITH active AS (
       SELECT title
       FROM job_postings
       WHERE duplicate_of IS NULL
         AND is_confidential = FALSE
         AND link_dead = FALSE
         AND last_seen_at >= NOW() - INTERVAL '3 days'
         AND title IS NOT NULL
     ),
     -- 1. Bangla -> English before anything else, so seniority words in
     --    Bangla ("সহকারী") become extractable English ones ("assistant").
     mapped AS (
       SELECT
         a.title AS raw,
         -- Replace ONLY the Bangla base, and hand the bracket through intact.
         -- Bangla brackets carry the role the same way English ones do —
         -- "অফিস সহায়ক (পিয়ন)" states the job is peon. Stripping the bracket
         -- before the lookup would discard exactly the information we want,
         -- which is the mistake v1 made with the dash.
         CASE
           WHEN tm.en_title IS NOT NULL
           THEN tm.en_title ||
                COALESCE(
                  ' (' || (regexp_match(a.title, '[\\(\\[]([^\\)\\]]{2,40})[\\)\\]]'))[1] || ')',
                  ''
                )
           ELSE lower(btrim(a.title))
         END AS t
       FROM active a
       LEFT JOIN title_map tm
         ON tm.raw_title = btrim(regexp_replace(lower(a.title), '\\s*[\\(\\[].*$', ''))
     ),
     parts AS (
       SELECT
         raw,
         -- 2. seniority, captured not discarded
         COALESCE(
           CASE (regexp_match(t, '^(sr\\.?|senior|jr\\.?|junior|asst\\.?|assistant|deputy|trainee|chief|head|lead)\\y'))[1]
             WHEN 'sr'    THEN 'senior'
             WHEN 'sr.'   THEN 'senior'
             WHEN 'jr'    THEN 'junior'
             WHEN 'jr.'   THEN 'junior'
             WHEN 'asst'  THEN 'assistant'
             WHEN 'asst.' THEN 'assistant'
             ELSE (regexp_match(t, '^(senior|junior|assistant|deputy|trainee|chief|head|lead)\\y'))[1]
           END,
           'standard'
         ) AS seniority,
         -- 3. qualifier: first bracketed phrase, else trailing dash phrase
         NULLIF(btrim(COALESCE(
             (regexp_match(t, '[\\(\\[]([^\\)\\]]{2,40})[\\)\\]]'))[1],
             (regexp_match(t, '[-–—]\\s*([^-–—\\(\\)]{2,40})\\s*$'))[1]
         ), ' .,-'), '') AS qualifier,
         btrim(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(t, '\\s*[\\(\\[][^\\)\\]]*[\\)\\]]', '', 'g'),
                   '\\s*[–—/|]\\s*', ' - ', 'g'
                 ),
                 '\\s*-?\\s*\\y(female|male|day shift|night shift|remote|full time|part time|contractual)\\y', '', 'g'
               ),
               '^(sr\\.?|jr\\.?|senior|junior|asst\\.?|assistant|deputy|trainee|chief|head|lead)\\s+', '', 'g'
             ),
             '\\s+', ' ', 'g'
           ),
           ' .,-'
         ) AS base
       FROM mapped
     ),
     resolved AS (
       SELECT
         seniority,
         -- 4. promote the qualifier ahead of a bare rank
         CASE
           WHEN base IN (
                  'manager','executive','officer','engineer','associate',
                  'coordinator','supervisor','specialist','analyst','consultant',
                  'director','general manager','agm','gm','dgm','intern','assistant'
                )
            AND qualifier IS NOT NULL
            AND array_length(string_to_array(qualifier, ' '), 1) <= 3
            AND qualifier NOT IN ('agm','gm','dgm','cmo','sr','jr')
           THEN btrim(regexp_replace(qualifier, '\\s+', ' ', 'g')) || ' ' || base
           ELSE base
         END AS role
       FROM parts
     )
     SELECT
       role,
       COUNT(*) AS postings,
       -- These four buckets must cover EVERY seniority value the extractor can
       -- produce, or the parts stop summing to the whole. 'assistant' was
       -- initially missed, which silently dropped 31 of 39 teacher postings
       -- out of the breakdown while leaving them in the total.
       COUNT(*) FILTER (WHERE seniority IN ('junior','trainee'))  AS entry_level,
       COUNT(*) FILTER (WHERE seniority = 'assistant')            AS assistant_level,
       COUNT(*) FILTER (WHERE seniority = 'standard')             AS unspecified,
       COUNT(*) FILTER (WHERE seniority IN ('senior','deputy','chief','head','lead')) AS senior_level
     FROM resolved
     WHERE role <> ''
       -- bare ranks with no recoverable function: honest to omit rather than
       -- present "executive" as if it were a role
       AND role NOT IN ('executive','manager','officer','assistant','associate')
     GROUP BY role
     ORDER BY postings DESC
     LIMIT 8`
  )

  return NextResponse.json(
    rows.map((r) => ({
      role: r.role,
      postings: Number(r.postings),
      entry_level: Number(r.entry_level),
      assistant_level: Number(r.assistant_level),
      unspecified: Number(r.unspecified),
      senior_level: Number(r.senior_level),
    }))
  )
}