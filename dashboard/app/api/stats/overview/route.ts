import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  const { rows } = await pool.query(
    `SELECT posted_at, COUNT(*) as jobs
     FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
     GROUP BY posted_at
     ORDER BY posted_at ASC`
  )

  return NextResponse.json(
    rows.map(r => ({ date: r.posted_at, jobs: Number(r.jobs) }))
  )
}