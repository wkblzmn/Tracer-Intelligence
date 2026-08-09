import { NextResponse } from "next/server"
import pool from "@/lib/db"

// How far a job title travels between industries — the switcher's question.
//
// Deliberately NOT built on skills: cross-source skill overlap is still
// unvalidated, and the dictionary extraction behind bdjobs/shomvob skills has
// not been checked. Title + sector + employer are all first-party fields.
//
// Window is 120 days rather than the active cohort. Portability is a
// structural property of a job, not a statement about what is open today, and
// the active cohort alone is too thin to measure breadth.

// Bdjobs runs two parallel category systems (white-collar ids 1-29,
// blue-collar 61-92), so one occupation can appear under two labels. Breadth
// is a count of DISTINCT sectors, so leaving these split would inflate exactly
// the number this endpoint exists to report. Only unambiguous same-occupation
// pairs are merged; anything requiring a judgement call is left alone.
const SECTOR_ALIASES = `(VALUES
  ('Graphic Designer','Design/Creative'),
  ('Data Entry/Computer Operator','Data Entry/Operator/BPO'),
  ('Driver','Driving/Motor Technician'),
  ('Nurse','Healthcare/Medical'),
  ('Pathologist/Lab Assistant','Healthcare/Medical'),
  ('Physiotherapist','Healthcare/Medical'),
  ('Sewing machine operator','Garments/Textile'),
  ('Garments technician/Machine operator','Garments/Textile'),
  ('Welder','Electrician/Construction/Repair'),
  ('Plumber/Pipe fitting','Electrician/Construction/Repair'),
  ('Mason/Construction worker','Electrician/Construction/Repair'),
  ('Carpenter','Electrician/Construction/Repair'),
  ('Electrician/Electronics Technician','Electrician/Construction/Repair'),
  ('Security Guard','Security/Support Service'),
  ('Waiter/Waitress','Hospitality/Travel/Tourism'),
  ('Chef/Cook','Hospitality/Travel/Tourism'),
  ('Beautician/Salon worker','Beauty Care/Health & Fitness'),
  ('Gym/Fitness Trainer','Beauty Care/Health & Fitness'),
  ('Showroom Assistant/Salesman','Marketing/Sales'),
  ('Sales Representative (SR)','Marketing/Sales')
) AS al(raw_cat, canon_cat)`

// Title normalization is the same pipeline as /api/stats/top-roles: map Bangla
// to English first, pull seniority out, strip brackets and qualifiers, then
// promote a qualifier ahead of a bare rank.
const BASE = `
WITH src AS (
  SELECT title, category, company
  FROM job_postings
  WHERE duplicate_of IS NULL AND is_confidential = FALSE
    AND posted_at >= CURRENT_DATE - INTERVAL '120 days'
    AND title IS NOT NULL
    AND category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'
),
canon AS (
  SELECT s.title, s.company, COALESCE(al.canon_cat, s.category) AS sector
  FROM src s LEFT JOIN ${SECTOR_ALIASES} ON al.raw_cat = s.category
),
mapped AS (
  SELECT c.sector, c.company,
    CASE WHEN tm.en_title IS NOT NULL
      THEN tm.en_title || COALESCE(' (' || (regexp_match(c.title,'[\\(\\[]([^\\)\\]]{2,40})[\\)\\]]'))[1] || ')','')
      ELSE lower(btrim(c.title)) END AS t
  FROM canon c
  LEFT JOIN title_map tm ON tm.raw_title = btrim(regexp_replace(lower(c.title),'\\s*[\\(\\[].*$',''))
),
parts AS (
  SELECT sector, company,
    NULLIF(btrim(COALESCE(
      (regexp_match(t,'[\\(\\[]([^\\)\\]]{2,40})[\\)\\]]'))[1],
      (regexp_match(t,'[-–—]\\s*([^-–—\\(\\)]{2,40})\\s*$'))[1]
    ),' .,-'),'') AS qualifier,
    btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      t,'\\s*[\\(\\[][^\\)\\]]*[\\)\\]]','','g'),
      '\\s*[–—/|]\\s*',' - ','g'),
      '\\s*-?\\s*\\y(female|male|day shift|night shift|remote|full time|part time|contractual)\\y','','g'),
      '^(sr\\.?|jr\\.?|senior|junior|asst\\.?|assistant|deputy|trainee|chief|head|lead)\\s+','','g'),
      '\\s+',' ','g'),' .,-') AS base
  FROM mapped
),
resolved AS (
  SELECT sector, company,
    CASE WHEN base IN ('manager','executive','officer','engineer','associate','coordinator',
                       'supervisor','specialist','analyst','consultant','director',
                       'general manager','agm','gm','dgm','intern','assistant')
          AND qualifier IS NOT NULL
          AND array_length(string_to_array(qualifier,' '),1) <= 3
          AND qualifier NOT IN ('agm','gm','dgm','cmo','sr','jr')
         THEN btrim(regexp_replace(qualifier,'\\s+',' ','g')) || ' ' || base
         ELSE base END AS role
  FROM parts
),
clean AS (
  SELECT * FROM resolved
  WHERE role <> '' AND role NOT IN ('executive','manager','officer','assistant','associate')
    AND role NOT LIKE '%- %'
),
cells AS (
  SELECT role, sector, COUNT(*) n, COUNT(DISTINCT company) emp
  FROM clean GROUP BY role, sector
),
-- A sector only counts toward breadth once it has hired the role more than
-- twice. Without this one stray advert reads as "this industry hires you":
-- office assistant looked like 11 sectors, 8 of which were a single posting.
solid AS (SELECT * FROM cells WHERE n >= 3),
totals AS (
  SELECT role, COUNT(*) AS sectors, SUM(n) AS postings, SUM(emp) AS employers
  FROM solid GROUP BY role HAVING SUM(n) >= 20
)`

// One constant for both the widest-roles list and its sector split. They were
// 6 and 3, so roles 4-6 came back with `breakdown: []` — harmless while nothing
// rendered them, a row of empty bars as soon as something did.
const WIDEST_LIMIT = 6

export async function GET() {
  const [dist, portable, locked, breakdown, examples] = await Promise.all([
    // How many roles sit at each level of breadth — the headline shape.
    pool.query(`${BASE}
      SELECT sectors, COUNT(*) AS roles FROM totals GROUP BY sectors ORDER BY sectors`),
    // The widest-travelling roles.
    pool.query(`${BASE}
      SELECT role, sectors, postings, employers FROM totals
      ORDER BY sectors DESC, postings DESC LIMIT ${WIDEST_LIMIT}`),
    // Single-sector roles, by how many people they employ.
    pool.query(`${BASE}
      SELECT role, postings, employers FROM totals
      WHERE sectors = 1 ORDER BY postings DESC LIMIT 6`),
    // Sector split for the widest roles, so "4 sectors" can be shown honestly
    // as the lopsided thing it usually is.
    pool.query(`${BASE}
      , top AS (SELECT role FROM totals ORDER BY sectors DESC, postings DESC LIMIT ${WIDEST_LIMIT})
      SELECT s.role, s.sector, s.n AS postings
      FROM solid s JOIN top USING (role) ORDER BY s.role, s.n DESC`),
    // Two named examples per breadth band, each with the industries it sits
    // in. "26 titles" is an abstraction; "teacher — Education/Training" is
    // the thing the reader can actually check against their own job.
    pool.query(`${BASE}
      , ranked AS (
        SELECT sectors, role, postings,
               ROW_NUMBER() OVER (PARTITION BY sectors ORDER BY postings DESC) AS rn
        FROM totals
      )
      SELECT r.sectors, r.role,
             (SELECT string_agg(s.sector, ', ' ORDER BY s.n DESC)
              FROM solid s WHERE s.role = r.role) AS sector_names
      FROM ranked r WHERE r.rn <= 2
      ORDER BY r.sectors, r.postings DESC`),
  ])

  const bySector = new Map<string, { sector: string; postings: number }[]>()
  for (const r of breakdown.rows) {
    if (!bySector.has(r.role)) bySector.set(r.role, [])
    bySector.get(r.role)!.push({ sector: r.sector, postings: Number(r.postings) })
  }

  const totalRoles = dist.rows.reduce((s, r) => s + Number(r.roles), 0)
  const singleSector = Number(
    dist.rows.find((r) => Number(r.sectors) === 1)?.roles ?? 0
  )

  return NextResponse.json({
    total_roles: totalRoles,
    single_sector_roles: singleSector,
    single_sector_share: totalRoles
      ? Number(((singleSector / totalRoles) * 100).toFixed(1))
      : 0,
    max_sectors: dist.rows.length
      ? Math.max(...dist.rows.map((r) => Number(r.sectors)))
      : 0,
    distribution: dist.rows.map((r) => ({
      sectors: Number(r.sectors),
      roles: Number(r.roles),
      examples: examples.rows
        .filter((e) => Number(e.sectors) === Number(r.sectors))
        .map((e) => ({
          role: e.role as string,
          sectors: (e.sector_names as string | null) ?? "",
        })),
    })),
    portable: portable.rows.map((r) => ({
      role: r.role as string,
      sectors: Number(r.sectors),
      postings: Number(r.postings),
      employers: Number(r.employers),
      breakdown: bySector.get(r.role) ?? [],
    })),
    locked: locked.rows.map((r) => ({
      role: r.role as string,
      postings: Number(r.postings),
      employers: Number(r.employers),
    })),
  })
}
