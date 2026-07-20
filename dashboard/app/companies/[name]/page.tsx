import CompanyHistoryChart from "@/app/components/CompanyHistoryChart"
const API = process.env.NEXT_PUBLIC_API_URL
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  deadline: string | null
  source: string
  source_url: string
  last_seen_at: string
}

const SOURCE_LABELS: Record<string, string> = {
  bdjobs: "Bdjobs",
  skilljobs: "Skill.jobs",
  shomvob: "Shomvob",
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
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Company</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{companyName}</h1>
      <p className="mt-1 mb-8 text-muted">
        <span className="font-semibold text-ink tabular-nums">{activeJobs.length}</span> active posting{activeJobs.length === 1 ? "" : "s"}
      </p>
      {history.length > 1 && (
        <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Activity</div>
          <h2 className="mb-4 text-xl font-semibold text-ink">Posting activity over time</h2>
          <CompanyHistoryChart data={history} />
        </section>
      )}
      <div className="space-y-3">
        {activeJobs.map((job, i) => (
          <a
            key={i}
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-ink">{job.title}</div>
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                {SOURCE_LABELS[job.source] ?? job.source}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted">
              {job.location ?? "Bangladesh"} · {formatPostedDate(job.posted_at)}
              {formatDeadline(job.deadline)}
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}