// Route-transition skeleton: shown instantly by the App Router while a page's
// server render is in flight, replaced the moment content streams in. Mirrors
// the house card layout (eyebrow / title / cards) so content lands without a
// visual jump — no fixed duration, no spinner.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-line ${className}`} />
}

function Card({ tall }: { tall?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <Bar className="mb-2 h-2.5 w-14 md:w-24" />
      <Bar className="mb-1.5 h-5 w-40 md:w-64 max-w-full" />
      <Bar className="mb-5 h-3 w-80 max-w-full" />
      <Bar className={tall ? "h-64 w-full" : "h-36 w-full"} />
    </div>
  )
}

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <Bar className="mb-2 h-2.5 w-12 md:w-20" />
      <Bar className="mb-2 h-8 w-96 max-w-full" />
      <Bar className="mb-10 h-4 w-72 max-w-full" />

      <div className="mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5">
            <Bar className="mb-3 h-2.5 w-12 md:w-20" />
            <Bar className="h-9 w-14 md:w-24" />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <Card tall />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card />
        <Card />
      </div>
    </main>
  )
}
