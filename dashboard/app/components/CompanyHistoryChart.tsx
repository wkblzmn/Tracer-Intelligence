"use client"

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import ChartTooltip from "./ChartTooltip"
import { SOURCE_COLORS, AXIS_TICK, AXIS_STROKE, CURSOR_FILL } from "@/lib/chartTheme"

interface WeekPoint {
  week: string
  count: number
}

export default function CompanyHistoryChart({ data }: { data: WeekPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.week + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }))

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS_STROKE} />
          <XAxis dataKey="label" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} stroke={AXIS_STROKE} width={30} />
          <Tooltip
            content={
              <ChartTooltip
                formatLabel={(l) => `Week of ${l}`}
                formatValue={(v) => `${Number(v).toLocaleString()} posting${Number(v) === 1 ? "" : "s"}`}
              />
            }
            cursor={{ fill: CURSOR_FILL }}
          />
          <Bar dataKey="count" name="Postings" fill={SOURCE_COLORS.bdjobs} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
