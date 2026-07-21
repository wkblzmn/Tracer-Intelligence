import LifespanChart from "../components/LifespanChart"
import SkillCooccurrence from "../components/SkillCooccurrence"

export const dynamic = "force-dynamic"

const API = process.env.NEXT_PUBLIC_API_URL

async function getLifespan() {
  const res = await fetch(`${API}/api/stats/lifespan`, { next: { revalidate: 300 } })
  return res.json()
}
async function getCooc() {
  const res = await fetch(`${API}/api/stats/skill-cooccurrence`, { next: { revalidate: 300 } })
  return res.json()
}

export default async function InsightsPage() {
  const [life, cooc] = await Promise.all([getLifespan(), getCooc()])
  const m = life.medians ?? {}
  const c = life.counts ?? {}
  const rel = life.reliable ?? {}
  const shelf = (src: "bdjobs" | "skilljobs" | "shomvob") =>
    rel[src] === false ? "insufficient data" : `${m[src] ?? "n/a"}d`

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Insights</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Market signals</h1>
      <p className="mt-1 mb-8 max-w-2xl text-muted">
        Two derived signals from the accumulated postings: how long vacancies stay open,
        and which skills employers demand together.
      </p>

      {/* Posting lifespan */}
      <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Hiring friction</div>
        <h2 className="text-xl font-semibold text-ink">How long postings stay open</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Share of closed postings still live N days after posting, by source
        </p>
        <LifespanChart data={life.curves ?? []} />
        <p className="nums mt-4 text-[11px] leading-relaxed text-muted">
          FIG. 2 — Posting survival among closed vacancies. Median shelf life:
          Bdjobs {shelf("bdjobs")} (n={c.bdjobs ?? 0}), Skill.jobs {shelf("skilljobs")} (n={c.skilljobs ?? 0}),
          Shomvob {shelf("shomvob")} (n={c.shomvob ?? 0}). Short shelf life ~ scarce candidates or urgent hiring;
          long-lived postings ~ labour surplus or evergreen ads. A salary-free proxy for market tightness.
          Closed cohort only (descriptive, not a censored estimate). Sources whose closures cluster on a single
          date (usually a crawl gap, not real closures) are marked insufficient data rather than plotted.
        </p>
      </section>

      {/* Skill co-occurrence */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Skill bundles</div>
        <h2 className="text-xl font-semibold text-ink">Which skills are demanded together</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Shared postings between the top skills — darker = more often required as a pair
        </p>
        <SkillCooccurrence skills={cooc.skills ?? []} pairs={cooc.pairs ?? []} />
        <p className="nums mt-4 text-[11px] leading-relaxed text-muted">
          FIG. 3 — Skill co-occurrence across the top 18 skills (diagonal blank). Cell = postings requiring
          both skills. Reveals the bundles employers hire as a unit, so training and curricula can target
          combinations rather than single skills.
        </p>
      </section>
    </main>
  )
}