import { SOURCE_RGB } from "@/lib/chartTheme"

interface SectorRow {
  sector: string
  counts: { bdjobs: number; skilljobs: number; shomvob: number }
  share: { bdjobs: number; skilljobs: number; shomvob: number }
}

interface Props {
  sectors: SectorRow[]
  totals: { bdjobs: number; skilljobs: number; shomvob: number }
}

const SOURCES = [
  { key: "bdjobs", label: "Bdjobs", rgb: SOURCE_RGB.bdjobs },
  { key: "skilljobs", label: "Skill.jobs", rgb: SOURCE_RGB.skilljobs },
  { key: "shomvob", label: "Shomvob", rgb: SOURCE_RGB.shomvob },
] as const

type SourceKey = (typeof SOURCES)[number]["key"]

export default function SourceMatrix({ sectors, totals }: Props) {
  // Per-column max share — color intensity is scaled within each source so a
  // source's strongest sector saturates and the rest scale down. This is what
  // makes the columns individually readable despite Bdjobs's 10x volume.
  const maxShare: Record<SourceKey, number> = {
    bdjobs: Math.max(...sectors.map((s) => s.share.bdjobs), 0.0001),
    skilljobs: Math.max(...sectors.map((s) => s.share.skilljobs), 0.0001),
    shomvob: Math.max(...sectors.map((s) => s.share.shomvob), 0.0001),
  }

  function cellStyle(rgb: string, share: number, colMax: number): React.CSSProperties {
    if (share <= 0) return { backgroundColor: "transparent", color: "transparent" }
    const intensity = Math.sqrt(share / colMax) // perceptual: lift the low end
    const alpha = 0.12 + intensity * 0.83
    return {
      backgroundColor: `rgba(${rgb},${alpha})`,
      color: intensity > 0.55 ? "#FFFFFF" : "#17172A",
      fontFamily: "var(--font-mono), monospace",
    }
  }

  return (
    <div className="overflow-auto max-h-[72vh] rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface">
            <th className="sticky left-0 z-20 bg-surface border-b border-r border-line px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Sector
            </th>
            {SOURCES.map((s) => (
              <th key={s.key} className="border-b border-line px-2 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${s.rgb})` }} />
                  <span className="text-xs font-semibold text-ink">{s.label}</span>
                </div>
                <div className="nums mt-0.5 text-[10px] text-muted">
                  {totals[s.key].toLocaleString()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.map((row) => (
            <tr key={row.sector} className="group">
              <td className="sticky left-0 z-10 bg-surface group-hover:bg-brand-soft border-b border-r border-line px-3 py-0 max-w-60">
                <div className="truncate text-[13px] text-ink" title={row.sector}>{row.sector}</div>
              </td>
              {SOURCES.map((s) => {
                const count = row.counts[s.key]
                const share = row.share[s.key]
                return (
                  <td key={s.key} className="border-b border-line p-0">
                    <div
                      className="flex h-9 items-center justify-center text-[11px] tabular-nums"
                      style={cellStyle(s.rgb, share, maxShare[s.key])}
                      title={count > 0 ? `${row.sector} · ${s.label}: ${count} postings (${share.toFixed(1)}% of ${s.label})` : `${row.sector} · ${s.label}: none`}
                    >
                      {count > 0 ? count : ""}
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