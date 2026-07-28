"use client"

// Explainer before the switchers chart. The reader is already employed and
// wants to know which way the market is moving before they commit to a move.
//
// This one carries an unusual burden: the chart it introduces is openly
// provisional, so the explainer has to set that expectation rather than build
// confidence the data cannot support.
export default function SwitchersIntroPanel() {
  const points = [
    {
      n: "01",
      q: "Which sectors are actually growing?",
      a: "Not which are biggest — which are posting more jobs this fortnight than last. A shrinking sector can still be the largest employer in the country, and a growing one can still be small.",
    },
    {
      n: "02",
      q: "Why direction beats size when you are switching",
      a: "Moving into a sector that is contracting means competing with people who already have the experience, for a shrinking number of openings. Direction tells you where the door is opening.",
    },
    {
      n: "03",
      q: "Why we are showing it anyway",
      a: "This measurement is too young to be reliable, and the next panel says so in its own headline. We would rather show the working and let you judge it than publish nothing, or publish it as though it were settled.",
    },
  ]

  const method = [
    {
      term: "Two blocks, not a trend line",
      def: "Postings in one block of days against the block before it. Too short to call a trend — enough to see which way things are pointing.",
    },
    {
      term: "Only continuously-crawled days",
      def: "Days when the collector actually ran. The stretch it missed is excluded, because what it captured afterwards is only the postings that happened to still be open.",
    },
    {
      term: "Small sectors are dropped",
      def: "A sector needs at least 40 postings across both blocks. Below that a couple of adverts becomes a triple-digit percentage.",
    },
  ]

  return (
    <div className="flex h-full w-full flex-col pt-24">
      <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line">
        {/* ---- column 1: the framing ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
            For switchers
          </p>
          <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-ink">
            Which way is
            <br />
            the market
            <br />
            moving?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            If you already have a job, the useful question is not where the work
            is today. It is where there will be more of it than there was last
            month.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            That is a harder thing to measure than it sounds, and we are honest
            on the next panel about how far from settled our answer is.
          </p>
        </div>

        {/* ---- column 2: what it answers ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-8 px-12 pb-10 lg:px-14"
        >
          {points.map((p) => (
            <div key={p.n}>
              <span className="font-mono text-xs text-brand">{p.n}</span>
              <p className="mt-1.5 text-lg font-medium leading-snug text-ink">
                {p.q}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.a}</p>
            </div>
          ))}
        </div>

        {/* ---- column 3: how it is measured ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-5 px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted">
            How this is measured
          </p>
          {method.map((t) => (
            <div key={t.term}>
              <p className="text-[15px] font-medium text-ink">{t.term}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t.def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
