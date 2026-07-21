interface Row {
  sector: string
  total: number
  disclosed: number
  p25: number
  p50: number
  p75: number
}

const fmtK = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))

// Advertised-pay bands per sector: p25–p75 bar with a median tick, all on one
// shared scale so sectors compare visually. Plain server-rendered divs.
export default function SalaryBySector({ rows }: { rows: Row[] }) {
  const xMax = Math.max(...rows.map((r) => r.p75), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const left = (r.p25 / xMax) * 100
        const width = Math.max(((r.p75 - r.p25) / xMax) * 100, 1)
        const mid = (r.p50 / xMax) * 100
        const disclosure = Math.round((r.disclosed / r.total) * 100)
        return (
          <div key={r.sector} className="flex items-center gap-3">
            <span className="w-56 shrink-0 truncate text-[13px] text-ink" title={r.sector}>
              {r.sector}
            </span>
            <div className="relative h-2.5 flex-1 rounded bg-line/60">
              <div
                className="absolute h-2.5 rounded bg-brand/35"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
              <div
                className="absolute top-[-2px] h-[14px] w-[2px] rounded bg-brand-strong"
                style={{ left: `${mid}%` }}
                title={`median Tk ${r.p50.toLocaleString()}`}
              />
            </div>
            <span className="nums w-32 shrink-0 text-right text-xs text-ink">
              ৳{fmtK(r.p25)}–{fmtK(r.p75)} <span className="font-semibold">· {fmtK(r.p50)}</span>
            </span>
            <span className="nums w-24 shrink-0 text-right text-[11px] text-muted">
              {disclosure}% of {r.total}
            </span>
          </div>
        )
      })}
    </div>
  )
}
