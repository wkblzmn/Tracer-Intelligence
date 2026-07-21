"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import ChartTooltip from "./ChartTooltip"
import { SOURCE_COLORS, AXIS_TICK, AXIS_STROKE, CURSOR_FILL } from "@/lib/chartTheme"

interface DataPoint {
  date: string
  jobs: number
}

export default function JobsChart({ data }: { data: DataPoint[] }) {
  // 7-day rolling average — the BD Sun–Thu workweek makes raw dailies a comb;
  // the trend line is the readable signal, bars stay as texture underneath.
  const withAvg = data.map((d, i) => {
    const win = data.slice(Math.max(0, i - 6), i + 1)
    return { ...d, avg7: Math.round((win.reduce((a, p) => a + p.jobs, 0) / win.length) * 10) / 10 }
  })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={withAvg} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickFormatter={(d) => d.slice(5)}
          stroke={AXIS_STROKE}
        />
        <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} />
        <Tooltip
          content={<ChartTooltip formatLabel={(l) => `Date: ${l}`} />}
          cursor={{ fill: CURSOR_FILL }}
        />
        <Bar dataKey="jobs" name="Daily" fill={SOURCE_COLORS.bdjobs} fillOpacity={0.28} radius={[3, 3, 0, 0]} />
        <Line
          dataKey="avg7"
          name="7-day avg"
          stroke={SOURCE_COLORS.bdjobs}
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
