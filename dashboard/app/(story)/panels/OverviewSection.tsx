"use client"

import JobsChart from "@/app/components/JobsChart"
import MetricCard from "@/app/components/MetricCard"
import CategoryChart from "@/app/components/CategoryChart"

// The tail of the story, not a separate page.
//
// The horizontal track is pinned for a fixed scroll distance; once it ends the
// pin releases and this scrolls up normally underneath it. Same route, same
// fixed nav — the reader just stops moving sideways and starts moving down.
// That is why this is a client component fed from the page's single fetch pass
// rather than the async server page it used to be.

export type Job = {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  deadline: string | null
  source_url: string
}

export type TrendingCompany = { company: string; job_count: number }
export type DataPoint = { date: string; jobs: number }
export type CategoryData = {
  category: string
  this_period: number
  prev_period: number
  change: number | null
}
export type MetricsPayload = Record<string, number>

type Props = {
  metrics: MetricsPayload | null
  overview: DataPoint[] | null
  categories: CategoryData[] | null
  trending: TrendingCompany[] | null
  recentJobs: Job[] | null
}

function formatPostedDate(dateStr: string | null): string {
  if (!dateStr) return "Date unknown"
  const d = new Date(dateStr + "T00:00:00Z")
  return `Posted ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00Z")
  return ` · Apply by ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">
      {children}
    </div>
  )
}

export default function OverviewSection({
  metrics,
  overview,
  categories,
  trending,
  recentJobs,
}: Props) {
  const jobs = recentJobs ?? []
  const companies = trending ?? []

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28">
      <section className="mb-10">
        <Eyebrow>Overview</Eyebrow>
        <h2 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink">
          The live record, in full.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Everything above is one reading of the data. This is the raw state of
          the market right now — what is open, who is hiring, and what was
          posted today.
        </p>
      </section>

      {/* Metric readout */}
      <div className="mb-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active Postings"
          value={metrics?.active_postings ?? 0}
          accent
        />
        <MetricCard label="Postings (60 days)" value={metrics?.postings_60d ?? 0} />
        <MetricCard label="Companies Hiring" value={metrics?.companies_hiring ?? 0} />
        <MetricCard label="Total Companies" value={metrics?.total_companies ?? 0} />
      </div>

      {/* Hiring activity */}
      <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
        <Eyebrow>Daily volume</Eyebrow>
        <h3 className="text-xl font-semibold text-ink">Hiring activity</h3>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Jobs posted per day, last 60 days
        </p>
        <JobsChart data={overview ?? []} />
      </section>

      {/* Momentum + Employers */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <Eyebrow>Current demand</Eyebrow>
          <h3 className="text-xl font-semibold text-ink">
            Current demand by sector
          </h3>
          <p className="mb-5 mt-0.5 text-sm text-muted">
            Postings per sector, last 30 days
          </p>
          <CategoryChart data={categories ?? []} />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <Eyebrow>Most active employers</Eyebrow>
          <h3 className="text-xl font-semibold text-ink">Top hiring companies</h3>
          <p className="mb-4 mt-0.5 text-sm text-muted">
            Most live openings right now
          </p>
          <div className="space-y-0.5">
            {companies.map((c, i) => (
              <a
                key={i}
                href={`/companies/${encodeURIComponent(c.company)}`}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-brand-soft"
              >
                <span className="w-6 text-right text-xs tabular-nums text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-ink group-hover:text-brand">
                  {c.company}
                </span>
                <span className="nums text-sm font-semibold text-brand">
                  {c.job_count}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Recent postings */}
      <section>
        <Eyebrow>Latest</Eyebrow>
        <h3 className="mb-5 text-xl font-semibold text-ink">Recent postings</h3>
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <a
              key={i}
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand"
            >
              <div className="font-medium text-ink">{job.title}</div>
              <div className="mt-1 text-sm text-muted">
                {job.company} · {job.location ?? "Bangladesh"} ·{" "}
                {formatPostedDate(job.posted_at)}
                {formatDeadline(job.deadline)}
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
