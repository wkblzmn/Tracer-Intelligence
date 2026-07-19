import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  const { rows: [active] } = await pool.query(
    `SELECT COUNT(*) as count FROM job_postings 
     WHERE last_seen_at >= NOW() - INTERVAL '3 days'
       AND duplicate_of IS NULL
       AND link_dead = FALSE`
  )
  const { rows: [recent] } = await pool.query(
    `SELECT COUNT(*) as count FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'`
  )
  const { rows: [companies] } = await pool.query(
    `SELECT COUNT(DISTINCT company) as count FROM job_postings
     WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'`
  )
  const { rows: [total] } = await pool.query(
    `SELECT COUNT(DISTINCT company) as count FROM job_postings`
  )

  return NextResponse.json({
    active_postings: Number(active.count),
    new_this_week: Number(recent.count),
    companies_hiring: Number(companies.count),
    total_companies: Number(total.count),
  })
}