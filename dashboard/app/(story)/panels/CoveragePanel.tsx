"use client"

import { SOURCE_COLORS, SOURCE_LABELS } from "@/lib/chartTheme"
import type { MomentumPayload } from "./SwitchersPanel"

export type SourceKey = "bdjobs" | "shomvob" | "skilljobs"

export type SourceMatrixPayload = {
  sectors: {
    sector: string
    counts: Record<SourceKey, number>
    share: Record<SourceKey, number>
  }[]
  totals: Record<SourceKey, number>
}

type Props = {
  sourceMatrix: SourceMatrixPayload | null
  momentum: MomentumPayload | null
}

const ORDER: SourceKey[] = ["bdjobs", "shomvob", "skilljobs"]

// What each board is for, in plain terms. Without this the three names mean
// nothing and the reader cannot judge why the mix matters.
const ABOUT: Record<SourceKey, string> = {
  bdjobs: "the country's biggest job board — office and professional work",
  shomvob: "service, delivery and shop-floor work the other boards barely carry",
  skilljobs: "a smaller board, mostly IT and education",
}

const fmtDay = (iso?: string | null) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "—"

export default function CoveragePanel({ sourceMatrix, momentum }: Props) {
  const totals = sourceMatrix?.totals
  const sectors = sourceMatrix?.sectors ?? []
  const grand = totals ? ORDER.reduce((s, k) => s + (totals[k] ?? 0), 0) : 0
  const c = momentum?.caveats
  const w = momentum?.window

  // Three per board, not four: nine rows plus headings is what fits a
  // 720px-tall screen without cropping, and the point is what each board
  // specialises in, which the top three already make.
  const topFor = (src: SourceKey) =>
    [...sectors].sort((a, b) => b.share[src] - a.share[src]).slice(0, 3)

  return (
    <div className="flex h-full w-full flex-col px-10 pb-5 pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          Coverage &amp; Method
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Where these numbers come from
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-5 gap-4">
        {/* GRAPH */}
        <div
          data-anim
          className="col-span-3 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-3.5"
        >
          <div className="shrink-0">
            <h3 className="text-base font-semibold leading-tight text-ink">
              Three job boards, and the work each one carries
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              Bars are each board&rsquo;s own adverts, not a comparison between
              boards.
            </p>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-2.5">
            {ORDER.map((src) => (
              <div key={src}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: SOURCE_COLORS[src] }}
                    />
                    {SOURCE_LABELS[src]}
                  </p>
                  <p className="shrink-0 font-mono text-[11px] text-muted">
                    {(totals?.[src] ?? 0).toLocaleString()} live adverts
                  </p>
                </div>
                <p className="text-[10px] italic leading-tight text-muted">
                  {ABOUT[src]}
                </p>

                <div className="mt-1 space-y-1">
                  {topFor(src).map((s) => (
                    <div key={s.sector} className="flex items-center gap-2">
                      <span
                        className="w-40 shrink-0 truncate text-[11px] text-ink"
                        title={s.sector}
                      >
                        {s.sector}
                      </span>
                      <div className="h-2 flex-1 rounded-sm bg-[#ECEBF4]">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${Math.min(100, s.share[src] * 3)}%`,
                            backgroundColor: SOURCE_COLORS[src],
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right font-mono text-[10px] text-muted">
                        {s.share[src].toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXPLANATION */}
        <div
          data-anim
          className="col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <h3 className="shrink-0 text-base font-semibold text-ink">
            Why three boards, not one
          </h3>

          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              No single job board covers the Bangladeshi market. Each one serves
              a different part of it, so using one alone would quietly leave out
              whole kinds of work.
            </p>
            <p>
              <span className="font-medium text-ink">
                The clearest example.
              </span>{" "}
              Delivery, security and call-centre work is a large share of
              Shomvob&rsquo;s adverts and barely registers on the others. Read
              only Bdjobs and you would conclude that work hardly exists.
            </p>
            <p>
              <span className="font-medium text-ink">
                But the sizes are very uneven.
              </span>{" "}
              Bdjobs is {grand ? Math.round(((totals?.bdjobs ?? 0) / grand) * 100) : 0}% of
              everything we hold. So a figure covering &ldquo;the market&rdquo;
              is mostly describing Bdjobs, and the two smaller boards move
              totals very little.
            </p>
            <p>
              <span className="font-medium text-ink">
                Do not compare the bars across boards.
              </span>{" "}
              Each board&rsquo;s bars are shares of its own adverts. They show
              what a board specialises in, not which board has more of a job.
            </p>
          </div>

          <div className="mt-auto shrink-0 border-t border-line pt-2.5">
            <a
              href="/sources"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              See the full board-by-board breakdown →
            </a>
          </div>
        </div>
      </div>

      {/* ---- method strip ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            How this is collected, and what we will not do
          </h3>
          <p className="text-[12px] text-muted">
            Every figure on this site comes from adverts we read ourselves.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-6 text-[12px] leading-relaxed text-muted">
          <div>
            <p className="font-medium text-ink">We read the boards every day</p>
            <p className="mt-0.5">
              A posting is checked daily until it disappears, which is how we
              know when a job closed rather than relying on the employer. We
              have been collecting since {fmtDay(c?.first_crawl)}, and every day
              without a break since {fmtDay(w?.from)}.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              We keep adverts after they expire
            </p>
            <p className="mt-0.5">
              Job boards delete adverts once they close. We do not, which is
              what makes it possible to say anything about how the market
              changes over time — and why our record has a{" "}
              {c?.worst_gap_days ?? 0}-day hole in it that we cannot fill.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">We never fill in a gap</p>
            <p className="mt-0.5">
              No estimated salaries, no predicted trends, no averages standing
              in for missing numbers. If employers did not state something, we
              leave it out and tell you how many did. Where a measurement is too
              young to trust, the page says so.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
