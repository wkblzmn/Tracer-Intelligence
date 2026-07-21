import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const keyword = params.get("keyword") ?? ""
  const location = params.get("location")
  const district = params.get("district")
  const category = params.get("category")
  const source = params.get("source")
  const dateFrom = params.get("dateFrom")
  const dateTo = params.get("dateTo")
  const salaryMin = params.get("salaryMin")
  const salaryMax = params.get("salaryMax")
  const limit = Number(params.get("limit") ?? 20)

  const conditions: string[] = [
    "duplicate_of IS NULL",
    "is_confidential = FALSE",
    "last_seen_at >= NOW() - INTERVAL '3 days'",
    "link_dead = FALSE",
  ]
  const values: (string | number)[] = []

  if (keyword.trim()) {
    const pattern = `%${keyword}%`
    values.push(pattern, pattern, pattern)
    conditions.push(
      `(title ILIKE $${values.length - 2} OR description ILIKE $${values.length - 1} OR company ILIKE $${values.length})`
    )
  }
  if (location) {
    values.push(`%${location}%`)
    conditions.push(`location ILIKE $${values.length}`)
  }
  if (district) {
    values.push(district)
    conditions.push(`district = $${values.length}`)
  }
  if (category) {
    values.push(category)
    conditions.push(`category = $${values.length}`)
  }
  if (source) {
    values.push(source)
    conditions.push(`source = $${values.length}`)
  }
  if (dateFrom) {
    values.push(dateFrom)
    conditions.push(`posted_at >= $${values.length}`)
  }
  if (dateTo) {
    values.push(dateTo)
    conditions.push(`posted_at <= $${values.length}`)
  }
  if (salaryMin) {
    values.push(Number(salaryMin))
    conditions.push(`salary_max >= $${values.length}`)
  }
  if (salaryMax) {
    values.push(Number(salaryMax))
    conditions.push(`salary_min <= $${values.length}`)
  }

  const whereClause = conditions.join(" AND ")

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM job_postings WHERE ${whereClause}`,
    values
  )
  const total = Number(countRows[0].total)

  values.push(limit)
  const limitIndex = values.length

  const { rows } = await pool.query(
    `SELECT title, company, location, category, salary_raw, salary_min, salary_max,
            posted_at, deadline, source, source_url
     FROM job_postings
     WHERE ${whereClause}
     ORDER BY posted_at DESC
     LIMIT $${limitIndex}`,
    values
  )

  return NextResponse.json({
    total,
    jobs: rows.map(r => ({
      ...r,
      posted_at: r.posted_at instanceof Date ? r.posted_at.toISOString().slice(0, 10) : r.posted_at,
      deadline: r.deadline instanceof Date ? r.deadline.toISOString().slice(0, 10) : r.deadline,
    })),
  })
}