import { NextResponse } from "next/server"
import pool from "@/lib/db"

type Src = "bdjobs" | "skilljobs" | "shomvob"

// A source is only trusted as a survival curve if its "closed" cohort actually
// closed on a spread of different days. A crawl gap (a source not being
// re-scraped for a stretch) freezes last_seen_at for everything still active
// at the time, so unrelated postings all appear to "close" on the same single
// date once they cross the 3-day threshold -- a batch artifact, not real
// closures. Require closures spread across a handful of distinct dates before
// trusting the curve.
const MIN_DISTINCT_CLOSE_DATES = 5

export async function GET() {
  // "Closed" postings only (no longer observed active), with a real posted_at.
  // days_alive = last day we saw it live - date posted. Descriptive of the
  // closed cohort's shelf life; not a censored KM estimate.
  const { rows } = await pool.query(
    `SELECT source, (last_seen_at::date - posted_at) AS days, last_seen_at::date AS closed_on
     FROM job_postings
     WHERE posted_at IS NOT NULL
       AND duplicate_of IS NULL
       AND is_confidential = FALSE
       AND last_seen_at < NOW() - INTERVAL '3 days'
       AND last_seen_at::date >= posted_at
       AND (last_seen_at::date - posted_at) <= 120`
  )

  const bySrc: Record<Src, number[]> = { bdjobs: [], skilljobs: [], shomvob: [] }
  const closeDatesBySrc: Record<Src, Set<string>> = { bdjobs: new Set(), skilljobs: new Set(), shomvob: new Set() }
  for (const r of rows) {
    const s = r.source as Src
    if (!bySrc[s]) continue
    bySrc[s].push(Number(r.days))
    closeDatesBySrc[s].add(String(r.closed_on))
  }

  const reliable: Record<Src, boolean> = {
    bdjobs: closeDatesBySrc.bdjobs.size >= MIN_DISTINCT_CLOSE_DATES,
    skilljobs: closeDatesBySrc.skilljobs.size >= MIN_DISTINCT_CLOSE_DATES,
    shomvob: closeDatesBySrc.shomvob.size >= MIN_DISTINCT_CLOSE_DATES,
  }

  const CAP = 60
  const curves: { day: number; bdjobs: number | null; skilljobs: number | null; shomvob: number | null }[] = []
  for (let day = 0; day <= CAP; day++) {
    const surv = (src: Src) => {
      if (!reliable[src]) return null
      const arr = bySrc[src]
      return arr.length ? Math.round((arr.filter((d) => d >= day).length / arr.length) * 1000) / 10 : null
    }
    curves.push({
      day,
      bdjobs: surv("bdjobs"),
      skilljobs: surv("skilljobs"),
      shomvob: surv("shomvob"),
    })
  }

  const median = (src: Src) => {
    if (!reliable[src]) return null
    const arr = bySrc[src]
    if (!arr.length) return null
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
  }

  return NextResponse.json({
    curves,
    medians: { bdjobs: median("bdjobs"), skilljobs: median("skilljobs"), shomvob: median("shomvob") },
    counts: { bdjobs: bySrc.bdjobs.length, skilljobs: bySrc.skilljobs.length, shomvob: bySrc.shomvob.length },
    reliable,
  })
}