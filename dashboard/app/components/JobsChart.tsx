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
          tick={{ fontSize: 11 }}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value) => [value, "Jobs"]}
          labelFormatter={(d) => `Date: ${d}`}
        />
        <Bar dataKey="jobs" fill="#3b82f6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}