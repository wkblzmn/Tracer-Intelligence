interface Row {
  sector: string
  total: number
  confidential: number
  share: number
}

// Share of anonymous postings per sector — single-hue magnitude bars.
export default function ConfidentialIndex({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.share), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.sector} className="flex items-center gap-3">
          <span className="w-56 shrink-0 truncate text-[13px] text-ink" title={r.sector}>
            {r.sector}
          </span>
          <div className="h-2.5 flex-1 rounded bg-line/60 overflow-hidden">
            <div
              className="h-2.5 rounded bg-brand"
              style={{ width: `${(r.share / max) * 100}%` }}
            />
          </div>
          <span className="nums w-14 shrink-0 text-right text-xs font-semibold text-ink">
            {r.share}%
          </span>
          <span className="nums w-24 shrink-0 text-right text-[11px] text-muted">
            {r.confidential} of {r.total}
          </span>
        </div>
      ))}
    </div>
  )
}
