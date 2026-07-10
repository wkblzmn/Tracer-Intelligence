import JobsChart from "./components/JobsChart"
import MetricCard from "./components/MetricCard"

const API = process.env.NEXT_PUBLIC_API_URL

interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
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

export default async function HomePage() {
  const [jobs, companies, overview, metrics] = await Promise.all([
    getRecentJobs(),
    getTrendingCompanies(),
    getOverview(),
    getMetrics(),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Tracer Intelligence</h1>
      <p className="text-gray-500 mb-8">Bangladesh Labor Market Intelligence</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard label="Active Postings" value={metrics.active_postings} />
        <MetricCard label="Postings (60 days)" value={metrics.new_this_week} />
        <MetricCard label="Companies Hiring" value={metrics.companies_hiring} />
        <MetricCard label="Total Companies" value={metrics.total_companies} />
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Hiring Activity</h2>
        <p className="text-sm text-gray-400 mb-4">Jobs posted per day (last 60 days)</p>
        <JobsChart data={overview} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Postings</h2>
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <a
                key={i}
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
              >
                <div className="font-medium">{job.title}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {job.company} · {job.location ?? "Bangladesh"} · {job.posted_at}
                </div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Trending Companies</h2>
          <div className="space-y-2">
            {companies.map((c, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <a
                  href={`/companies/${encodeURIComponent(c.company)}`}
                  className="text-sm font-medium hover:text-blue-600"
                >
                  {c.company}
                </a>
                <span className="text-sm text-blue-600 font-bold">{c.job_count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}