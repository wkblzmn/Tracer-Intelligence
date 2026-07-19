import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20)

  const { rows } = await pool.query(
    `SELECT title, company, location, posted_at, deadline, source_url
     FROM job_postings
     WHERE last_seen_at >= NOW() - INTERVAL '3 days'
       AND duplicate_of IS NULL
       AND link_dead = FALSE
     ORDER BY posted_at DESC, scraped_at DESC LIMIT $1`,
    [limit]
  )
  return NextResponse.json(
    rows.map(r => ({
      ...r,
      posted_at: r.posted_at instanceof Date ? r.posted_at.toISOString().slice(0, 10) : r.posted_at,
      deadline: r.deadline instanceof Date ? r.deadline.toISOString().slice(0, 10) : r.deadline,
    }))
  )
}