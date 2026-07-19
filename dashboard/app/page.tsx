import JobsChart from "./components/JobsChart"
import MetricCard from "./components/MetricCard"
import CategoryChart from "./components/CategoryChart"

const API = process.env.NEXT_PUBLIC_API_URL

interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  deadline: string | null
  source_url: string
}

interface TrendingCompany {
  company: string
  job_count: number
}

interface DataPoint {
  date: string
  jobs: number
}

interface Metrics {
  active_postings: number
  new_this_week: number
  companies_hiring: number
  total_companies: number
}

interface CategoryData {
  category: string
  this_period: number
  prev_period: number
  change: number | null
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

async function getRecentJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/api/jobs/recent?limit=20`, { cache: "no-store" })
  return res.json()
}

async function getTrendingCompanies(): Promise<TrendingCompany[]> {
  const res = await fetch(`${API}/api/companies/trending?limit=10`, { cache: "no-store" })
  return res.json()
}

async function getOverview(): Promise<DataPoint[]> {
  const res = await fetch(`${API}/api/stats/overview`, { cache: "no-store" })
  return res.json()
}

async function getMetrics(): Promise<Metrics> {
  const res = await fetch(`${API}/api/stats/metrics`, { cache: "no-store" })
  return res.json()
}

async function getCategories(): Promise<CategoryData[]> {
  const res = await fetch(`${API}/api/stats/categories`, { cache: "no-store" })
  return res.json()
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">
      {children}
    </div>
  )
}

export default async function HomePage() {
  const [jobs, companies, overview, metrics, categories] = await Promise.all([
    getRecentJobs(),
    getTrendingCompanies(),
    getOverview(),
    getMetrics(),
    getCategories(),
  ])

  const asOf = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <section className="mb-12">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          Live · updated {asOf}
        </div>
        <h1 className="max-w-3xl text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight text-ink">
          See who&rsquo;s hiring and what the Bangladesh job market wants.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Live postings from Bdjobs, Skill.jobs and Shomvob &mdash; tracked every day and
          kept over time, so hiring trends, in-demand skills, and salary signals actually surface.
        </p>
      </section>

      {/* Metric readout */}
      <div className="mb-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Postings" value={metrics.active_postings} accent />
        <MetricCard label="Postings (60 days)" value={metrics.new_this_week} />
        <MetricCard label="Companies Hiring" value={metrics.companies_hiring} />
        <MetricCard label="Total Companies" value={metrics.total_companies} />
      </div>

      {/* Hiring activity */}
      <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
        <Eyebrow>Daily volume</Eyebrow>
        <h2 className="text-xl font-semibold text-ink">Hiring activity</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">Jobs posted per day, last 60 days</p>
        <JobsChart data={overview} />
      </section>

      {/* Momentum + Employers */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <Eyebrow>Sector momentum</Eyebrow>
          <h2 className="text-xl font-semibold text-ink">Category momentum</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted">Fastest-moving sectors vs previous 30 days</p>
          <CategoryChart data={categories} />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <Eyebrow>Most active employers</Eyebrow>
          <h2 className="text-xl font-semibold text-ink">Top hiring companies</h2>
          <p className="mb-4 mt-0.5 text-sm text-muted">Most live openings right now</p>
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
                <span className="text-sm font-semibold tabular-nums text-brand">
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
        <h2 className="mb-5 text-xl font-semibold text-ink">Recent postings</h2>
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
                {job.company} · {job.location ?? "Bangladesh"} · {formatPostedDate(job.posted_at)}
                {formatDeadline(job.deadline)}
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}