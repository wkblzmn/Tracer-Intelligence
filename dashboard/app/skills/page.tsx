import SkillsChart from "../components/SkillsChart"

const API = process.env.NEXT_PUBLIC_API_URL

interface SkillData {
  skill: string
  bdjobs: number
  skilljobs: number
  shomvob: number
  total: number
}

async function getSkills(): Promise<SkillData[]> {
  const res = await fetch(`${API}/api/stats/skills?limit=50`, { cache: "no-store" })
  return res.json()
}

export default async function SkillsPage() {
  const skills = await getSkills()
  const max = skills.length ? skills[0].total : 1

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Skills Explorer</h1>
      <p className="text-gray-500 mb-8">In-demand skills across Bangladesh job postings</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Top Skills by Demand</h2>
        <p className="text-sm text-gray-400 mb-4">Distinct postings mentioning each skill, by source</p>
        <SkillsChart data={skills} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">All Skills</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {skills.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
              <span className="text-sm font-medium flex-1">{s.skill}</span>
              <div className="flex items-center gap-2 w-40">
                <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden flex">
                  <div className="bg-indigo-600 h-2" style={{ width: `${(s.bdjobs / max) * 100}%` }} />
                  <div className="bg-emerald-500 h-2" style={{ width: `${(s.skilljobs / max) * 100}%` }} />
                  <div className="bg-amber-500 h-2" style={{ width: `${(s.shomvob / max) * 100}%` }} />
                </div>
                <span className="text-sm text-indigo-600 font-bold w-10 text-right">
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