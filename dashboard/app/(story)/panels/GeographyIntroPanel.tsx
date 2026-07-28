"use client"

import type { GeographyPayload } from "./GeographyPanel"
import { SECTOR_PLAIN } from "./sectorNames"

type Props = { geography: GeographyPayload | null }

// Location Quotient is the least intuitive idea on the site. This explainer
// makes the next panel legible to someone who has never heard the term — it
// never uses the words "location quotient" in the body, only the plain-language
// version: "more than its size would suggest."
//
// The examples used to be hardcoded ("Gazipur has four times more garment
// jobs", "Cox's Bazar twenty times more NGO roles"). True when written, and
// they would drift silently — on the one panel whose whole job is teaching the
// reader to trust the number. They are read from the data now.
export default function GeographyIntroPanel({ geography }: Props) {
  const districts = geography?.districts ?? []

  // Minimum volume before a district/sector can be the teaching example. The
  // endpoint already admits anything with 3+ postings, and a 12x multiple on
  // three adverts is arithmetic, not a finding — the wrong thing to hand
  // someone who is being taught to trust the number.
  const MIN_POSTINGS = 8

  const examples = districts
    .flatMap((d) =>
      (d.sectors ?? []).map((s) => ({
        district: d.district,
        sector: s.sector,
        count: s.count,
        lq: s.lq,
      }))
    )
    .filter((e) => e.count >= MIN_POSTINGS)
    .sort((a, b) => b.lq - a.lq)
    .slice(0, 2)

  const [first, second] = examples
  // One decimal: the endpoint returns two, and "19.15x" implies a precision
  // that a couple of hundred adverts cannot support.
  const mult = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  const plain = (sector?: string) =>
    sector ? SECTOR_PLAIN[sector] ?? sector.toLowerCase() : "that work"

  return (
    <div className="flex h-full w-full flex-col pt-24">
      <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line">
        {/* ---- column 1: the framing ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
            Where the work is
          </p>
          <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-ink">
            Every district
            <br />
            has a specialty.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Dhaka has the most jobs of every kind — it is the capital, so that
            tells you nothing. The useful question is different: what does a
            district hire for <em>out of proportion to its size?</em>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The next panel answers that for the districts with enough hiring to
            measure.
          </p>
        </div>

        {/* ---- column 2: the idea, made concrete ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-6 px-12 pb-10 lg:px-14"
        >
          <div>
            <span className="font-mono text-xs text-brand">HOW TO READ IT</span>
            <p className="mt-2 text-xl font-medium leading-snug text-ink">
              What does &ldquo;4&times;&rdquo; actually mean?
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              It compares a district against the whole country. If a kind of
              work is 1 job in every 10 nationally, but 4 in every 10 in one
              district, that district scores 4&times; — it is concentrated in
              that work far beyond the national norm.
            </p>
          </div>

          {first && (
            <div className="border-t border-line pt-5">
              <span className="font-mono text-xs text-brand">
                THE STRONGEST EXAMPLES RIGHT NOW
              </span>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <span className="font-medium text-ink">
                  {first.district} — {mult(first.lq)}&times; {first.sector}.
                </span>{" "}
                It advertises {mult(first.lq)} times more {plain(first.sector)} than a
                district its size normally would.
              </p>
              {second && (
                <p className="mt-2.5 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-ink">
                    {second.district} — {mult(second.lq)}&times; {second.sector}.
                  </span>{" "}
                  Same idea: {plain(second.sector)}, far past what its size
                  would predict.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---- column 3: why it matters, and the caveat ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-6 px-12 pb-10 lg:px-14"
        >
          <div>
            <span className="font-mono text-xs text-brand">WHY IT MATTERS</span>
            <p className="mt-2 text-xl font-medium leading-snug text-ink">
              It tells you where to move, or not.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              A high multiple means real depth of employers in that field — more
              options and more leverage if you already do that work. It also
              warns you which districts depend on a single industry, which cuts
              both ways.
            </p>
          </div>

          <div className="border-t border-line pt-5">
            <span className="font-mono text-xs text-brand">THE FINE PRINT</span>
            <p className="mt-2 text-xl font-medium leading-snug text-ink">
              Dhaka is left off on purpose.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Dhaka is so much of the national total that it effectively sets
              the average, so it sits at roughly 1&times; for everything.
              Showing it would bury the districts that actually stand out.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
