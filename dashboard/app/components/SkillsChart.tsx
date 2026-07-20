"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface SkillData {
  skill: string
  bdjobs: number
  skilljobs: number
  shomvob: number
  total: number
}

export default function SkillsChart({ data }: { data: SkillData[] }) {
  const top = [...data].slice(0, 20)

  return (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 50, left: 0, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" allowDecimals={false} />
        <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: "#6C6C7E" }} stroke="#E7E6F1" width={200} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #E7E6F1", fontSize: 12 }}
          cursor={{ fill: "#EEEDF9" }}
        />
        <Legend />
        <Bar dataKey="bdjobs" stackId="a" fill="#534AB7" name="Bdjobs" />
        <Bar dataKey="skilljobs" stackId="a" fill="#2F8F87" name="Skill.jobs" />
        <Bar dataKey="shomvob" stackId="a" fill="#C2683C" name="Shomvob" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}