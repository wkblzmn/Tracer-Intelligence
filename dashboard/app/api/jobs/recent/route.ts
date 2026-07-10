import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20)
  
  const { rows } = await pool.query(
    `SELECT title, company, location, posted_at, source_url
     FROM job_postings
     ORDER BY posted_at DESC, scraped_at DESC
     LIMIT $1`,
    [limit]
  )
  
  return NextResponse.json(rows)
}