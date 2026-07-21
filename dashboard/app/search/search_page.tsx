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

const DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria",
  "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla",
  "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
  "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari",
  "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon",
  "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali",
  "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati",
  "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
  "Tangail", "Thakurgaon",
]

const SOURCES = [
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

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"

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
  const [district, setDistrict] = useState("")
  const [category, setCategory] = useState("")
  const [source, setSource] = useState("")
  const [datePreset, setDatePreset] = useState<number | null>(null)
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const hasAnyFilter =
    keyword.trim() || location.trim() || district || category || source || datePreset || salaryMin || salaryMax

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
      if (district) params.set("district", district)
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
  }, [keyword, location, district, category, source, datePreset, salaryMin, salaryMax, hasAnyFilter])

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Search</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Search jobs</h1>
      <p className="mt-1 mb-6 text-muted">Search by title, skill, or company — or browse with filters alone</p>

      <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. marketing, BRAC, software..."
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputClass}>
            <option value="">All districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Area (e.g. Gulshan, Uttara)"
            className={inputClass}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
            <option value="">All sites</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDatePreset(p.days)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                datePreset === p.days
                  ? "bg-brand text-white border-brand"
                  : "border-line text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="Min salary (BDT)"
            className={inputClass}
          />
          <input
            type="number"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder="Max salary (BDT)"
            className={inputClass}
          />
        </div>
      </div>

      {loading && <p className="mt-5 text-muted">Searching...</p>}

      {!loading && hasAnyFilter && jobs.length === 0 && (
        <p className="mt-5 text-muted">No results found. Try broadening a filter.</p>
      )}

      {!loading && hasAnyFilter && total > 0 && (
        <p className="mt-5 text-sm text-muted">
          <span className="nums font-semibold text-ink">{total.toLocaleString()}</span>{" "}
          result{total === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {jobs.map((job) => (
          <a
            key={job.source_url}
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