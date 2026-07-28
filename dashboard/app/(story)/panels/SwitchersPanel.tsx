"use client"

import { SECTOR_PLAIN } from "./sectorNames"

export type MomentumSector = {
  sector: string
  earlier: number
  recent: number
  delta: number
  pct: number | null
}

export type MomentumPayload = {
  usable: boolean
  window?: {
    from: string
    to: string
    days: number
    earlier: { from: string; to: string }
    recent: { from: string; to: string }
    block_days: number
  }
  caveats?: {
    gap_days: number
    gap_ended: string | null
    worst_gap_days: number
    worst_gap_from: string | null
    worst_gap_to: string | null
    first_crawl: string | null
    total_crawl_days: number
    rising_count: number
    sector_count: number
    one_directional: boolean
  }
  sectors: MomentumSector[]
}

type Props = { momentum: MomentumPayload | null }

const fmtDay = (iso?: string | null) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "—"

const tenths = (pct: number) => Math.max(1, Math.round(Math.abs(pct) / 10))

function BarRow({
  s,
  scale,
  up,
}: {
  s: MomentumSector
  scale: number
  up: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-52 shrink-0">
        <p className="truncate text-[12px] font-medium text-ink" title={s.sector}>
          {s.sector}
        </p>
        {SECTOR_PLAIN[s.sector] && (
          <p className="truncate text-[10px] italic text-muted">
            {SECTOR_PLAIN[s.sector]}
          </p>
        )}
      </div>
      <div className="h-3 flex-1 rounded-sm bg-[#ECEBF4]">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${Math.max(5, (Math.abs(s.pct ?? 0) / scale) * 100)}%`,
            backgroundColor: up ? "rgba(83,74,183,0.9)" : "rgba(194,104,60,0.85)",
          }}
        />
      </div>
      <span className="w-32 shrink-0 text-right font-mono text-[11px] text-ink">
        {s.earlier} then {s.recent}
      </span>
    </div>
  )
}

export default function SwitchersPanel({ momentum }: Props) {
  const sectors = momentum?.sectors ?? []
  const w = momentum?.window
  const c = momentum?.caveats
  const days = w?.block_days ?? 0

  const risers = sectors
    .filter((s) => (s.pct ?? 0) > 0)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    .slice(0, 3)
  const fallers = sectors
    .filter((s) => (s.pct ?? 0) < 0)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    .slice(0, 3)

  const scale = Math.max(
    10,
    ...[...risers, ...fallers].map((s) => Math.abs(s.pct ?? 0))
  )
  const topUp = risers[0]
  const topDown = fallers[0]

  return (
    <div className="flex h-full w-full flex-col px-10 pb-5 pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          For switchers
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Which kinds of work are advertising more jobs than before?
        </h2>
      </header>

      {/* ---- middle: graph on the left, explanation on the right ---- */}
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-4">
        {/* GRAPH */}
        <div
          data-anim
          className="col-span-3 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-ink">
              Job adverts counted over two {days}-day stretches
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              {fmtDay(w?.earlier.from)} – {fmtDay(w?.earlier.to)}, compared with{" "}
              {fmtDay(w?.recent.from)} – {fmtDay(w?.recent.to)}
            </p>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-brand" />
                Advertising MORE jobs than before
              </p>
              <div className="space-y-2">
                {risers.map((s) => (
                  <BarRow key={s.sector} s={s} scale={scale} up />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: "rgba(194,104,60,0.85)" }}
                />
                Advertising FEWER jobs than before
              </p>
              <div className="space-y-2">
                {fallers.map((s) => (
                  <BarRow key={s.sector} s={s} scale={scale} up={false} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* EXPLANATION */}
        <div
          data-anim
          className="col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <h3 className="shrink-0 text-base font-semibold text-ink">
            What you are looking at
          </h3>

          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              We counted every job advert for {days} days, then counted again
              for the next {days} days. The bars show which way each kind of
              work moved; the figures beside them are the real counts, first
              and second. A longer bar means a bigger change.
            </p>

            {topUp && (
              <p>
                <span className="font-medium text-ink">The biggest rise.</span>{" "}
                {topUp.sector} — {SECTOR_PLAIN[topUp.sector] ?? "this kind of work"} —
                went from {topUp.earlier} adverts to {topUp.recent}. That is{" "}
                {topUp.recent - topUp.earlier} more, or about{" "}
                {tenths(topUp.pct ?? 0)} in every 10 more than before.
              </p>
            )}

            {topDown && (
              <p>
                <span className="font-medium text-ink">The biggest fall.</span>{" "}
                {topDown.sector} — {SECTOR_PLAIN[topDown.sector] ?? "this kind of work"}{" "}
                — went from {topDown.earlier} adverts down to {topDown.recent}.
                That is {topDown.earlier - topDown.recent} fewer, or about{" "}
                {tenths(topDown.pct ?? 0)} in every 10 fewer.
              </p>
            )}

            <p>
              <span className="font-medium text-ink">
                What this does not tell you.
              </span>{" "}
              It is not the size of a field — a small field can grow while still
              having very few jobs. And it is not a prediction of what happens
              next.
            </p>
          </div>

          <div className="mt-auto shrink-0 border-t border-line pt-3">
            <a
              href="/search"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              Look up any job yourself →
            </a>
          </div>
        </div>
      </div>

      {/* ---- bottom: the caveat, full width ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            Please do not take this as fact yet
          </h3>
          <p className="text-[12px] text-muted">
            Three honest reasons these numbers may be wrong — we would rather
            show you the working than pretend it is settled.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-6 text-[12px] leading-relaxed text-muted">
          <div>
            <p className="font-medium text-ink">
              1. We stopped collecting for {c?.worst_gap_days ?? 0} days
            </p>
            <p className="mt-0.5">
              Between {fmtDay(c?.worst_gap_from)} and {fmtDay(c?.worst_gap_to)}{" "}
              our collector was not running. Jobs that appeared and closed in
              those days were never recorded, and cannot be recovered.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              2. {w?.days ?? 0} days is a very short time
            </p>
            <p className="mt-0.5">
              One large company advertising twenty jobs at once can make a whole
              field look like it is growing. Real trends need months, not weeks.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              3. Fridays and Saturdays are quiet
            </p>
            <p className="mt-0.5">
              Far fewer jobs are posted at the weekend, so if one half of the
              count holds more weekend days than the other, that alone shifts
              the result.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
