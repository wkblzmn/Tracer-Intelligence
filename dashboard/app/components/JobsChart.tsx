"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DataPoint {
  date: string
  jobs: number
}

export default function JobsChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#6C6C7E" }}
          tickFormatter={(d) => d.slice(5)}
          stroke="#E7E6F1"
        />
        <YAxis tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" />
        <Tooltip
          formatter={(value) => [value, "Jobs"]}
          labelFormatter={(d) => `Date: ${d}`}
          contentStyle={{ borderRadius: 8, border: "1px solid #E7E6F1", fontSize: 12 }}
          cursor={{ fill: "#EEEDF9" }}
        />
        <Bar dataKey="jobs" fill="#534AB7" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}