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
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={200} />
        <Tooltip />
        <Legend />
        <Bar dataKey="bdjobs" stackId="a" fill="#4f46e5" name="Bdjobs" />
        <Bar dataKey="skilljobs" stackId="a" fill="#10b981" name="Skill.jobs" />
        <Bar dataKey="shomvob" stackId="a" fill="#f59e0b" name="Shomvob" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}