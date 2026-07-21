import { NextResponse } from "next/server"
import pool from "@/lib/db"

const REAL_SECTOR = `category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'`

export async function GET() {
  // Advertised pay per sector, where disclosed (last 60 days, deduped).
  // Midpoint of min/max; p25-p75 band + median. Disclosure rate shown so the
  // numbers carry their own coverage caveat.
  const salary = await pool.query(
    `SELECT category,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE salary_min > 0) AS disclosed,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY (salary_min + COALESCE(salary_max, salary_min)) / 2.0)
              FILTER (WHERE salary_min > 0) AS p25,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY (salary_min + COALESCE(salary_max, salary_min)) / 2.0)
              FILTER (WHERE salary_min > 0) AS p50,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY (salary_min + COALESCE(salary_max, salary_min)) / 2.0)
              FILTER (WHERE salary_min > 0) AS p75
     FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
       AND duplicate_of IS NULL
       AND ${REAL_SECTOR}
     GROUP BY category
     HAVING COUNT(*) FILTER (WHERE salary_min > 0) >= 15
     ORDER BY p50 DESC
     LIMIT 12`
  )

  // Share of anonymous ("confidential") postings per sector — who hires
  // without showing their name. Active cohort, min 30 postings.
  const confidential = await pool.query(
    `SELECT category,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_confidential) AS confidential
     FROM job_postings
     WHERE duplicate_of IS NULL
       AND link_dead = FALSE
       AND last_seen_at >= NOW() - INTERVAL '3 days'
       AND ${REAL_SECTOR}
     GROUP BY category
     HAVING COUNT(*) >= 30
     ORDER BY COUNT(*) FILTER (WHERE is_confidential)::float / COUNT(*) DESC
     LIMIT 12`
  )

  return NextResponse.json({
    salary: salary.rows.map((r) => ({
      sector: r.category,
      total: Number(r.total),
      disclosed: Number(r.disclosed),
      p25: Math.round(Number(r.p25)),
      p50: Math.round(Number(r.p50)),
      p75: Math.round(Number(r.p75)),
    })),
    confidential: confidential.rows.map((r) => ({
      sector: r.category,
      total: Number(r.total),
      confidential: Number(r.confidential),
      share: Math.round((Number(r.confidential) / Number(r.total)) * 1000) / 10,
    })),
  })
}
