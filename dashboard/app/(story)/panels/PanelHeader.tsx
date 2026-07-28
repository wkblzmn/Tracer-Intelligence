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
    <div className="flex items-baseline justify-between gap-8 border-b border-line pb-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          {audience}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
          {question}
        </h2>
      </div>
      {note && (
        <p className="max-w-md shrink-0 text-right text-xs leading-relaxed text-muted">
          {note}
        </p>
      )}
    </div>
  )
}