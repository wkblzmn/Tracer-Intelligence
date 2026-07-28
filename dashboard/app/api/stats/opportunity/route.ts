import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  // Per-category shape of the market. Serves two boxes on the seekers panel:
  // the opportunity scatter (volume x pay, sized by employers, coloured by
  // disclosure) and market composition (share of total postings).
  //
  // Note on "disclosed": a range of 20,000-120,000 is treated as NOT disclosed.
  // A spread wider than 100% of the floor communicates nothing, so counting it
  // as disclosure would overstate transparency and drag the median around.
  const { rows } = await pool.query(
    `WITH active AS (
       SELECT
         category,
         company,
         salary_min,
         salary_max,
         CASE
           WHEN salary_min IS NOT NULL
            AND salary_min > 0
            AND (
              salary_max IS NULL
              OR (salary_max - salary_min)::float / salary_min <= 1.0
            )
           THEN COALESCE((salary_min + salary_max) / 2.0, salary_min)
         END AS pay
       FROM job_postings
       WHERE duplicate_of IS NULL
         AND is_confidential = FALSE
         AND link_dead = FALSE
         AND last_seen_at >= NOW() - INTERVAL '3 days'
         AND category IS NOT NULL
         AND category <> ''
         AND category <> 'Uncategorized'
     )
     SELECT
       category,
       COUNT(*)                                   AS postings,
       COUNT(DISTINCT company)                    AS employers,
       COUNT(pay)                                 AS disclosed,
       -- Only report a median when enough salaries back it. Research/Consultancy
       -- had 3 disclosed, Pathologist 4, Nurse 7 — and Mechanic/Technician came
       -- out above IT on the strength of 15. On a scatter those plot with the
       -- same confidence as a median built from 543, which is misleading.
       CASE WHEN COUNT(pay) >= 20
            THEN percentile_cont(0.5) WITHIN GROUP (ORDER BY pay)
       END AS median_pay
     FROM active
     GROUP BY category
     HAVING COUNT(*) >= 20
     ORDER BY postings DESC`
  )

  const total = rows.reduce((sum, r) => sum + Number(r.postings), 0)

  return NextResponse.json({
    total_postings: total,
    categories: rows.map((r) => {
      const postings = Number(r.postings)
      const disclosed = Number(r.disclosed)
      return {
        category: r.category,
        postings,
        employers: Number(r.employers),
        disclosed,
        // share of all categorised postings — drives market composition
        share: Number(((postings / total) * 100).toFixed(1)),
        // what fraction of this category states usable pay
        disclosure_rate: Number(((disclosed / postings) * 100).toFixed(1)),
        // null when disclosure is too thin to support a median. The category
        // still carries volume, employers and disclosure_rate — it just gets no
        // y-position on the scatter, rather than a fabricated one.
        median_pay: r.median_pay === null ? null : Math.round(Number(r.median_pay)),
      }
    }),
  })
}