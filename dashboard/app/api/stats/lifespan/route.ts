import { NextResponse } from "next/server"
import pool from "@/lib/db"

type Src = "bdjobs" | "skilljobs" | "shomvob"

export async function GET() {
  // "Closed" postings only (no longer observed active), with a real posted_at.
  // days_alive = last day we saw it live - date posted. Descriptive of the
  // closed cohort's shelf life; not a censored KM estimate.
  const { rows } = await pool.query(
    `SELECT source, (last_seen_at::date - posted_at) AS days
     FROM job_postings
     WHERE posted_at IS NOT NULL
       AND duplicate_of IS NULL
       AND is_confidential = FALSE
       AND last_seen_at < NOW() - INTERVAL '3 days'
       AND last_seen_at::date >= posted_at
       AND (last_seen_at::date - posted_at) <= 120`
  )

  const bySrc: Record<Src, number[]> = { bdjobs: [], skilljobs: [], shomvob: [] }
  for (const r of rows) {
    const s = r.source as Src
    if (bySrc[s]) bySrc[s].push(Number(r.days))
  }

  const CAP = 60
  const curves: { day: number; bdjobs: number | null; skilljobs: number | null; shomvob: number | null }[] = []
  for (let day = 0; day <= CAP; day++) {
    const surv = (arr: number[]) =>
      arr.length ? Math.round((arr.filter((d) => d >= day).length / arr.length) * 1000) / 10 : null
    curves.push({
      day,
      bdjobs: surv(bySrc.bdjobs),
      skilljobs: surv(bySrc.skilljobs),
      shomvob: surv(bySrc.shomvob),
    })
  }

  const median = (arr: number[]) => {
    if (!arr.length) return null
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
  }

  return NextResponse.json({
    curves,
    medians: { bdjobs: median(bySrc.bdjobs), skilljobs: median(bySrc.skilljobs), shomvob: median(bySrc.shomvob) },
    counts: { bdjobs: bySrc.bdjobs.length, skilljobs: bySrc.skilljobs.length, shomvob: bySrc.shomvob.length },
  })
}