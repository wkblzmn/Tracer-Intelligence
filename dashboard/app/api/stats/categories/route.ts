import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      category,
      COUNT(*) FILTER (WHERE posted_at >= CURRENT_DATE - INTERVAL '30 days') AS this_period,
      COUNT(*) FILTER (WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
                         AND posted_at < CURRENT_DATE - INTERVAL '30 days') AS prev_period,
      COUNT(*) AS total
    FROM job_postings
    WHERE category IS NOT NULL
      AND category != ''
      AND category != '0'
      AND posted_at >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY category
    ORDER BY total DESC
    LIMIT 20
  `)

  return NextResponse.json(
    rows.map(r => ({
      category: r.category,
      this_period: Number(r.this_period),
      prev_period: Number(r.prev_period),
      total: Number(r.total),
      change: Number(r.prev_period) > 0
        ? Math.round(((Number(r.this_period) - Number(r.prev_period)) / Number(r.prev_period)) * 100)
        : null
    }))
  )
}