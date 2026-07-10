import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword") ?? ""
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20)
  const pattern = `%${keyword}%`

  const { rows } = await pool.query(
    `SELECT title, company, location, posted_at, source_url
     FROM job_postings
     WHERE title ILIKE $1
        OR description ILIKE $2
        OR company ILIKE $3
     ORDER BY posted_at DESC
     LIMIT $4`,
    [pattern, pattern, pattern, limit]
  )

  return NextResponse.json(rows)
}