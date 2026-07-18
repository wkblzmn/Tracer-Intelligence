import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const companyName = decodeURIComponent(name)

  const { rows } = await pool.query(
    `SELECT title, location, category, salary_raw, salary_min, salary_max,
            description, deadline, posted_at, source, source_url, last_seen_at
     FROM job_postings
     WHERE lower(trim(company)) = lower(trim($1))
       AND is_confidential = FALSE
       AND duplicate_of IS NULL
     ORDER BY posted_at DESC`,
    [companyName]
  )

  return NextResponse.json(
    rows.map(r => ({
      ...r,
      posted_at: r.posted_at instanceof Date
        ? r.posted_at.toISOString().slice(0, 10)
        : r.posted_at,
      deadline: r.deadline instanceof Date
        ? r.deadline.toISOString().slice(0, 10)
        : r.deadline,
    }))
  )
}