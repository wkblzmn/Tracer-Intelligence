import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  // Top canonical skills (matrix axes) — by distinct postings.
  const top = await pool.query(
    `SELECT COALESCE(sm.canonical_skill, js.skill) AS skill, COUNT(DISTINCT jp.id) AS c
     FROM job_skills js
     JOIN job_postings jp ON jp.id = js.posting_id
     LEFT JOIN skill_map sm ON js.skill = sm.raw_skill
     WHERE jp.duplicate_of IS NULL
       AND COALESCE(sm.canonical_skill, js.skill) <> 'DROP'
     GROUP BY 1
     ORDER BY c DESC
     LIMIT 18`
  )
  const skills = top.rows.map((r) => ({ skill: r.skill as string, count: Number(r.c) }))
  const set = new Set(skills.map((s) => s.skill))

  // Pairwise co-occurrence (canonical, deduped per posting).
  const pairsRes = await pool.query(
    `WITH d AS (
       SELECT DISTINCT jp.id AS pid, COALESCE(sm.canonical_skill, js.skill) AS skill
       FROM job_skills js
       JOIN job_postings jp ON jp.id = js.posting_id
       LEFT JOIN skill_map sm ON js.skill = sm.raw_skill
       WHERE jp.duplicate_of IS NULL
         AND COALESCE(sm.canonical_skill, js.skill) <> 'DROP'
     )
     SELECT a.skill AS sa, b.skill AS sb, COUNT(*) AS n
     FROM d a
     JOIN d b ON a.pid = b.pid AND a.skill < b.skill
     GROUP BY a.skill, b.skill`
  )

  // keep only pairs where both endpoints are top skills
  const pairs = pairsRes.rows
    .filter((r) => set.has(r.sa) && set.has(r.sb))
    .map((r) => ({ a: r.sa as string, b: r.sb as string, n: Number(r.n) }))

  return NextResponse.json({ skills, pairs })
}