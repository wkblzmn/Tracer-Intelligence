"use client"

import {
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export type OpportunityCategory = {
  category: string
  postings: number
  employers: number
  disclosed: number
  share: number
  disclosure_rate: number
  median_pay: number | null
}

export type OpportunityPayload = {
  total_postings: number
  categories: OpportunityCategory[]
}

type Props = { opportunity: OpportunityPayload | null }

const fmt = (n: number) => n.toLocaleString("en-US")

// One dot carries four encodings — x, y, size, shade. That is a lot to ask of
// someone who has never read a scatter plot, so the chart gets a whole panel
// and the left column does nothing but teach it, one encoding at a time,
// before the reader is asked to interpret anything.
function KeyRow({
  swatch,
  label,
}: {
  swatch: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-4 w-10 shrink-0 items-center justify-center">
        {swatch}
      </span>
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </div>
  )
}

export default function SeekersPayPanel({ opportunity }: Props) {
  const cats = opportunity?.categories ?? []
  const plotted = cats.filter((c) => c.median_pay !== null)

  const points = plotted.map((c) => ({
    x: c.postings,
    y: c.median_pay as number,
    z: c.employers,
    category: c.category,
    disclosure: c.disclosure_rate,
  }))

  return (
    <div className="flex h-full w-full flex-col pt-24">
      <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line">
        {/* ---- column 1: how to read the thing next to it ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
            For job seekers
          </p>
          {/* Type scale is deliberately modest: this column has to survive a
              768px-tall laptop, where the key labels wrap to three lines. */}
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-tight text-ink 2xl:text-4xl">
            The fields with the most jobs are rarely the best paid.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            Every dot is one kind of work — nursing, sales, garment production.
            Its position tells you two things at once.
          </p>

          <div className="mt-4 space-y-2.5 border-t border-line pt-4">
            <KeyRow
              swatch={
                <svg width="40" height="10" aria-hidden="true">
                  <line x1="0" y1="5" x2="31" y2="5" stroke="#C9C6E4" strokeWidth="1.5" />
                  <path d="M31 1 L38 5 L31 9 Z" fill="#C9C6E4" />
                </svg>
              }
              label="Further right — more jobs advertised."
            />
            <KeyRow
              swatch={
                <svg width="12" height="26" aria-hidden="true">
                  <line x1="6" y1="26" x2="6" y2="7" stroke="#C9C6E4" strokeWidth="1.5" />
                  <path d="M2 7 L6 0 L10 7 Z" fill="#C9C6E4" />
                </svg>
              }
              label="Higher up — better typical pay."
            />
            <KeyRow
              swatch={
                <svg width="40" height="16" aria-hidden="true">
                  <circle cx="6" cy="8" r="3" fill="#9A93D6" />
                  <circle cx="19" cy="8" r="5" fill="#9A93D6" />
                  <circle cx="33" cy="8" r="7" fill="#9A93D6" />
                </svg>
              }
              label="Bigger dot — more separate employers, so more places to apply."
            />
            <KeyRow
              swatch={
                <svg width="40" height="12" aria-hidden="true">
                  <circle cx="7" cy="6" r="5" fill="rgba(83,74,183,0.22)" />
                  <circle cx="20" cy="6" r="5" fill="rgba(83,74,183,0.55)" />
                  <circle cx="33" cy="6" r="5" fill="rgba(83,74,183,0.9)" />
                </svg>
              }
              label="Darker dot — employers in that field more often say what they pay."
            />
          </div>

          <p className="mt-4 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            {plotted.length} of {cats.length} fields state pay often enough to
            place here. The rest are left off rather than guessed at.
          </p>
        </div>

        {/* ---- columns 2-3: the chart itself, given room ---- */}
        <div
          data-anim
          className="col-span-2 flex min-h-0 flex-col px-12 pb-10 pt-8 lg:px-14"
        >
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 24, bottom: 28, left: 12 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  scale="log"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 10, fill: "#6C6C7E" }}
                  stroke="#E7E6F1"
                  tickFormatter={fmt}
                  label={{
                    value: "jobs advertised  →",
                    position: "insideBottom",
                    offset: -16,
                    style: { fontSize: 11, fill: "#9A9AA8" },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tick={{ fontSize: 10, fill: "#6C6C7E" }}
                  stroke="#E7E6F1"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  label={{
                    value: "typical monthly pay  →",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "#9A9AA8" },
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 620]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#C9C6E4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded border border-line bg-surface px-3 py-2">
                        <p className="text-[13px] font-medium text-ink">
                          {d.category}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {fmt(d.x)} jobs open · typically ৳{fmt(d.y)} a month
                        </p>
                        <p className="text-xs text-muted">
                          {d.z} employers hiring · {d.disclosure}% say the pay
                        </p>
                      </div>
                    )
                  }}
                />
                <Scatter data={points}>
                  {points.map((p) => (
                    <Cell
                      key={p.category}
                      fill={`rgba(83, 74, 183, ${(0.2 + (p.disclosure / 100) * 0.7).toFixed(2)})`}
                      stroke="#534AB7"
                      strokeWidth={0.5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 shrink-0 text-xs text-muted">
            Hover any dot for that field&rsquo;s numbers.
          </p>
        </div>
      </div>
    </div>
  )
}
