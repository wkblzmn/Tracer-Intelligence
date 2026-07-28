import SourceMatrix from "@/app/components/SourceMatrix"

export const dynamic = "force-dynamic"

const API = process.env.NEXT_PUBLIC_API_URL

async function getMatrix() {
  const res = await fetch(`${API}/api/stats/source-matrix`, { next: { revalidate: 300 } })
  return res.json()
}

export default async function SourcesPage() {
  const { sectors, totals } = await getMatrix()

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Coverage</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Sector coverage by source</h1>
      <p className="mt-1 mb-8 max-w-2xl text-muted">
        Which job board covers which part of the market. Cell shade = that sector&rsquo;s
        share of the source&rsquo;s active postings, normalized within each source so the
        columns are comparable despite very different volumes.
      </p>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Source × sector</div>
        <h2 className="mb-4 text-xl font-semibold text-ink">Where each source concentrates</h2>
        <SourceMatrix sectors={sectors} totals={totals} />
        <p className="nums mt-4 text-[11px] leading-relaxed text-muted">
          FIG. 1 — Sector share within each source (active postings). Shomvob concentrates in
          customer service, delivery, restaurant and garment-operator roles that barely register
          on the white-collar boards; Skill.jobs skews to IT and education; Bdjobs spreads broadest.
          The blue/silver-collar column is the coverage no single-source competitor can reproduce.
        </p>
      </section>
    </main>
  )
}