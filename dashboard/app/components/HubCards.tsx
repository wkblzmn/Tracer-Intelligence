interface Sector { sector: string; count: number; share: number }
interface Hub { hub: string; total: number; sectors: Sector[] }

export default function HubCards({ hubs }: { hubs: Hub[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {hubs.map((h) => {
        const max = h.sectors[0]?.count ?? 1
        return (
          <div key={h.hub} className="rounded-xl border border-line p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-ink">{h.hub}</span>
              <span className="nums text-xs text-muted">{h.total.toLocaleString()} live</span>
            </div>
            <div className="mt-3 space-y-2">
              {h.sectors.map((s) => (
                <div key={s.sector} className="flex items-center gap-2">
                  <span className="w-40 truncate text-[13px] text-ink" title={s.sector}>{s.sector}</span>
                  <div className="flex-1 h-2 rounded bg-line overflow-hidden">
                    <div className="h-2 rounded" style={{ width: `${(s.count / max) * 100}%`, backgroundColor: "#C2683C" }} />
                  </div>
                  <span className="nums w-12 text-right text-[11px] text-muted">{s.share}%</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}