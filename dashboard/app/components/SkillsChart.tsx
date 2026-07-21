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
import ChartTooltip from "./ChartTooltip"
import { SOURCE_COLORS, AXIS_TICK, AXIS_STROKE, CURSOR_FILL } from "@/lib/chartTheme"

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
        <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
        <YAxis type="category" dataKey="skill" tick={AXIS_TICK} stroke={AXIS_STROKE} width={200} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
        <Legend />
        <Bar dataKey="bdjobs" stackId="a" fill={SOURCE_COLORS.bdjobs} name="Bdjobs" />
        <Bar dataKey="skilljobs" stackId="a" fill={SOURCE_COLORS.skilljobs} name="Skill.jobs" />
        <Bar dataKey="shomvob" stackId="a" fill={SOURCE_COLORS.shomvob} name="Shomvob" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
