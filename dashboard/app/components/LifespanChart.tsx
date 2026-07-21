"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import ChartTooltip from "./ChartTooltip"
import { SOURCE_COLORS, AXIS_TICK, AXIS_STROKE } from "@/lib/chartTheme"

interface Point {
  day: number
  bdjobs: number | null
  skilljobs: number | null
  shomvob: number | null
}

export default function LifespanChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
        <XAxis
          dataKey="day"
          tick={AXIS_TICK}
          stroke={AXIS_STROKE}
          label={{ value: "Days since posted", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6C6C7E" }}
        />
        <YAxis
          tick={AXIS_TICK}
          stroke={AXIS_STROKE}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatLabel={(d) => `Day ${d}`}
              formatValue={(v) => (v == null || v === "" ? "n/a" : `${v}% still live`)}
            />
          }
        />
        <Legend />
        <ReferenceLine y={50} stroke="#B9B7CC" strokeDasharray="3 3" />
        <Line type="stepAfter" dataKey="bdjobs" name="Bdjobs" stroke={SOURCE_COLORS.bdjobs} dot={false} strokeWidth={2} connectNulls />
        <Line type="stepAfter" dataKey="skilljobs" name="Skill.jobs" stroke={SOURCE_COLORS.skilljobs} dot={false} strokeWidth={2} connectNulls />
        <Line type="stepAfter" dataKey="shomvob" name="Shomvob" stroke={SOURCE_COLORS.shomvob} dot={false} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
