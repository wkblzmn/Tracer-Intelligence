import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  // Canonical active predicate — must match search, trending, and company page.
  const { rows: [active] } = await pool.query(
    `SELECT COUNT(*) as count FROM job_postings
     WHERE last_seen_at >= NOW() - INTERVAL '3 days'
       AND duplicate_of IS NULL
       AND is_confidential = FALSE
       AND link_dead = FALSE`
  )
  const { rows: [recent] } = await pool.query(
    `SELECT COUNT(*) as count FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
       AND duplicate_of IS NULL`
  )
  // Confidential rows excluded: placeholder names ("A Reputed Group") and
  // address-strings would each count as a distinct "company".
  const { rows: [companies] } = await pool.query(
    `SELECT COUNT(DISTINCT company) as count FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
       AND is_confidential = FALSE`
  )
  const { rows: [total] } = await pool.query(
    `SELECT COUNT(DISTINCT company) as count FROM job_postings
     WHERE is_confidential = FALSE`
  )

  return NextResponse.json({
    active_postings: Number(active.count),
    postings_60d: Number(recent.count),
    companies_hiring: Number(companies.count),
    total_companies: Number(total.count),
  })
}
