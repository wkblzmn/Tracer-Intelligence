const API = process.env.NEXT_PUBLIC_API_URL

interface Job {
  title: string
  company: string
  location: string | null
  posted_at: string | null
  source_url: string
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const companyName = decodeURIComponent(name)

  const res = await fetch(
    `${API}/companies/${encodeURIComponent(companyName)}/jobs`,
    { cache: "no-store" }
  )
  const jobs: Job[] = await res.json()

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{companyName}</h1>
      <p className="text-gray-500 mb-8">{jobs.length} active postings</p>

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
              {job.location ?? "Bangladesh"} · {job.posted_at}
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}