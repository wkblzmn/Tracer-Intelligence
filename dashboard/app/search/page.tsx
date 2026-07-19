"use client"

import { useState, useEffect } from "react"

interface Job {
  title: string
  company: string
  location: string | null
  category: string | null
  salary_raw: string | null
  posted_at: string | null
  deadline: string | null
  source: string
  source_url: string
}

const CATEGORIES = [
  "Accounting/Finance", "Bank/Non-Bank Fin. Institution", "Supply Chain/Procurement",
  "Education/Training", "Engineer/Architect", "Garments/Textile",
  "General Management/Admin", "IT/Telecommunication", "Marketing/Sales",
  "Media/Advertisement/Event Mgt.", "Healthcare/Medical", "NGO/Development",
  "Research/Consultancy", "Receptionist/PS", "Data Entry/Operator/BPO",
  "Customer Service/Call Centre", "HR/Org. Development", "Design/Creative",
  "Production/Operation", "Hospitality/Travel/Tourism", "Beauty Care/Health & Fitness",
  "Law/Legal", "Electrician/Construction/Repair", "Security/Support Service",
  "Driving/Motor Technician", "Agro (Plant/Animal/Fisheries)", "Commercial",
  "Company Secretary/Regulatory affairs", "Pharmaceutical",
]

const SOURCES: { value: string; label: string }[] = [
  { value: "bdjobs", label: "Bdjobs" },
  { value: "skilljobs", label: "Skill.jobs" },
  { value: "shomvob", label: "Shomvob" },
]

const SOURCE_LABELS: Record<string, string> = {
  bdjobs: "Bdjobs",
  skilljobs: "Skill.jobs",
  shomvob: "Shomvob",
}

const DATE_PRESETS: { label: string; days: number | null }[] = [
  { label: "Any time", days: null },
  { label: "Past 7 days", days: 7 },
  { label: "Past 30 days", days: 30 },
  { label: "Past 60 days", days: 60 },
]

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

export default function SearchPage() {
  const [keyword, setKeyword] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("")
  const [source, setSource] = useState("")
  const [datePreset, setDatePreset] = useState<number | null>(null)
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const hasAnyFilter =
    keyword.trim() || location.trim() || category || source || datePreset || salaryMin || salaryMax

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!hasAnyFilter) {
        setJobs([])
        setTotal(0)
        return
      }
      setLoading(true)

      const params = new URLSearchParams()
      if (keyword.trim()) params.set("keyword", keyword.trim())
      if (location.trim()) params.set("location", location.trim())
      if (category) params.set("category", category)
      if (source) params.set("source", source)
      if (datePreset) {
        const from = new Date()
        from.setDate(from.getDate() - datePreset)
        params.set("dateFrom", from.toISOString().slice(0, 10))
      }
      if (salaryMin) params.set("salaryMin", salaryMin)
      if (salaryMax) params.set("salaryMax", salaryMax)

      const res = await fetch(`/api/jobs/search?${params.toString()}`)
      const data = await res.json()
      setJobs(data.jobs)
      setTotal(data.total)
      setLoading(false)
    }, 400)

    return () => clearTimeout(timeout)
  }, [keyword, location, category, source, datePreset, salaryMin, salaryMax, hasAnyFilter])

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Search Jobs</h1>
      <p className="text-gray-500 mb-6">Search by title, skill, or company — or browse with filters alone</p>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="e.g. marketing, BRAC, software..."
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-400"
      />

      <div className="grid grid-cols-3 gap-3 mt-3">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Dhaka, Gazipur)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">All sites</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setDatePreset(p.days)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              datePreset === p.days
                ? "bg-blue-500 text-white border-blue-500"
                : "border-gray-300 text-gray-600 hover:border-blue-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <input
          type="number"
          value={salaryMin}
          onChange={(e) => setSalaryMin(e.target.value)}
          placeholder="Min salary (BDT)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <input
          type="number"
          value={salaryMax}
          onChange={(e) => setSalaryMax(e.target.value)}
          placeholder="Max salary (BDT)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {loading && <p className="text-gray-400 mt-4">Searching...</p>}

      {!loading && hasAnyFilter && jobs.length === 0 && (
        <p className="text-gray-400 mt-4">No results found</p>
      )}

      {!loading && hasAnyFilter && total > 0 && (
        <p className="text-gray-500 mt-4 text-sm">
          {total} result{total === 1 ? "" : "s"}
        </p>
      )}

      <div className="space-y-3 mt-6">
        {jobs.map((job) => (
          <a
            key={job.source_url}
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{job.title}</div>
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {SOURCE_LABELS[job.source] ?? job.source}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {job.company} · {job.location ?? "Bangladesh"}
              {job.category ? ` · ${job.category}` : ""} · {formatPostedDate(job.posted_at)}
              {formatDeadline(job.deadline)}
              {job.salary_raw ? (job.salary_raw === "--" ? " · Negotiable" : ` · ${job.salary_raw}`) : ""}
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}