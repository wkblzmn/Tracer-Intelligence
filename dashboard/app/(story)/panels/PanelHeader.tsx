"use client"

// Every panel opens with this. Without it a panel is just charts arriving with
// no context — the reader has no moment of "this section is for me, and here
// is the question it answers." The nav label alone doesn't do that job.
export default function PanelHeader({
  audience,
  question,
  note,
}: {
  /** who this panel is for — short, e.g. "For job seekers" */
  audience: string
  /** the question the panel answers, in plain language */
  question: string
  /** optional caveat or scope line */
  note?: string
}) {
  return (
    // The note sits beside the question from md up and beneath it below that.
    // `shrink-0` is what keeps it from being squeezed on a wide screen, so it
    // only applies there — left on at 375px it refused to narrow and pushed
    // 123px off the side of the page.
    <div className="flex flex-col gap-2 border-b border-line pb-4 md:flex-row md:items-baseline md:justify-between md:gap-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          {audience}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
          {question}
        </h2>
      </div>
      {note && (
        <p className="text-xs leading-relaxed text-muted md:max-w-md md:shrink-0 md:text-right">
          {note}
        </p>
      )}
    </div>
  )
}