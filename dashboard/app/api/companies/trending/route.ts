import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10)

  // Companies with the most CURRENTLY-ACTIVE openings. Uses the same canonical
  // "active" predicate as search + the company page, so the count shown here
  // reconciles with the jobs a user sees when they click through.
  const { rows } = await pool.query(
    `SELECT company, COUNT(*) as job_count
     FROM job_postings
     WHERE duplicate_of IS NULL
       AND is_confidential = FALSE
       AND link_dead = FALSE
       AND last_seen_at >= NOW() - INTERVAL '3 days'
     GROUP BY company
     ORDER BY job_count DESC
     LIMIT $1`,
    [limit]
  )

  return NextResponse.json(rows)
}