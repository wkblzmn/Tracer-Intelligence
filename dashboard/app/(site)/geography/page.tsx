import DistrictSpecialization from "@/app/components/DistrictSpecialization"
import HubCards from "@/app/components/HubCards"

export const dynamic = "force-dynamic"

const API = process.env.NEXT_PUBLIC_API_URL

async function getGeo() {
  const res = await fetch(`${API}/api/stats/geography`, { next: { revalidate: 300 } })
  return res.json()
}

export default async function GeographyPage() {
  const { districts, hubs } = await getGeo()

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Geography</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Where the market hires</h1>
      <p className="mt-1 mb-8 max-w-2xl text-muted">
        Hiring by place, two ways: what each official district specializes in, and the
        industrial clusters that cross district lines.
      </p>

      <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Specialization</div>
        <h2 className="text-xl font-semibold text-ink">What each district over-indexes on</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Location Quotient: how much more a sector concentrates here vs the national average (2.0× = twice the national share)
        </p>
        <DistrictSpecialization districts={districts ?? []} />
        <p className="nums mt-4 text-[11px] leading-relaxed text-muted">
          FIG. 4 — Sector specialization by district (top 12 by volume). LQ &gt; 1 means the sector is
          more concentrated here than nationally. Reveals local economic character the raw counts hide.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Industrial hubs</div>
        <h2 className="text-xl font-semibold text-ink">Economic clusters across district lines</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Analytical hubs (not official districts) — the manufacturing and corporate belts, analyzed as units
        </p>
        <HubCards hubs={hubs ?? []} />
        <p className="nums mt-4 text-[11px] leading-relaxed text-muted">
          FIG. 5 — Sector mix of the industrial clusters. Savar–Ashulia and Gazipur surface the garment /
          manufacturing concentration that folds invisibly into &ldquo;Dhaka&rdquo; on the official-district view.
        </p>
      </section>
    </main>
  )
}