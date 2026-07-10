import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") ?? 30)
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10)

  const { rows } = await pool.query(
    `SELECT company, COUNT(*) as job_count
     FROM job_postings
     WHERE posted_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
     GROUP BY company
     ORDER BY job_count DESC
     LIMIT $2`,
    [days, limit]
  )

  return NextResponse.json(rows)
}