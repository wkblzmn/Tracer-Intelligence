interface Skill { skill: string; count: number }
interface Pair { a: string; b: string; n: number }

export default function SkillCooccurrence({ skills, pairs }: { skills: Skill[]; pairs: Pair[] }) {
  const labels = skills.map((s) => s.skill)
  // lookup: co-occurrence count for an unordered pair
  const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`)
  const pairMap = new Map(pairs.map((p) => [key(p.a, p.b), p.n]))
  const maxPair = Math.max(1, ...pairs.map((p) => p.n))

  function cellStyle(a: string, b: string): React.CSSProperties {
    if (a === b) return { backgroundColor: "#F1F0F8", color: "#B9B7CC" } // diagonal
    const n = pairMap.get(key(a, b)) ?? 0
    if (n === 0) return { backgroundColor: "transparent", color: "transparent" }
    const intensity = Math.sqrt(n / maxPair)
    const alpha = 0.1 + intensity * 0.85
    return {
      backgroundColor: `rgba(83,74,183,${alpha})`,
      color: intensity > 0.55 ? "#FFFFFF" : "#17172A",
      fontFamily: "var(--font-mono), monospace",
    }
  }

  return (
    <div className="overflow-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface" />
            {labels.map((l) => (
              <th key={l} className="p-1 align-bottom">
                <div
                  className="mx-auto text-[10px] text-muted whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 96 }}
                  title={l}
                >
                  {l}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((row) => (
            <tr key={row}>
              <td className="sticky left-0 z-10 bg-surface border-r border-line pr-2 py-0 text-right text-[11px] text-ink whitespace-nowrap max-w-20 md:w-37.5">
                <div className="truncate" title={row}>{row}</div>
              </td>
              {labels.map((col) => {
                const n = row === col ? skills.find((s) => s.skill === row)?.count ?? 0 : pairMap.get(key(row, col)) ?? 0
                return (
                  <td key={col} className="border border-line p-0">
                    <div
                      className="flex h-7 w-9 items-center justify-center text-[10px] tabular-nums"
                      style={cellStyle(row, col)}
                      title={row === col ? `${row}: ${n} postings` : `${row} + ${col}: ${n} shared postings`}
                    >
                      {row === col ? "" : n > 0 ? n : ""}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}