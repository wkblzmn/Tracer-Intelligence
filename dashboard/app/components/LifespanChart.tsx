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
          tick={{ fontSize: 11, fill: "#6C6C7E" }}
          stroke="#E7E6F1"
          label={{ value: "Days since posted", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6C6C7E" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6C6C7E" }}
          stroke="#E7E6F1"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, name) => [value == null ? "n/a" : `${value}% still live`, name]}
          labelFormatter={(d) => `Day ${d}`}
          contentStyle={{ borderRadius: 8, border: "1px solid #E7E6F1", fontSize: 12 }}
        />
        <Legend />
        <ReferenceLine y={50} stroke="#B9B7CC" strokeDasharray="3 3" />
        <Line type="stepAfter" dataKey="bdjobs" name="Bdjobs" stroke="#534AB7" dot={false} strokeWidth={2} connectNulls />
        <Line type="stepAfter" dataKey="skilljobs" name="Skill.jobs" stroke="#2F8F87" dot={false} strokeWidth={2} connectNulls />
        <Line type="stepAfter" dataKey="shomvob" name="Shomvob" stroke="#C2683C" dot={false} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}