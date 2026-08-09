"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

// Nav for the vertical detail pages. Same pill language as the story's nav so
// the two do not read as different products — the difference is what the fill
// means. On the story it tracks reading progress through a section; here there
// is no progression to measure, so it simply marks the page you are on.
const NAV = [
  { href: "/search", label: "Search" },
  { href: "/skills", label: "Skills" },
  { href: "/sources", label: "Sources" },
  { href: "/insights", label: "Insights" },
  { href: "/geography", label: "Geography" },
]

// shrink-0 so the pills keep their size inside the scrolling row below rather
// than being squeezed into unreadable slivers on a phone.
const PILL =
  "nav-pill shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors md:px-3.5 md:text-[11px]"

export default function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Search is the one page opened in a new tab from the story, so it gets a
  // deliberately minimal nav: where you are, and the way back.
  const isSearch = pathname === "/search"

  // Back to where you came from — never by closing the tab, which is
  // startling when the reader did not ask for it.
  //   * navigated here from another page -> ordinary back
  //   * opened cold, or in a fresh tab from the story (no history) -> the story
  const goHome = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Same mark as the story: "Tracer", Fraunces, weight 500. */}
        <Link
          href="/"
          style={{ fontFamily: "var(--font-wordmark), serif", fontWeight: 500 }}
          className="shrink-0 text-xl leading-none text-ink transition-colors hover:text-brand md:text-2xl"
        >
          Tracer
        </Link>

        {/* Five pills plus the wordmark do not fit 375px. The row scrolls
            sideways under a fixed wordmark rather than wrapping, which would
            make the sticky nav two lines tall on every page. */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto md:overflow-x-visible">
          {isSearch ? (
            <>
              <button
                onClick={goHome}
                style={{ ["--fill" as string]: "0%" }}
                className={`${PILL} text-muted hover:text-ink`}
              >
                Home
              </button>
              <span
                style={{ ["--fill" as string]: "100%" }}
                className={`${PILL} text-ink`}
              >
                Search
              </span>
            </>
          ) : (
            NAV.map((n) => {
              const active =
                pathname === n.href || pathname.startsWith(n.href + "/")
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  style={{ ["--fill" as string]: active ? "100%" : "0%" }}
                  className={`${PILL} ${
                    active ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </nav>
  )
}
