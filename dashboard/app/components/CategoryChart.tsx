"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import ChartTooltip from "./ChartTooltip"
import { SOURCE_COLORS, AXIS_TICK, AXIS_STROKE, CURSOR_FILL } from "@/lib/chartTheme"

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
        <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
        <YAxis type="category" dataKey="category" tick={AXIS_TICK} stroke={AXIS_STROKE} width={220} />
        <Tooltip
          content={<ChartTooltip formatValue={(v) => `${Number(v).toLocaleString()} postings`} />}
          cursor={{ fill: CURSOR_FILL }}
        />
        <Bar dataKey="this_period" name="Last 30 days" fill={SOURCE_COLORS.bdjobs} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
