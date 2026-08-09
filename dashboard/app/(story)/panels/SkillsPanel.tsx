"use client"

import { SOURCE_COLORS, SOURCE_LABELS } from "@/lib/chartTheme"

export type SkillRow = {
  skill: string
  bdjobs: number
  skilljobs: number
  shomvob: number
  total: number
}

export type SkillsPayload = {
  skills: SkillRow[]
  coverage: { source: string; active: number; with_skills: number; pct: number }[]
  total_active: number
  total_with_skills: number
  overall_pct: number
}

type Props = { skills: SkillsPayload | null }

const SOURCES = ["bdjobs", "shomvob", "skilljobs"] as const

// What each board actually carries, so "why is Sales all orange?" has an
// answer on the page rather than requiring you to know the sources.
const SOURCE_PLAIN: Record<string, string> = {
  bdjobs: "the largest board — mostly office and professional work",
  shomvob: "service, delivery and shop-floor work",
  skilljobs: "smaller, mostly IT and education",
}

export default function SkillsPanel({ skills }: Props) {
  const rows = (skills?.skills ?? []).slice(0, 10)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const cov = skills?.coverage ?? []
  const bySource = Object.fromEntries(cov.map((c) => [c.source, c]))
  const top = rows[0]

  return (
    <div className="flex min-h-screen w-full flex-col px-5 pb-10 pt-20 md:h-full md:min-h-0 md:px-10 md:pb-5 md:pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          Skills
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Which skills do employers ask for most often?
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-5">
        {/* GRAPH */}
        <div
          data-anim
          className="col-span-1 md:col-span-3 flex min-h-0 flex-col rounded-xl border border-line bg-surface p-5"
        >
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-ink">
              Number of job adverts naming each skill
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              {SOURCES.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 text-[11px] text-muted"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: SOURCE_COLORS[s] }}
                  />
                  {SOURCE_LABELS[s]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-2.5">
            {rows.map((r) => (
              <div key={r.skill} className="flex items-center gap-3">
                <span
                  className="w-20 md:w-32 shrink-0 truncate text-[12px] font-medium text-ink"
                  title={r.skill}
                >
                  {r.skill}
                </span>
                <div className="flex h-3.5 flex-1 overflow-hidden rounded-sm bg-[#ECEBF4]">
                  {SOURCES.map((s) =>
                    r[s] > 0 ? (
                      <div
                        key={s}
                        title={`${SOURCE_LABELS[s]}: ${r[s]} adverts`}
                        style={{
                          width: `${(r[s] / max) * 100}%`,
                          backgroundColor: SOURCE_COLORS[s],
                        }}
                      />
                    ) : null
                  )}
                </div>
                <span className="w-12 md:w-20 shrink-0 text-right font-mono text-[11px] text-ink">
                  {r.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* EXPLANATION */}
        <div
          data-anim
          className="col-span-1 md:col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-surface p-5"
        >
          <h3 className="shrink-0 text-base font-semibold text-ink">
            What you are looking at
          </h3>

          <div className="mt-2.5 space-y-2.5 text-xs leading-relaxed text-muted">
            <p>
              Each bar is one skill, and its length is how many live job adverts
              ask for it. The colours show which job board those adverts came
              from — the number on the right is the total.
            </p>

            {top && (
              <p>
                <span className="font-medium text-ink">Most asked for.</span>{" "}
                {top.skill} appears in {top.total.toLocaleString()} adverts,
                more than any other skill we can detect.
              </p>
            )}

            <p>
              <span className="font-medium text-ink">
                Why the colours differ so much.
              </span>{" "}
              The three boards carry different kinds of work. Bdjobs is{" "}
              {SOURCE_PLAIN.bdjobs}; Shomvob is {SOURCE_PLAIN.shomvob}. So a
              skill that looks small may simply belong to a board that carries
              fewer adverts.
            </p>

            <p>
              <span className="font-medium text-ink">
                What this does not tell you.
              </span>{" "}
              It is not which skills pay best, and not which are growing. It is
              only how often each one is named.
            </p>
          </div>

          <div className="mt-auto shrink-0 border-t border-line pt-3">
            <a
              href="/skills"
              target="_blank"
              rel="noopener"
              className="text-[12px] font-medium text-brand hover:underline"
            >
              See every skill and the full breakdown →
            </a>
          </div>
        </div>
      </div>

      {/* ---- caveat strip ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            This covers a small part of the market
          </h3>
          <p className="text-[12px] text-muted">
            Only {skills?.overall_pct ?? 0} in every 100 live adverts name a
            skill we can read. Here is exactly why.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 text-[12px] leading-relaxed text-muted md:grid-cols-3 md:gap-6">
          <div>
            <p className="font-medium text-ink">
              1. We match against a fixed word list
            </p>
            <p className="mt-0.5">
              For the two largest boards we scan the advert text for a set list
              of skills. Anything phrased differently, or not on the list, is
              invisible to us — so this shows the most common skills we can
              recognise, not every skill being asked for.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              2. Most adverts say nothing we can match
            </p>
            <p className="mt-0.5">
              {bySource.bdjobs
                ? `Only ${bySource.bdjobs.pct}% of live Bdjobs adverts (${bySource.bdjobs.with_skills.toLocaleString()} of ${bySource.bdjobs.active.toLocaleString()}) produce any skill at all, against ${bySource.shomvob?.pct ?? 0}% on Shomvob and ${bySource.skilljobs?.pct ?? 0}% on Skill.jobs, where employers tag skills themselves.`
                : "Coverage varies sharply between boards."}
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              3. So do not compare the boards
            </p>
            <p className="mt-0.5">
              Because detection works differently on each board, the colour mix
              in a bar reflects how well we read that board as much as what its
              employers want. Read each skill&rsquo;s total, not the split.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
