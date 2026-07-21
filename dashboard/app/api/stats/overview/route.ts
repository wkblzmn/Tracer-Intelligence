import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  const { rows } = await pool.query(
    `SELECT posted_at::date as posted_at, COUNT(*) as jobs
     FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
       AND duplicate_of IS NULL
     GROUP BY posted_at::date
     ORDER BY posted_at::date ASC`
  )

  return NextResponse.json(
    rows.map(r => ({ 
      date: r.posted_at instanceof Date 
        ? r.posted_at.toISOString().slice(0, 10)
        : String(r.posted_at).slice(0, 10),
      jobs: Number(r.jobs) 
    }))
  )
}