import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  // How long applicants actually get: deadline - posted_at, per category.
  //
  // This is the one figure on the seekers panel that is advice rather than
  // description — "your field gives you 6 days" changes behaviour. No BD job
  // board can show it, because none of them keep the history.
  //
  // Guards:
  //   * deadline must be on/after the post date (bad data otherwise)
  //   * capped at 120 days — deadlines set years out are data entry noise
  //   * a category needs >= 15 windowed postings before its median is shown
  //   * coverage is returned so the panel can state how many postings even
  //     carry a deadline, rather than implying the median covers all of them
  const { rows } = await pool.query(
    `SELECT
       category,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE w IS NOT NULL) AS with_window,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY w) FILTER (WHERE w IS NOT NULL) AS p25,
       percentile_cont(0.5)  WITHIN GROUP (ORDER BY w) FILTER (WHERE w IS NOT NULL) AS p50,
       percentile_cont(0.75) WITHIN GROUP (ORDER BY w) FILTER (WHERE w IS NOT NULL) AS p75
     FROM (
       SELECT
         category,
         CASE
           WHEN deadline IS NOT NULL
            AND posted_at IS NOT NULL
            AND deadline >= posted_at
            AND (deadline - posted_at) <= 120
           THEN (deadline - posted_at)
         END AS w
       FROM job_postings
       WHERE duplicate_of IS NULL
         AND is_confidential = FALSE
         AND link_dead = FALSE
         AND last_seen_at >= NOW() - INTERVAL '3 days'
         AND category IS NOT NULL
         AND category <> ''
         AND category <> 'Uncategorized'
     ) t
     GROUP BY category
     HAVING COUNT(*) FILTER (WHERE w IS NOT NULL) >= 15
     ORDER BY p50 ASC`
  )

  return NextResponse.json(
    rows.map((r) => ({
      category: r.category,
      total: Number(r.total),
      with_window: Number(r.with_window),
      coverage: Number(((Number(r.with_window) / Number(r.total)) * 100).toFixed(1)),
      p25: Math.round(Number(r.p25)),
      p50: Math.round(Number(r.p50)),
      p75: Math.round(Number(r.p75)),
    }))
  )
}