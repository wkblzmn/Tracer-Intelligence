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

// A hole of this many days or fewer no longer resets the window.
//
// It used to: ANY missing day discarded every day before it, so one failed run
// blanked the panel for five days and threw away a month of usable history. A
// 28-day hole genuinely destroys comparability — a whole cohort of adverts
// opened and closed unseen. One missing day loses only the adverts that opened
// AND closed inside it, which on a board where the median advert runs 30 days
// is a small fraction of one day's intake.
//
// The cost of tolerating it is that the window is no longer literally
// unbroken, so the missing days are counted and returned in
// caveats.missing_days for the panel to name outright. Tolerating a hole and
// not saying which one would be the dishonest version of this.
const GAP_TOLERANCE_DAYS = 1

// A posting recorded more than this many days after it was posted was not seen
// on its own day — it was recovered later. See caveats.repair.
const LATE_RECORD_DAYS = 2

export async function GET() {
  // The crawl log: which days the scraper actually inserted anything.
  // Cast to text in SQL rather than round-tripping through a JS Date.
  // node-postgres hands a DATE back as local midnight, so
  // `new Date(r.day).toISOString()` shifted every crawl day one back in any
  // timezone east of UTC — invisible on Vercel, which runs UTC, but it made a
  // local run name the wrong missing day. The panel now prints these dates to
  // a reader, so they have to be the same everywhere.
  const { rows: crawlRows } = await pool.query(
    `SELECT scraped_at::date::text AS day, COUNT(*) AS rows_inserted
     FROM job_postings
     GROUP BY 1 ORDER BY 1`
  )
  const days: Day[] = crawlRows.map((r) => ({
    day: r.day as string,
    rows: Number(r.rows_inserted),
  }))

  // Find the last DISQUALIFYING gap — one longer than GAP_TOLERANCE_DAYS.
  // Collection is only trustworthy after it, and we skip one further day
  // because the run right after a gap carries the backlog it accumulated and
  // would inflate the first block.
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
      // Every hole counts toward the worst-gap warning, tolerated or not.
      if (diff - 1 > worstGapDays) {
        worstGapDays = diff - 1
        worstGapFrom = days[i - 1].day
        worstGapTo = days[i].day
      }
      // Only a hole past the tolerance resets the usable window.
      if (diff - 1 > GAP_TOLERANCE_DAYS) {
        gapEnd = days[i].day
        gapDays = diff - 1
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
    gap_tolerance_days: GAP_TOLERANCE_DAYS,
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

  // Days inside the window the collector missed. Tolerated, but named.
  const crawled = new Set(days.map((d) => d.day))
  const missingDays: string[] = []
  for (
    let t = new Date(from + "T00:00:00Z").getTime();
    t <= new Date(to + "T00:00:00Z").getTime();
    t += 86400000
  ) {
    const iso = new Date(t).toISOString().slice(0, 10)
    if (!crawled.has(iso)) missingDays.push(iso)
  }

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

  // How much of each half was recovered late rather than seen on the day.
  //
  // This is the caveat that actually threatens the comparison, and it is not
  // symmetric. A catch-up crawl can only recover adverts still live when it
  // runs, so a repair pass tops up the RECENT half while the earlier half's
  // missed adverts have already expired and are unrecoverable. That biases the
  // comparison toward showing growth, and by a measurable amount rather than
  // an arguable one — so it is measured, in the same filters as the chart, and
  // handed to the panel.
  const { rows: [repairRow] } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE posted_at >= $1 AND posted_at <= $2) AS earlier_total,
       COUNT(*) FILTER (WHERE posted_at >= $1 AND posted_at <= $2
                          AND scraped_at::date - posted_at > $5) AS earlier_late,
       COUNT(*) FILTER (WHERE posted_at >= $3 AND posted_at <= $4) AS recent_total,
       COUNT(*) FILTER (WHERE posted_at >= $3 AND posted_at <= $4
                          AND scraped_at::date - posted_at > $5) AS recent_late
     FROM job_postings
     WHERE duplicate_of IS NULL
       AND posted_at >= $1 AND posted_at <= $4
       AND category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'`,
    [earlierFrom, earlierTo, recentFrom, recentTo, LATE_RECORD_DAYS]
  )

  const earlierTotal = Number(repairRow.earlier_total)
  const recentTotal = Number(repairRow.recent_total)
  const earlierLate = Number(repairRow.earlier_late)
  const recentLate = Number(repairRow.recent_late)
  const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)

  const repair = {
    late_after_days: LATE_RECORD_DAYS,
    earlier_total: earlierTotal,
    earlier_late: earlierLate,
    earlier_late_share: pctOf(earlierLate, earlierTotal),
    recent_total: recentTotal,
    recent_late: recentLate,
    recent_late_share: pctOf(recentLate, recentTotal),
    // The headline both ways, so the panel can show what the artifact is worth
    // instead of asking the reader to take "small" on trust.
    delta_all: recentTotal - earlierTotal,
    delta_excluding_late: recentTotal - recentLate - (earlierTotal - earlierLate),
  }

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
      missing_days: missingDays,
      repair,
      rising_count: rising,
      sector_count: sectors.length,
      // The tell: if nearly every sector moves the same way, the cause is the
      // collection window, not the labour market.
      one_directional: sectors.length > 0 && (rising <= 2 || rising >= sectors.length - 2),
    },
    sectors,
  })
}
