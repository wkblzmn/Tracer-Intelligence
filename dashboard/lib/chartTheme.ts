// Single source of truth for chart colors. The teal replaced #2F8F87, which
// failed the palette chroma floor (read as gray next to indigo/terracotta);
// #0E9384 passes all six palette checks (CVD dE 10.4, contrast >= 3:1).
export const SOURCE_COLORS = {
  bdjobs: "#534AB7",
  skilljobs: "#0E9384",
  shomvob: "#C2683C",
} as const

// rgb triplets for rgba() composition (heatmap cells)
export const SOURCE_RGB = {
  bdjobs: "83,74,183",
  skilljobs: "14,147,132",
  shomvob: "194,104,60",
} as const

export const SOURCE_LABELS: Record<string, string> = {
  bdjobs: "Bdjobs",
  skilljobs: "Skill.jobs",
  shomvob: "Shomvob",
}

// axis + grid tokens shared by every Recharts chart
export const AXIS_TICK = { fontSize: 11, fill: "#6C6C7E" }
export const AXIS_STROKE = "#E7E6F1"
export const CURSOR_FILL = "#EEEDF9"
