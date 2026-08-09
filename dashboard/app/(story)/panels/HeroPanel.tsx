"use client"

import BangladeshMap from "./BangladeshMap"
import type {
  DataPoint,
  CategoryData,
  TrendingCompany,
  Job,
} from "./OverviewSection"

// ---- Shared payload shapes ----------------------------------------------
// Declared here (and imported by page.tsx) so panels and the page agree,
// and so no `any` is needed anywhere.

export type MetricsPayload = Record<string, number>

/** One row of /api/stats/geography — field names vary slightly by endpoint. */
export type GeoRow = {
  district?: string
  name?: string
  total?: number
  count?: number
  postings?: number
}

/** /api/stats/geography returns { map: GeoRow[], districts: [...], hubs: [...] } */
export type GeographyPayload =
  | GeoRow[]
  | { map?: GeoRow[]; districts?: GeoRow[] }

/** Everything fetched up front, keyed by name rather than array index. */
export type SiteData = {
  metrics: MetricsPayload | null
  geography: GeographyPayload | null
  marketSignals: unknown
  lifespan: unknown
  skills: unknown
  opportunity: unknown
  applicationWindow: unknown
  topRoles: unknown
  momentum: unknown
  portability: unknown
  sourceMatrix: unknown
  // the Overview tail
  overview: DataPoint[] | null
  categories: CategoryData[] | null
  trending: TrendingCompany[] | null
  recentJobs: Job[] | null
}

type Props = {
  metrics: MetricsPayload | null
  geography: GeographyPayload | null
  // panels share one prop shape; Hero ignores the rest
  opportunity?: unknown
  applicationWindow?: unknown
  topRoles?: unknown
}

const PILLARS = [
  {
    title: "Three sources, one record",
    body: "Bdjobs, Skill.jobs and Shomvob — white-collar, tech, and the blue/silver-collar segment no single board covers.",
  },
  {
    title: "Observed, not self-reported",
    body: "Every posting is re-checked daily until it disappears, so shelf life and trends come from evidence.",
  },
  {
    title: "Honest figures",
    body: "Every chart states its coverage, and advertised pay is never imputed or estimated.",
  },
]

export default function HeroPanel({ metrics, geography }: Props) {
  const fmt = (n: number | null | undefined) =>
    n !== null && n !== undefined ? n.toLocaleString("en-US") : "—"

  const cards = [
    { label: "Active postings", value: metrics?.active_postings, lead: true },
    { label: "Postings (60d)", value: metrics?.postings_60d },
    { label: "Companies hiring", value: metrics?.companies_hiring },
    { label: "Total companies", value: metrics?.total_companies },
  ]

  // /api/stats/geography returns { map: [{ district, total }], ... }
  const rows: GeoRow[] = Array.isArray(geography)
    ? geography
    : geography?.map ?? geography?.districts ?? []

  const counts: Record<string, number> = {}
  for (const r of rows) {
    const name = r.district ?? r.name
    const n = Number(r.count ?? r.postings ?? r.total ?? 0)
    if (name && n) counts[name] = n
  }

  // Caption figures are derived, never hardcoded — they'd go stale daily.
  const mapped = Object.values(counts).reduce((a, b) => a + b, 0)
  const dhakaShare = mapped
    ? Math.round(((counts["Dhaka"] ?? 0) / mapped) * 100)
    : 0

  return (
    // Full-height columns, matching the rest of the story. Previously one wide
    // block plus a map, which sliced mid-scroll the way the seekers intro did.
    // pt-24 clears the fixed nav, which takes up no layout space.
    <div className="flex min-h-screen w-full flex-col pt-20 md:h-full md:min-h-0 md:pt-24">
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* ---- column 1: who we are and what this is ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Bangladesh labour market
          </p>

          <h1
            className="mt-4 text-5xl leading-[1.02] text-ink 2xl:text-6xl"
            style={{ fontFamily: "var(--font-wordmark), serif", fontWeight: 500 }}
          >
            Tracer
            <br />
            <span className="text-brand" style={{ fontWeight: 300 }}>
              Intelligence
            </span>
          </h1>

          <h2 className="mt-7 text-xl font-semibold leading-snug tracking-tight text-ink 2xl:text-2xl">
            See who&rsquo;s hiring and what the Bangladesh job market wants.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            A labour-market observatory for Bangladesh. It collects postings
            from the country&rsquo;s major job boards every day, keeps them
            after they expire, and turns the accumulated record into measurable
            signals.
          </p>

          <p className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted/70">
            Scroll to explore
            <span aria-hidden="true">→</span>
          </p>
        </div>

        {/* ---- column 2: how it works, and the headline numbers ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-6 px-12 pb-10 lg:px-14"
        >
          <div className="space-y-5">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-brand">
                  {p.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-line pt-6 md:grid-cols-2">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-lg border border-line bg-surface px-4 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  {c.label}
                </p>
                <p
                  className={`mt-1.5 font-mono text-2xl ${
                    c.lead ? "text-brand" : "text-ink"
                  }`}
                >
                  {fmt(c.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- column 3: the map. Caption is two-layer — finding, then method ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <div className="min-h-0 flex-1">
            <BangladeshMap counts={counts} />
          </div>

          <p className="mt-3 shrink-0 text-center text-sm text-ink">
            Dhaka accounts for {dhakaShare}% of mapped hiring
          </p>
          <p className="mx-auto mt-1 max-w-[20rem] shrink-0 text-center text-xs leading-relaxed text-muted/70">
            {fmt(mapped)} of {fmt(metrics?.active_postings)} postings map to a
            district — the rest are nationwide or overseas
          </p>
        </div>
      </div>
    </div>
  )
}
