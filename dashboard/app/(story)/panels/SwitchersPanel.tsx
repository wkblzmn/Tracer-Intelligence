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
  reason?: string
  min_clean_days?: number
  window?: {
    from: string
    to: string
    days: number
    earlier: { from: string; to: string }
    recent: { from: string; to: string }
    block_days: number
  }
  caveats?: {
    gap_tolerance_days: number
    gap_days: number
    gap_ended: string | null
    worst_gap_days: number
    worst_gap_from: string | null
    worst_gap_to: string | null
    first_crawl: string | null
    last_crawl: string | null
    total_crawl_days: number
    clean_days: number
    continuous_from: string | null
    // Days inside the window the collector missed — tolerated, but named.
    missing_days?: string[]
    // The asymmetry that actually threatens the comparison. See the endpoint.
    repair?: {
      late_after_days: number
      earlier_total: number
      earlier_late: number
      earlier_late_share: number
      recent_total: number
      recent_late: number
      recent_late_share: number
      delta_all: number
      delta_excluding_late: number
    }
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

const PanelHeading = () => (
  <header data-anim className="shrink-0 pb-3">
    <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
      For switchers
    </p>
    <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
      Which kinds of work are advertising more jobs than before?
    </h2>
  </header>
)

/**
 * Shown when the endpoint reports usable: false.
 *
 * Without this the panel rendered its normal layout against an absent window
 * and said "two 0-day stretches", "counted every job advert for 0 days",
 * "we stopped collecting for 0 days", "Between — and —", and drew a legend
 * above no bars. Every one of those was a placeholder presented as a finding,
 * on the one panel whose whole argument is that it will show its working
 * instead of pretending to be settled.
 */
function NotYetMeasurable({ momentum }: { momentum: MomentumPayload | null }) {
  const c = momentum?.caveats
  const need = momentum?.min_clean_days ?? 0
  const have = c?.clean_days ?? 0
  const short = Math.max(0, need - have)

  return (
    <div className="flex h-full w-full flex-col px-10 pb-5 pt-24 lg:px-14">
      <PanelHeading />

      <div className="grid min-h-0 flex-1 grid-cols-5 gap-4">
        <div
          data-anim
          className="col-span-3 flex min-h-0 flex-col justify-center rounded-xl border border-line bg-surface px-8 py-4"
        >
          <h3 className="text-base font-semibold text-ink">
            We cannot answer this honestly today
          </h3>
          <div className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-muted">
            <p>
              Comparing one stretch of days against another only means something
              if the collector ran on every day of both. Right now it has{" "}
              <span className="font-medium text-ink">
                {have} unbroken {have === 1 ? "day" : "days"}
              </span>{" "}
              on record, and this comparison needs {need}.
            </p>
            {c?.gap_ended && (
              <p>
                Daily collection last broke off and resumed on{" "}
                {fmtDay(c.gap_ended)}. The first day back is always set aside as
                well, because it carries the backlog that built up while nothing
                was running and would inflate whichever half it landed in.
              </p>
            )}
            <p>
              So the panel shows nothing rather than two stretches that are not
              comparable. It fills in on its own after{" "}
              {short === 1 ? "one more day" : `${short} more days`} of unbroken
              collection — there is nothing to switch on.
            </p>
          </div>
        </div>

        <div
          data-anim
          className="col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <h3 className="shrink-0 text-base font-semibold text-ink">
            What is still solid
          </h3>
          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              Only this comparison depends on unbroken days. Counts of what is
              open now, what it pays, and how long it stays open are each read
              from the adverts themselves and are unaffected.
            </p>
            {c?.first_crawl && (
              <p>
                We have been collecting since {fmtDay(c.first_crawl)}, across{" "}
                {c.total_crawl_days} days of records.
              </p>
            )}
            {c?.worst_gap_days ? (
              <p>
                <span className="font-medium text-ink">The hole we cannot fill.</span>{" "}
                Between {fmtDay(c.worst_gap_from)} and {fmtDay(c.worst_gap_to)}{" "}
                nothing was collected. Adverts that opened and closed inside
                those {c.worst_gap_days} days were never recorded, and no amount
                of later crawling brings them back.
              </p>
            ) : null}
          </div>
          <div className="mt-auto shrink-0 border-t border-line pt-3">
            <a
              href="/search"
              target="_blank"
              rel="noopener"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              Look up any job yourself →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SwitchersPanel({ momentum }: Props) {
  if (!momentum?.usable) return <NotYetMeasurable momentum={momentum} />

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

  // Built as data so the count in the heading cannot drift from the number of
  // reasons shown, and so a caveat that stops applying stops being printed.
  const missing = c?.missing_days ?? []
  const rep = c?.repair
  const caveats: { title: string; body: string }[] = []

  if (missing.length > 0) {
    caveats.push({
      title:
        missing.length === 1
          ? "One day is missing from this window"
          : `${missing.length} days are missing from this window`,
      // Every body here is kept short on purpose: this row is full-width below
      // the chart, so each extra line it takes is a line the bars lose, and at
      // 720px tall that crops them.
      body:
        `Our collector did not run on ${missing.map(fmtDay).join(", ")}; adverts ` +
        `that opened and closed ${
          missing.length === 1 ? "that day" : "those days"
        } were never recorded. We tolerate ${
          missing.length === 1 ? "one missing day" : "a few missing days"
        } rather than discard the month around ${
          missing.length === 1 ? "it" : "them"
        }.`,
    })
  } else if (c?.worst_gap_days) {
    caveats.push({
      title: `We stopped collecting for ${c.worst_gap_days} days`,
      body:
        `Between ${fmtDay(c.worst_gap_from)} and ${fmtDay(c.worst_gap_to)} our ` +
        `collector was not running. Jobs that appeared and closed in those days ` +
        `were never recorded, and cannot be recovered.`,
    })
  }

  if (rep) {
    caveats.push({
      title: "The second half was repaired; the first could not be",
      body:
        `A catch-up crawl only recovers adverts still open when it runs, so it ` +
        `topped up the second half — ${rep.recent_late_share}% recorded late ` +
        `against ${rep.earlier_late_share}% of the first. That flatters growth: ` +
        `excluding late records the change is ${rep.delta_excluding_late}, ` +
        `not ${rep.delta_all}.`,
    })
  }

  caveats.push({
    title: `${w?.days ?? 0} days is a very short time`,
    body:
      "One large company advertising twenty jobs at once can make a whole field " +
      "look like it is growing. Real trends need months, not weeks.",
  })
  caveats.push({
    title: "Fridays and Saturdays are quiet",
    body:
      "Far fewer jobs are posted at the weekend, so if one half of the count " +
      "holds more weekend days than the other, that alone shifts the result.",
  })

  return (
    <div className="flex h-full w-full flex-col px-10 pb-5 pt-24 lg:px-14">
      <PanelHeading />

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
              target="_blank"
              rel="noopener"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              Look up any job yourself →
            </a>
          </div>
        </div>
      </div>

      {/* ---- bottom: the caveats, full width ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            Please do not take this as fact yet
          </h3>
          <p className="text-[12px] text-muted">
            {caveats.length} honest reasons these numbers may be wrong — we
            would rather show you the working than pretend it is settled.
          </p>
        </div>

        <div
          className={`mt-2.5 grid gap-5 text-[11px] leading-snug text-muted ${
            caveats.length === 4 ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          {caveats.map((cv, i) => (
            <div key={cv.title}>
              <p className="font-medium text-ink">
                {i + 1}. {cv.title}
              </p>
              <p className="mt-0.5">{cv.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
