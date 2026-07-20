"use client"

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E6F1" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" width={30} />
          <Tooltip
            formatter={(value) => [`${value} posting${value === 1 ? "" : "s"}`, "Postings"]}
            labelFormatter={(label) => `Week of ${label}`}
            contentStyle={{ borderRadius: 8, border: "1px solid #E7E6F1", fontSize: 12 }}
            cursor={{ fill: "#EEEDF9" }}
          />
          <Bar dataKey="count" fill="#534AB7" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}