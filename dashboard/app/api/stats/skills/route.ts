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

  // Opt-in richer shape. The existing /skills page consumes a bare array, so
  // the default response is unchanged; only callers that ask get the wrapper.
  if (request.nextUrl.searchParams.get("withCoverage") !== "1") {
    return NextResponse.json(result)
  }

  // How much of the live market actually carries skill data. This is the
  // number the story panel has to disclose: skills for bdjobs and shomvob are
  // matched against a fixed dictionary, so anything outside that word list is
  // invisible, and most postings match nothing at all.
  const { rows: cov } = await pool.query(
    `SELECT jp.source,
            COUNT(*) AS active,
            COUNT(*) FILTER (
              WHERE EXISTS (SELECT 1 FROM job_skills js WHERE js.posting_id = jp.id)
            ) AS with_skills
     FROM job_postings jp
     WHERE jp.duplicate_of IS NULL
       AND jp.last_seen_at >= NOW() - INTERVAL '3 days'
     GROUP BY jp.source`
  )

  const coverage = cov.map((r) => ({
    source: r.source as string,
    active: Number(r.active),
    with_skills: Number(r.with_skills),
    pct: Number(r.active) ? Math.round((Number(r.with_skills) / Number(r.active)) * 100) : 0,
  }))
  const totalActive = coverage.reduce((s, c) => s + c.active, 0)
  const totalWith = coverage.reduce((s, c) => s + c.with_skills, 0)

  return NextResponse.json({
    skills: result,
    coverage,
    total_active: totalActive,
    total_with_skills: totalWith,
    overall_pct: totalActive ? Math.round((totalWith / totalActive) * 100) : 0,
  })
}