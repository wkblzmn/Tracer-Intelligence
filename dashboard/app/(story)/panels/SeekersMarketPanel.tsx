"use client"

export type WindowRow = {
  category: string
  total: number
  with_window: number
  coverage: number
  p25: number
  p50: number
  p75: number
}

export type RoleRow = {
  role: string
  postings: number
  entry_level: number
  assistant_level: number
  unspecified: number
  senior_level: number
}

export type OpportunityCategory = {
  category: string
  postings: number
  share: number
}

export type OpportunityPayload = {
  total_postings: number
  categories: OpportunityCategory[]
}

type Props = {
  opportunity: OpportunityPayload | null
  applicationWindow: WindowRow[] | null
  topRoles: RoleRow[] | null
}

const fmt = (n: number) => n.toLocaleString("en-US")

// Job boards pre-fill 30 days and most employers never change it, so the
// absolute number is a form default rather than a market signal. What is real
// is which fields deliberately close earlier.
const DEFAULT_WINDOW = 30

// Bento: one tall card and two wide ones, filling the panel edge to edge.
// The previous three-equal-column version centred sparse text in full-height
// columns, which left large dead bands above and below every block.
function Card({
  heading,
  explain,
  note,
  className = "",
  children,
}: {
  heading: string
  explain: string
  note?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-anim
      className={`flex min-h-0 flex-col rounded-xl border border-line bg-surface p-6 ${className}`}
    >
      <h3 className="text-xl font-semibold leading-snug tracking-tight text-ink">
        {heading}
      </h3>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
        {explain}
      </p>
      <div className="mt-5 min-h-0 flex-1">{children}</div>
      {note && (
        <p className="mt-3 shrink-0 text-[11px] leading-relaxed text-muted">
          {note}
        </p>
      )}
    </div>
  )
}

function Bar({
  label,
  value,
  suffix,
  fraction,
}: {
  label: string
  value: number
  suffix?: string
  fraction: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-20 md:w-28 shrink-0 truncate text-xs capitalize text-muted"
        title={label}
      >
        {label}
      </span>
      <div className="h-2 flex-1 rounded-sm bg-[#ECEBF4]">
        <div
          className="h-full rounded-sm bg-brand"
          style={{ width: `${Math.max(2, Math.min(100, fraction * 100))}%` }}
        />
      </div>
      <span className="w-9 md:w-11 shrink-0 text-right font-mono text-xs text-ink">
        {value}
        {suffix}
      </span>
    </div>
  )
}

export default function SeekersMarketPanel({
  opportunity,
  applicationWindow,
  topRoles,
}: Props) {
  const early = (applicationWindow ?? [])
    .filter((w) => w.p50 <= DEFAULT_WINDOW - 5)
    .slice(0, 6)

  const roles = (topRoles ?? []).slice(0, 6)
  const maxRole = Math.max(1, ...roles.map((r) => r.postings))

  const cats = opportunity?.categories ?? []
  const total = opportunity?.total_postings ?? 0
  const top6 = cats.slice(0, 6)
  const otherShare = Number(
    (100 - top6.reduce((s, c) => s + c.share, 0)).toFixed(1)
  )
  const leader = top6[0]

  return (
    <div className="flex min-h-screen w-full flex-col px-5 pb-10 pt-20 md:h-full md:min-h-0 md:px-10 md:pb-8 md:pt-24 lg:px-14">
      <header data-anim className="shrink-0 pb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
          For job seekers
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          What&rsquo;s open, for how long, and where.
        </h2>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        {/* ---- tall: timing ---- */}
        <Card
          className="row-span-2"
          heading="In some fields you have half the time you think."
          explain={`Job sites fill in ${DEFAULT_WINDOW} days automatically, so most adverts run exactly that long and the number tells you nothing. When a field closes sooner, an employer chose to — and these are the fields where waiting a week costs you the job.`}
          note={`Typical days between an advert appearing and its closing date, against the ${DEFAULT_WINDOW}-day default.`}
        >
          <div className="flex h-full flex-col justify-center gap-3">
            {early.map((w) => (
              <Bar
                key={w.category}
                label={w.category}
                value={w.p50}
                suffix="d"
                fraction={w.p50 / DEFAULT_WINDOW}
              />
            ))}
          </div>
        </Card>

        {/* ---- wide: roles ---- */}
        <Card
          className="col-span-1 md:col-span-2"
          heading="These are the jobs actually being advertised."
          explain="Not job titles in general — the specific roles employers are hiring for right now. Spellings are merged and Bangla titles matched to their English equivalent, so ড্রাইভার and Driver count as one job rather than two."
          note="Number of open adverts per role, across all three job boards."
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
            {roles.map((r) => (
              <Bar
                key={r.role}
                label={r.role}
                value={r.postings}
                fraction={r.postings / maxRole}
              />
            ))}
          </div>
        </Card>

        {/* ---- wide: composition ---- */}
        <Card
          className="col-span-1 md:col-span-2"
          heading={
            leader
              ? `Nearly ${Math.round(leader.share)}% of all openings are one field.`
              : "Where the openings sit"
          }
          explain={`Every advert belongs to a field the employer picked. This is how ${fmt(total)} current openings divide up — worth knowing both for where the work is and for where you will face the most competition.`}
        >
          <div className="flex h-full flex-col justify-center">
            <div className="flex h-3 w-full overflow-hidden rounded-sm">
              {top6.map((c, i) => (
                <div
                  key={c.category}
                  title={`${c.category} — ${c.share}%`}
                  style={{
                    width: `${c.share}%`,
                    backgroundColor: `rgba(83, 74, 183, ${(1 - i * 0.13).toFixed(2)})`,
                  }}
                />
              ))}
              <div
                style={{ width: `${otherShare}%` }}
                className="bg-[#ECEBF4]"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 md:grid-cols-2">
              {top6.map((c, i) => (
                <div key={c.category} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: `rgba(83, 74, 183, ${(1 - i * 0.13).toFixed(2)})`,
                    }}
                  />
                  <span className="flex-1 truncate text-xs text-muted">
                    {c.category}
                  </span>
                  <span className="font-mono text-xs text-ink">{c.share}%</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-[2px] bg-[#ECEBF4]" />
                <span className="flex-1 text-xs text-muted">
                  every other field
                </span>
                <span className="font-mono text-xs text-muted">
                  {otherShare}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
