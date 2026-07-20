interface MetricCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}

export default function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div className={`rounded-2xl border bg-surface p-5 ${accent ? "border-brand/30" : "border-line"}`}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className={`nums text-[2.5rem] leading-none font-semibold ${accent ? "text-brand" : "text-ink"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="mt-1.5 text-sm text-muted">{sub}</div>}
    </div>
  )
}