"use client"

// The explainer that comes BEFORE the seekers charts. Written for someone who
// has never seen a labour-market dataset and does not know what "median",
// "sector" or "disclosed pay" mean. No chart on the next panel is readable
// without this, so it gets a full panel rather than a caption.
//
// Laid out as full-height columns, because the panel is read while the track
// is moving sideways. A column enters the viewport whole and is a complete
// thought on its own; anything spread across the panel's full width instead
// arrives in slices, and related pieces end up separated by dead space.
// Hence the framing (heading + lede) sharing one column rather than sitting
// at opposite edges with a gap between them.
export default function SeekersIntroPanel() {
  const questions = [
    {
      n: "01",
      q: "Where are the jobs, and what do they pay?",
      a: "Some fields advertise thousands of openings but pay modestly. Others pay well and hire rarely. Almost nobody can see that trade-off before choosing where to apply.",
    },
    {
      n: "02",
      q: "How long do I actually have?",
      a: "Most ads stay open thirty days, because thirty days is what the job board fills in by default. A few fields close much sooner, and that is a deliberate choice by the employer.",
    },
    {
      n: "03",
      q: "Which jobs are actually being advertised?",
      a: "Not job titles in general — the specific roles employers are hiring for this week, counted across all three job boards and both languages.",
    },
  ]

  const terms = [
    {
      term: "Sector",
      def: "The category the employer picked when posting — Marketing/Sales, Garments/Textile, and so on. Their choice, not ours.",
    },
    {
      term: "Median pay",
      def: "Half the jobs pay more than this, half pay less. Used instead of an average because one enormous salary drags an average somewhere misleading.",
    },
    {
      term: "Stated pay",
      def: "Most Bangladeshi employers never publish a salary. We only count the ones who do, and always show how many that was.",
    },
    {
      term: "Open posting",
      def: "An ad we have seen alive in the last three days. Once it leaves the board we stop counting it — but we keep the record.",
    },
  ]

  return (
    // pt-24 clears the fixed nav, which takes up no layout space
    <div className="flex h-full w-full flex-col pt-24">
      <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line">
        {/* ---- column 1: the framing, kept as one unit ---- */}
        {/* data-anim: staggered entrance, wired up in story/page.tsx */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
            For job seekers
          </p>
          <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-ink">
            Most people
            <br />
            apply blind.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            You find an advert. You cannot tell whether that field is hiring
            hundreds of people or a handful, whether the pay is normal or poor,
            or whether you have three days to apply or a month. The employer
            knows all of it. You know none of it.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The next panel answers those three questions from the adverts
            themselves — every job advertised across Bangladesh&rsquo;s major
            boards, collected every day and kept after it expires.
          </p>
        </div>

        {/* ---- column 2: what the next panel answers ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-8 px-12 pb-10 lg:px-14"
        >
          {questions.map((q) => (
            <div key={q.n}>
              <span className="font-mono text-xs text-brand">{q.n}</span>
              <p className="mt-1.5 text-lg font-medium leading-snug text-ink">
                {q.q}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{q.a}</p>
            </div>
          ))}
        </div>

        {/* ---- column 3: vocabulary, defined before it's used ---- */}
        <div
          data-anim
          className="flex min-h-0 flex-col justify-center gap-5 px-12 pb-10 lg:px-14"
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted">
            Four words used on the next panel
          </p>
          {terms.map((t) => (
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
