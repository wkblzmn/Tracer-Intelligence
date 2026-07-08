interface MetricCardProps {
  label: string
  value: number | string
  sub?: string
}

export default function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {label}
      </div>
      <div className="text-4xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && (
        <div className="text-sm text-gray-400 mt-1">{sub}</div>
      )}
    </div>
  )
}