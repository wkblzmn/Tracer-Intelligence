import { NextResponse } from "next/server"
import pool from "@/lib/db"

// Sector movement, published WITH its own unreliability.
//
// The honest constraint: continuous daily crawling is young, and there was a
// long gap before it. Everything posted during that gap was captured
// retroactively in one catch-up run, so only postings still alive that day
// survived — anything that opened and closed inside the gap is gone forever.
// That makes any comparison spanning the gap a survivorship artifact.
//
// This endpoint therefore does two things:
//   1. derives the usable window from the crawl log rather than assuming one,
//      so the window grows on its own as history accrues, and
//   2. returns the caveats as data, so the panel states them instead of
//      quietly implying the numbers are solid.

type Day = { day: string; rows: number }

// Two blocks of this many days each, minimum, before a comparison is offered.
const MIN_CLEAN_DAYS = 4

export async function GET() {
  // The crawl log: which days the scraper actually inserted anything.
  const { rows: crawlRows } = await pool.query(
    `SELECT scraped_at::date AS day, COUNT(*) AS rows_inserted
     FROM job_postings
     GROUP BY 1 ORDER BY 1`
  )
  const days: Day[] = crawlRows.map((r) => ({
    day: new Date(r.day).toISOString().slice(0, 10),
    rows: Number(r.rows_inserted),
  }))

  // Find the last gap of more than one day. Collection is only trustworthy
  // after it — and we skip one further day, because the run right after a gap
  // carries the backlog it accumulated and would inflate the first block.
  let gapEnd: string | null = null
  let gapDays = 0
  // The biggest gap is tracked separately: the window starts after the LAST
  // gap, but it is the LONGEST one the reader needs warning about, since
  // everything inside it was captured retroactively and is missing whatever
  // opened and closed while nobody was looking.
  let worstGapDays = 0
  let worstGapFrom: string | null = null
  let worstGapTo: string | null = null
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1].day).getTime()
    const cur = new Date(days[i].day).getTime()
    const diff = Math.round((cur - prev) / 86400000)
    if (diff > 1) {
      gapEnd = days[i].day
      gapDays = diff - 1
      if (diff - 1 > worstGapDays) {
        worstGapDays = diff - 1
        worstGapFrom = days[i - 1].day
        worstGapTo = days[i].day
      }
    }
  }

  const afterGap = gapEnd
    ? days.filter((d) => d.day > gapEnd!)
    : days
  // Drop the first post-gap day: it is catch-up, not a normal day.
  const clean = afterGap.slice(1)

  // What is known about collection history is known whether or not the
  // comparison can be made, so it is assembled once and returned either way.
  // The unusable branch used to drop all of it, which is why the coverage panel
  // read "collecting since —" and "a 0-day hole in it": the figures existed,
  // the payload just withheld them.
  const history = {
    gap_days: gapDays,
    gap_ended: gapEnd,
    worst_gap_days: worstGapDays,
    worst_gap_from: worstGapFrom,
    worst_gap_to: worstGapTo,
    first_crawl: days[0]?.day ?? null,
    last_crawl: days[days.length - 1]?.day ?? null,
    total_crawl_days: days.length,
    clean_days: clean.length,
    // The day unbroken collection resumed — null while there is no such day,
    // which is a fact worth stating rather than rendering as a dash.
    continuous_from: clean[0]?.day ?? null,
  }

  if (clean.length < MIN_CLEAN_DAYS) {
    return NextResponse.json({
      usable: false,
      reason: "not enough continuously-crawled days to compare anything",
      min_clean_days: MIN_CLEAN_DAYS,
      caveats: {
        ...history,
        rising_count: 0,
        sector_count: 0,
        one_directional: false,
      },
      sectors: [],
    })
  }

  const from = clean[0].day
  const to = clean[clean.length - 1].day
  // Two equal blocks. Odd day counts drop the middle day rather than give one
  // block an extra day of volume.
  const half = Math.floor(clean.length / 2)
  const earlierFrom = clean[0].day
  const earlierTo = clean[half - 1].day
  const recentFrom = clean[clean.length - half].day
  const recentTo = to

  const { rows } = await pool.query(
    `SELECT category,
            COUNT(*) FILTER (WHERE posted_at >= $3 AND posted_at <= $4) AS recent,
            COUNT(*) FILTER (WHERE posted_at >= $1 AND posted_at <= $2) AS earlier
     FROM job_postings
     WHERE duplicate_of IS NULL
       AND posted_at >= $1 AND posted_at <= $4
       AND category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'
     GROUP BY category`,
    [earlierFrom, earlierTo, recentFrom, recentTo]
  )

  const sectors = rows
    .map((r) => {
      const earlier = Number(r.earlier)
      const recent = Number(r.recent)
      return {
        sector: r.category as string,
        earlier,
        recent,
        delta: recent - earlier,
        pct: earlier > 0 ? Math.round(((recent - earlier) / earlier) * 100) : null,
      }
    })
    // Small sectors swing wildly on a handful of postings; anything under this
    // is noise dressed as a trend.
    .filter((s) => s.earlier + s.recent >= 40)
    .sort((a, b) => (b.pct ?? -999) - (a.pct ?? -999))

  const rising = sectors.filter((s) => (s.pct ?? 0) > 0).length

  return NextResponse.json({
    usable: true,
    min_clean_days: MIN_CLEAN_DAYS,
    window: {
      from,
      to,
      days: clean.length,
      earlier: { from: earlierFrom, to: earlierTo },
      recent: { from: recentFrom, to: recentTo },
      block_days: half,
    },
    // Everything the panel needs to state its own limits, computed rather
    // than written down, so it cannot drift out of date.
    caveats: {
      ...history,
      rising_count: rising,
      sector_count: sectors.length,
      // The tell: if nearly every sector moves the same way, the cause is the
      // collection window, not the labour market.
      one_directional: sectors.length > 0 && (rising <= 2 || rising >= sectors.length - 2),
    },
    sectors,
  })
}
