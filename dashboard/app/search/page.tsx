"use client"

import { useState, useEffect } from "react"



interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  source_url: string
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("")
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!keyword.trim()) {
        setJobs([])
        return
      }
      setLoading(true)
      const res = await fetch(
        `/api/jobs/search?keyword=${encodeURIComponent(keyword)}`
      )
      const data = await res.json()
      setJobs(data)
      setLoading(false)
    }, 400)

    return () => clearTimeout(timeout)
  }, [keyword])

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Search Jobs</h1>
      <p className="text-gray-500 mb-6">Search by title, skill, or company</p>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="e.g. marketing, BRAC, software..."
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-blue-400"
      />

      {loading && (
        <p className="text-gray-400 mt-4">Searching...</p>
      )}

      {!loading && jobs.length === 0 && keyword.trim() && (
        <p className="text-gray-400 mt-4">No results for &quot;{keyword}&quot;</p>
      )}

      <div className="space-y-3 mt-6">
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
    </main>
  )
}