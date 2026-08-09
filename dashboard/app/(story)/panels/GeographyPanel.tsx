"use client"

import PanelHeader from "./PanelHeader"

export type DistrictSpec = {
  district: string
  total: number
  sectors: { sector: string; count: number; lq: number }[]
}

export type Hub = {
  hub: string
  total: number
  sectors: { sector: string; count: number; share: number }[]
}

export type GeographyPayload = {
  map: { district: string; total: number }[]
  districts: DistrictSpec[]
  hubs: Hub[]
}

type Props = { geography: GeographyPayload | null }

const fmt = (n: number) => n.toLocaleString("en-US")

export default function GeographyPanel({ geography }: Props) {
  // Only districts that actually over-index on something — a card with no
  // standout sector is just "a smaller version of the national average".
  const districts = (geography?.districts ?? [])
    .filter((d) => d.sectors.length > 0)
    .slice(0, 8)

  const hubs = (geography?.hubs ?? []).slice(0, 4)

  return (
    <div className="flex min-h-screen w-full flex-col px-5 pb-10 pt-20 md:h-full md:min-h-0 md:px-16 md:pt-24 lg:px-24">
      <PanelHeader
        audience="Geography"
        question="Which districts specialise, and in what."
        note="Multiples are relative to a district's overall hiring — how much it over-indexes on a field versus the national norm. Dhaka sets the baseline and is excluded."
      />

      <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {/* ---- specialization grid: the lead ---- */}
        <div className="col-span-1 md:col-span-2 flex flex-col rounded-lg border border-line bg-surface p-5">
          <p className="text-sm font-medium text-ink">
            What each district over-indexes on
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Bars show how many times the national rate a district hires for a
            field. Longer = more concentrated in that work.
          </p>

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-x-8 gap-y-3 overflow-hidden md:grid-cols-2">
            {districts.map((d) => {
              const top = d.sectors[0]
              const maxLq = Math.max(...d.sectors.map((s) => s.lq), 1)
              return (
                <div key={d.district} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {d.district}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {fmt(d.total)} jobs
                    </span>
                  </div>
                  {/* the district's single strongest specialisation, named */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="w-20 md:w-28 shrink-0 truncate text-[11px] text-muted">
                      {top.sector}
                    </span>
                    <div className="h-1.5 flex-1 rounded-sm bg-[#ECEBF4]">
                      <div
                        className="h-full rounded-sm bg-brand"
                        style={{ width: `${(top.lq / maxLq) * 100}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right font-mono text-[11px] font-medium text-brand">
                      {top.lq}&times;
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ---- industrial hubs ---- */}
        <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
          <p className="text-sm font-medium text-ink">Industrial hubs</p>
          <p className="mt-1 text-[11px] text-muted">
            Clusters that concentrate a single kind of work.
          </p>

          <div className="mt-4 flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden">
            {hubs.map((h) => {
              const lead = h.sectors[0]
              return (
                <div
                  key={h.hub}
                  className="border-t border-line pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {h.hub}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {fmt(h.total)}
                    </span>
                  </div>
                  {lead && (
                    <p className="mt-0.5 text-[11px] text-muted">
                      {lead.share}% {lead.sector}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* New tab, like every other route out of the story: the reader
              keeps their place in the track while they dig into the detail. */}
          <a
            href="/geography"
            target="_blank"
            rel="noopener"
            className="mt-3 shrink-0 border-t border-line pt-3 text-[12px] font-medium text-brand hover:underline"
          >
            See all districts and hubs in detail →
          </a>
        </div>
      </div>
    </div>
  )
}