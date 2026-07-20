import { NextResponse } from "next/server"
import pool from "@/lib/db"

interface Cell {
  bdjobs: number
  skilljobs: number
  shomvob: number
}

export async function GET() {
  // Active postings per sector per source. Normalized WITHIN each source on the
  // client so columns are comparable (Bdjobs is ~10x the others). Uncategorized
  // excluded — it's unrecoverable expired Skill.jobs rows, not a real sector.
  const { rows } = await pool.query(
    `SELECT category, source, COUNT(*) AS n
     FROM job_postings
     WHERE duplicate_of IS NULL
       AND is_confidential = FALSE
       AND link_dead = FALSE
       AND last_seen_at >= NOW() - INTERVAL '3 days'
       AND category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'
     GROUP BY category, source`
  )

  // pivot to one row per sector with a column per source
  const map = new Map<string, Cell & { sector: string }>()
  const totals = { bdjobs: 0, skilljobs: 0, shomvob: 0 }

  for (const r of rows) {
    const sector = r.category as string
    if (!map.has(sector)) map.set(sector, { sector, bdjobs: 0, skilljobs: 0, shomvob: 0 })
    const cell = map.get(sector)!
    const n = Number(r.n)
    if (r.source === "bdjobs") { cell.bdjobs += n; totals.bdjobs += n }
    else if (r.source === "skilljobs") { cell.skilljobs += n; totals.skilljobs += n }
    else if (r.source === "shomvob") { cell.shomvob += n; totals.shomvob += n }
  }

  // % share within each source (a source's column sums to ~100%)
  const sectors = [...map.values()].map(c => ({
    sector: c.sector,
    counts: { bdjobs: c.bdjobs, skilljobs: c.skilljobs, shomvob: c.shomvob },
    share: {
      bdjobs: totals.bdjobs ? (c.bdjobs / totals.bdjobs) * 100 : 0,
      skilljobs: totals.skilljobs ? (c.skilljobs / totals.skilljobs) * 100 : 0,
      shomvob: totals.shomvob ? (c.shomvob / totals.shomvob) * 100 : 0,
    },
  }))

  // order sectors by total volume across sources (most significant on top)
  sectors.sort((a, b) => {
    const ta = a.counts.bdjobs + a.counts.skilljobs + a.counts.shomvob
    const tb = b.counts.bdjobs + b.counts.skilljobs + b.counts.shomvob
    return tb - ta
  })

  return NextResponse.json({ sectors, totals })
}