import SkillsChart from "../components/SkillsChart"

const API = process.env.NEXT_PUBLIC_API_URL

interface SkillData {
  skill: string
  bdjobs: number
  skilljobs: number
  shomvob: number
  total: number
}

const SOURCES = [
  { key: "bdjobs", label: "Bdjobs", color: "#534AB7" },
  { key: "skilljobs", label: "Skill.jobs", color: "#2F8F87" },
  { key: "shomvob", label: "Shomvob", color: "#C2683C" },
] as const

async function getSkills(): Promise<SkillData[]> {
  const res = await fetch(`${API}/api/stats/skills?limit=50`, { cache: "no-store" })
  return res.json()
}

export default async function SkillsPage() {
  const skills = await getSkills()
  const max = skills.length ? skills[0].total : 1

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Skills</div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Skills Explorer</h1>
      <p className="mt-1 mb-8 text-muted">In-demand skills across Bangladesh job postings</p>

      <section className="mb-8 rounded-2xl border border-line bg-surface p-6">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand">Demand</div>
        <h2 className="text-xl font-semibold text-ink">Top skills by demand</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">Distinct postings mentioning each skill, by source</p>
        <SkillsChart data={skills} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ink">All skills</h2>
          <div className="flex gap-3">
            {SOURCES.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
          {skills.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="w-6 text-right text-xs tabular-nums text-muted">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium text-ink">{s.skill}</span>
              <div className="flex items-center gap-2 w-40">
                <div className="flex-1 bg-line rounded h-2 overflow-hidden flex">
                  <div className="h-2" style={{ width: `${(s.bdjobs / max) * 100}%`, backgroundColor: "#534AB7" }} />
                  <div className="h-2" style={{ width: `${(s.skilljobs / max) * 100}%`, backgroundColor: "#2F8F87" }} />
                  <div className="h-2" style={{ width: `${(s.shomvob / max) * 100}%`, backgroundColor: "#C2683C" }} />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-brand">
                  {s.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}