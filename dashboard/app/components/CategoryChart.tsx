"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface CategoryData {
  category: string
  this_period: number
  prev_period: number
  change: number | null
}

export default function CategoryChart({ data }: { data: CategoryData[] }) {
  const sorted = [...data]
    .filter(d => d.change !== null)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
    .slice(0, 10)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis type='category' dataKey='category' tick={{ fontSize:11 }} width={220} />
        <Tooltip
          formatter={(value) => [`${value}%`, "Change vs prev 30d"]}
        />
        <Bar dataKey="change" radius={[0, 2, 2, 0]}>
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={(entry.change ?? 0) >= 0 ? "#4f46e5" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}