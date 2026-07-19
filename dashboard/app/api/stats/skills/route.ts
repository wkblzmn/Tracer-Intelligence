import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

interface SkillRow {
  skill: string
  bdjobs: number
  skilljobs: number
  shomvob: number
  total: number
}

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 25)

  // Per-source canonical skill demand. A posting belongs to exactly one source,
  // so per-source distinct counts sum cleanly to the total (no double counting).
  const { rows } = await pool.query(
    `SELECT COALESCE(sm.canonical_skill, js.skill) AS skill,
            jp.source,
            COUNT(DISTINCT jp.id) AS postings
     FROM job_skills js
     JOIN job_postings jp ON jp.id = js.posting_id
     LEFT JOIN skill_map sm ON js.skill = sm.raw_skill
     WHERE jp.duplicate_of IS NULL
       AND COALESCE(sm.canonical_skill, js.skill) <> 'DROP'
     GROUP BY COALESCE(sm.canonical_skill, js.skill), jp.source`
  )

  // pivot rows -> one entry per skill with a column per source
  const map = new Map<string, SkillRow>()
  for (const r of rows) {
    const key = r.skill as string
    if (!map.has(key)) {
      map.set(key, { skill: key, bdjobs: 0, skilljobs: 0, shomvob: 0, total: 0 })
    }
    const entry = map.get(key)!
    const n = Number(r.postings)
    if (r.source === "bdjobs") entry.bdjobs += n
    else if (r.source === "skilljobs") entry.skilljobs += n
    else if (r.source === "shomvob") entry.shomvob += n
    entry.total += n
  }

  const result = [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  return NextResponse.json(result)
}