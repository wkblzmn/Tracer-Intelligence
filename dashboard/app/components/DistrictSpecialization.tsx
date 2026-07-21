interface Sector { sector: string; count: number; lq: number }
interface District { district: string; total: number; sectors: Sector[] }

export default function DistrictSpecialization({ districts }: { districts: District[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {districts.map((d) => (
        <div key={d.district} className="rounded-xl border border-line p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-ink">{d.district}</span>
            <span className="nums text-xs text-muted">{d.total.toLocaleString()} live</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {d.sectors.length === 0 && (
              <div className="text-xs text-muted">No sector over-indexes here</div>
            )}
            {d.sectors.map((s) => (
              <div key={s.sector} className="flex items-center gap-2 text-[13px]">
                <span className="flex-1 truncate text-ink" title={s.sector}>{s.sector}</span>
                <span className="nums rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand">
                  {s.lq.toFixed(1)}×
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}