"use client"

// Which job titles are advertised across more than one sector — the switcher's
// structural question, and the one the momentum panel cannot answer.
//
// Built on /api/stats/portability, which was validated and then left unrendered
// when the switchers slot moved to sector momentum. Nothing here is derived
// from the skills extraction: title, sector and employer are all first-party
// fields off the advert, so this panel does not inherit the one part of the
// pipeline that has never been checked.
//
// The claim is deliberately narrow. The same title appearing in five sectors is
// evidence that employers in five different industries advertise that job — not
// that a person can walk between them. The right-hand card says so in those
// words, because the honest version of this panel is the only version worth
// showing.

import { SECTOR_PLAIN } from "./sectorNames"

export type PortabilityPayload = {
  total_roles: number
  single_sector_roles: number
  single_sector_share: number
  max_sectors: number
  distribution: {
    sectors: number
    roles: number
    examples: { role: string; sectors: string }[]
  }[]
  portable: {
    role: string
    sectors: number
    postings: number
    employers: number
    breakdown: { sector: string; postings: number }[]
  }[]
  locked: { role: string; postings: number; employers: number }[]
}

type Props = { portability: PortabilityPayload | null }

// Sector segments are shades of one colour rather than a categorical palette.
// The point of the bar is that it is ONE job split across places, so five
// unrelated hues would argue against the thing being shown.
const SHADES = [0.92, 0.72, 0.55, 0.4, 0.28]
const shade = (i: number) => `rgba(83,74,183,${SHADES[Math.min(i, SHADES.length - 1)]})`

const titleCase = (s: string) =>
  s.replace(/\b[a-z]/g, (ch) => ch.toUpperCase())

function PortableRow({
  r,
}: {
  r: PortabilityPayload["portable"][number]
}) {
  const total = r.breakdown.reduce((s, b) => s + b.postings, 0) || r.postings
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-[12px] font-medium text-ink" title={r.role}>
          {titleCase(r.role)}
        </p>
        <p className="shrink-0 font-mono text-[10px] text-muted">
          {r.sectors} sectors · {r.postings} ads · {r.employers} employers
        </p>
      </div>
      <div className="mt-0.5 flex h-3 w-full overflow-hidden rounded-sm bg-[#ECEBF4]">
        {r.breakdown.map((b, i) => (
          <div
            key={b.sector}
            style={{
              width: `${(b.postings / total) * 100}%`,
              backgroundColor: shade(i),
            }}
            title={`${b.sector}: ${b.postings} adverts`}
          />
        ))}
      </div>
      <p className="mt-0.5 truncate text-[10px] text-muted">
        {r.breakdown.map((b) => b.sector).join(" · ")}
      </p>
    </div>
  )
}

export default function SwitchersPortabilityPanel({ portability }: Props) {
  const p = portability
  // Four bars and three rows is what a 720px-tall screen fits without cropping,
  // the same constraint the coverage panel notes. Measured, not guessed: the
  // bars carry the argument, so they keep the space.
  const portable = (p?.portable ?? []).slice(0, 4)
  const locked = (p?.locked ?? []).slice(0, 3)
  const widest = p?.portable?.[0]

  return (
    <div className="flex min-h-screen w-full flex-col px-5 pb-10 pt-20 md:h-full md:min-h-0 md:px-10 md:pb-5 md:pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          For switchers
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          Some jobs travel between industries. Most do not.
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-5">
        {/* GRAPH */}
        <div
          data-anim
          className="col-span-1 md:col-span-3 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <div className="shrink-0">
            <h3 className="text-base font-semibold text-ink">
              The same job title, advertised across different industries
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              Each bar is one job title, split by the industries advertising it.
            </p>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-2.5">
            <div className="space-y-2">
              {portable.map((r) => (
                <PortableRow key={r.role} r={r} />
              ))}
            </div>

            <div className="border-t border-line pt-2">
              <p className="mb-1.5 text-[12px] font-semibold text-ink">
                And these appear in one industry only
              </p>
              <div className="space-y-0.5">
                {locked.map((r) => (
                  <div key={r.role} className="flex items-center gap-3">
                    <span
                      className="w-24 md:w-40 shrink-0 truncate text-[10px] text-ink"
                      title={r.role}
                    >
                      {titleCase(r.role)}
                    </span>
                    <div className="h-2 flex-1 rounded-sm bg-[#ECEBF4]">
                      <div
                        className="h-full w-full rounded-sm"
                        style={{ backgroundColor: "rgba(194,104,60,0.85)" }}
                      />
                    </div>
                    <span className="w-14 md:w-24 shrink-0 text-right font-mono text-[10px] text-muted">
                      {r.postings} ads · {r.employers} firms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* EXPLANATION */}
        <div
          data-anim
          className="col-span-1 md:col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-surface px-5 py-4"
        >
          <h3 className="shrink-0 text-base font-semibold text-ink">
            What you are looking at
          </h3>

          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              Of the {p?.total_roles ?? 0} job titles common enough to measure,{" "}
              <span className="font-medium text-ink">
                {p?.single_sector_share ?? 0}% are advertised in one industry and
                nowhere else
              </span>
              . The widest travels across {p?.max_sectors ?? 0}.
            </p>

            {widest && (
              <p>
                <span className="font-medium text-ink">The widest.</span>{" "}
                {titleCase(widest.role)} was advertised by {widest.employers}{" "}
                employers across {widest.sectors} industries — mostly{" "}
                {widest.breakdown[0]?.sector}
                {widest.breakdown[1] && (
                  <>
                    , but also {widest.breakdown[1].sector.toLowerCase()}
                    {SECTOR_PLAIN[widest.breakdown[1].sector]
                      ? ` (${SECTOR_PLAIN[widest.breakdown[1].sector]})`
                      : ""}
                  </>
                )}
                .
              </p>
            )}

            <p>
              <span className="font-medium text-ink">Why it matters.</span> A
              title stuck in one industry means a switch is a career change, and
              you compete against people who already have the experience. A title
              several industries advertise is a door that is already open.
            </p>

            <p>
              <span className="font-medium text-ink">
                What this does not tell you.
              </span>{" "}
              That a title appears in five industries means five industries
              advertise it — not that any one employer will take you from one to
              another. It is a map of where a job exists, not a promise about
              hiring.
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

      {/* ---- bottom: how it is counted ---- */}
      <div
        data-anim
        className="mt-4 shrink-0 rounded-xl border border-line bg-surface px-6 py-4"
      >
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h3 className="shrink-0 text-base font-semibold text-ink">
            How this is counted
          </h3>
          <p className="text-[12px] text-muted">
            Three things worth knowing before you rely on it.
          </p>
        </div>

        {/* Kept short: this row is full-width under the chart, so every line it
            takes is a line the bars lose on a 720px-tall screen. */}
        <div className="mt-2.5 grid grid-cols-1 gap-4 text-[11px] leading-snug text-muted md:grid-cols-3 md:gap-5">
          <div>
            <p className="font-medium text-ink">Titles are merged first</p>
            <p className="mt-0.5">
              Spellings are normalised and Bangla matched to English, so ড্রাইভার
              and Driver count once. Seniority is stripped, so a Senior Sales
              Executive is a Sales Executive here.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              Read from adverts, not from skills
            </p>
            <p className="mt-0.5">
              Title, industry and employer come straight off the advert. None of
              this uses our skill extraction, which is unvalidated across boards
              — so nothing here inherits that.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">
              A sector counts at three adverts
            </p>
            <p className="mt-0.5">
              One stray advert would read as &ldquo;this industry hires you&rdquo;.
              Counted over 120 days, because whether a job travels is a property
              of the work, not of this week.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
