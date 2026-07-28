"use client"

import { SECTOR_PLAIN } from "./sectorNames"

export type SalaryRow = {
  sector: string
  total: number
  disclosed: number
  p25: number
  p50: number
  p75: number
}

export type MarketSignalsPayload = {
  salary: SalaryRow[]
  confidential: {
    sector: string
    total: number
    confidential: number
    share: number
  }[]
}

type Props = { marketSignals: MarketSignalsPayload | null }

const tk = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)},${String(n % 1000).padStart(3, "0")}` : String(n)

export default function InsightsPanel({ marketSignals }: Props) {
  const rows = (marketSignals?.salary ?? []).slice(0, 8)
  const max = Math.max(1, ...rows.map((r) => r.p75))
  const top = rows[0]

  // Disclosure across everything shown — the single most important caveat,
  // and the one number that decides how much of this to believe.
  const totalAll = rows.reduce((s, r) => s + r.total, 0)
  const disclosedAll = rows.reduce((s, r) => s + r.disclosed, 0)
  const pct = totalAll ? Math.round((disclosedAll / totalAll) * 100) : 0
  const worst = [...rows].sort(
    (a, b) => a.disclosed / a.total - b.disclosed / b.total
  )[0]

  return (
    <div className="flex h-full w-full flex-col px-10 pb-5 pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          Insights
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          What does each kind of work actually pay?
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-5 gap-4">
        {/* GRAPH */}
        <div
          data-anim
          className="col-span-3 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-ink">
              Monthly pay advertised, in taka
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
              <span className="flex h-3 w-16 items-center">
                <span className="h-2.5 w-full rounded-sm bg-brand/30" />
                <span className="-ml-8 h-3.5 w-[2px] bg-brand-strong" />
              </span>
              <span>
                bar = the middle half of jobs · line = the middle wage
              </span>
            </div>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-2">
            {rows.map((r) => (
              <div key={r.sector} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <p
                    className="truncate text-[12px] font-medium leading-tight text-ink"
                    title={r.sector}
                  >
                    {r.sector}
                  </p>
                  {SECTOR_PLAIN[r.sector] && (
                    <p className="truncate text-[10px] italic leading-tight text-muted">
                      {SECTOR_PLAIN[r.sector]}
                    </p>
                  )}
                </div>

                <div className="relative h-2.5 flex-1 rounded bg-[#ECEBF4]">
                  <div
                    className="absolute h-2.5 rounded bg-brand/35"
                    style={{
                      left: `${(r.p25 / max) * 100}%`,
                      width: `${Math.max(1, ((r.p75 - r.p25) / max) * 100)}%`,
                    }}
                  />
                  <div
                    className="absolute top-[-3px] h-[16px] w-[2px] rounded bg-brand-strong"
                    style={{ left: `${(r.p50 / max) * 100}%` }}
                  />
                </div>

                <span className="w-24 shrink-0 text-right font-mono text-[11px] leading-none text-ink">
                  ৳{tk(r.p50)}
                </span>
                <span className="w-24 shrink-0 text-right text-[10px] leading-none text-muted">
                  {r.disclosed} of {r.total} said
                </span>
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
            What you are looking at
          </h3>

          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              Each row is one kind of work. The shaded bar covers the{" "}
              <span className="font-medium text-ink">middle half</span> of the
              jobs: a quarter of them pay less than the left edge, and a quarter
              pay more than the right. The vertical line is the middle wage —
              half the jobs pay more, half pay less.
            </p>

            {top && (
              <p>
                <span className="font-medium text-ink">Highest paid here.</span>{" "}
                {top.sector} — {SECTOR_PLAIN[top.sector] ?? "this work"} —
                advertises a middle wage of ৳{tk(top.p50)} a month, with most
                jobs between ৳{tk(top.p25)} and ৳{tk(top.p75)}.
              </p>
            )}

            <p>
              <span className="font-medium text-ink">
                A wide bar means the work varies.
              </span>{" "}
              Where the bar is long, the same job title covers very different
              jobs — a junior post and a senior one sit in the same row.
            </p>

            <p>
              <span className="font-medium text-ink">
                This is what was advertised.
              </span>{" "}
              It is what employers put in the advert, not what people are
              finally paid. Actual pay is settled in the interview.
            </p>
          </div>

          <div className="mt-auto shrink-0 border-t border-line pt-3">
            <a
              href="/insights"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              See the other market signals →
            </a>
          </div>
        </div>
      </div>

      {/* ---- caveat strip ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            Most employers never say what they pay
          </h3>
          <p className="text-[12px] text-muted">
            Only {pct} in every 100 adverts shown here state a wage at all.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-6 text-[12px] leading-relaxed text-muted">
          <div>
            <p className="font-medium text-ink">
              1. These figures come from a minority of adverts
            </p>
            <p className="mt-0.5">
              {disclosedAll.toLocaleString()} of {totalAll.toLocaleString()}{" "}
              adverts in these fields state a salary.
              {worst &&
                ` In ${worst.sector} it is only ${worst.disclosed} of ${worst.total}.`}{" "}
              Employers who publish pay may not be typical of those who do not.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              2. Advertised is not the same as paid
            </p>
            <p className="mt-0.5">
              Nothing here is adjusted, estimated or filled in. Where an
              employer gave a range we use its midpoint; where they gave
              nothing, the advert is simply left out rather than guessed at.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              3. Only fields with enough wages shown
            </p>
            <p className="mt-0.5">
              A field needs at least 15 adverts stating pay before it appears,
              so a handful of unusual salaries cannot create a figure. Fields
              below that are left off entirely.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
