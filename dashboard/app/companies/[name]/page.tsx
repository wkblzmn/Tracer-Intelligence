import CompanyHistoryChart from "@/app/components/CompanyHistoryChart"

const API = process.env.NEXT_PUBLIC_API_URL
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  source_url: string
  last_seen_at: string
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}
function isStillActive(lastSeenAt: string): boolean {
  return new Date(lastSeenAt).getTime() > Date.now() - THREE_DAYS_MS
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const companyName = decodeURIComponent(name)

  const res = await fetch(
    `${API}/api/companies/${encodeURIComponent(companyName)}/jobs`,
    { cache: "no-store" }
  )
  const jobs: Job[] = await res.json()

  const activeJobs = jobs.filter((job) => isStillActive(job.last_seen_at))

  const weekCounts = new Map<string, number>()
  for (const job of jobs) {
    if (!job.posted_at) continue
    const week = getWeekStart(job.posted_at)
    weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1)
  }
  const history = Array.from(weekCounts.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{companyName}</h1>
      <p className="text-gray-500 mb-8">{activeJobs.length} active postings</p>

      {history.length > 1 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Posting activity over time</h2>
          <CompanyHistoryChart data={history} />
        </div>
      )}

      <div className="space-y-3">
        {activeJobs.map((job, i) => (
          <a
            key={i}
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
          >
            <div className="font-medium">{job.title}</div>
            <div className="text-sm text-gray-500 mt-1">
              {job.location ?? "Bangladesh"} · {job.posted_at}
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}