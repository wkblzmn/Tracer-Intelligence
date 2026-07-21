interface Entry {
  name?: string
  value?: number | string
  color?: string
  stroke?: string
  fill?: string
}

interface Props {
  active?: boolean
  payload?: Entry[]
  label?: string | number
  formatLabel?: (label: string | number) => string
  formatValue?: (value: number | string, name?: string) => string
}

// Shared tooltip for every Recharts chart — replaces the default gray box.
export default function ChartTooltip({ active, payload, label, formatLabel, formatValue }: Props) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-sm">
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-medium text-muted">
          {formatLabel ? formatLabel(label) : String(label)}
        </div>
      )}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: e.color ?? e.stroke ?? e.fill ?? "#6C6C7E" }}
          />
          <span className="text-muted">{e.name}</span>
          <span className="nums ml-auto pl-3 font-semibold text-ink">
            {formatValue
              ? formatValue(e.value ?? "", e.name)
              : typeof e.value === "number"
                ? e.value.toLocaleString()
                : e.value}
          </span>
        </div>
      ))}
    </div>
  )
}
