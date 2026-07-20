"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface CategoryData {
  category: string
  this_period: number
  prev_period: number
  change: number | null
}

export default function CategoryChart({ data }: { data: CategoryData[] }) {
  // Absolute posting volume per sector (last 30 days). We intentionally do NOT
  // plot % change here — with only a few months of history, short-window change
  // reads as trend it can't support. Switch to change once history is deep enough.
  const sorted = [...data]
    .sort((a, b) => b.this_period - a.this_period)
    .slice(0, 10)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 50, left: 0, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" allowDecimals={false} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" width={220} />
        <Tooltip
          formatter={(value) => [`${value} postings`, "Last 30 days"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #E7E6F1", fontSize: 12 }}
          cursor={{ fill: "#EEEDF9" }}
        />
        <Bar dataKey="this_period" fill="#534AB7" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}