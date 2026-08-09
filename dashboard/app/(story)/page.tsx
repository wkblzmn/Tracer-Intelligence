"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import BrandLoader from "../components/BrandLoader"
import HeroPanel from "./panels/HeroPanel"
import SeekersIntroPanel from "./panels/SeekersIntroPanel"
import SeekersPayPanel from "./panels/SeekersPayPanel"
import SeekersMarketPanel from "./panels/SeekersMarketPanel"
import SwitchersIntroPanel from "./panels/SwitchersIntroPanel"
import SwitchersPanel from "./panels/SwitchersPanel"
import SwitchersPortabilityPanel from "./panels/SwitchersPortabilityPanel"
import SkillsPanel from "./panels/SkillsPanel"
import InsightsPanel from "./panels/InsightsPanel"
import CoveragePanel from "./panels/CoveragePanel"
import OverviewSection from "./panels/OverviewSection"
import GeographyIntroPanel from "./panels/GeographyIntroPanel"
import GeographyPanel from "./panels/GeographyPanel"
import type { SiteData } from "./panels/HeroPanel"

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Named endpoints, so panels read data.metrics rather than data[0].
// Index-based access breaks the moment these get reordered.
const ENDPOINTS = {
  metrics: "/api/stats/metrics",
  geography: "/api/stats/geography",
  marketSignals: "/api/stats/market-signals",
  lifespan: "/api/stats/lifespan",
  // withCoverage adds the how-much-of-the-market figures the panel discloses.
  // The bare-array default is left alone for the existing /skills page.
  skills: "/api/stats/skills?limit=10&withCoverage=1",
  opportunity: "/api/stats/opportunity",
  applicationWindow: "/api/stats/application-window",
  topRoles: "/api/stats/top-roles",
  // Portability now renders: it answers the switcher's structural question
  // (which titles are advertised across industries) without depending on the
  // continuous-collection window that sector momentum needs.
  portability: "/api/stats/portability",
  momentum: "/api/stats/sector-momentum",
  sourceMatrix: "/api/stats/source-matrix",
  // The Overview tail — the old homepage, now the vertical section that
  // follows the horizontal track on this same route.
  overview: "/api/stats/overview",
  categories: "/api/stats/categories",
  trending: "/api/companies/trending?limit=10",
  recentJobs: "/api/jobs/recent?limit=20",
}

// `Component: null` = not built yet, falls back to the placeholder.
// Filling a panel is a one-line change here.
const PANELS = [
  // nav:true so the hero gets a pill too — without it the pill row has a gap
  // at the start, and the first panel is the only one with no feedback.
  { id: "hero", label: "Home", nav: true, Component: HeroPanel },
  { id: "seekers-intro", label: "For seekers", nav: true, Component: SeekersIntroPanel },
  // Split in two: one chart per panel with room to explain it. Four visuals on
  // a single panel read as noise to anyone who hasn't seen the data before.
  { id: "seekers-pay", label: "For seekers", nav: false, Component: SeekersPayPanel },
  { id: "seekers-market", label: "For seekers", nav: false, Component: SeekersMarketPanel },
  { id: "switchers-intro", label: "For switchers", nav: true, Component: SwitchersIntroPanel },
  // Portability first: it stands on 120 days of first-party fields, so the
  // switchers section leads with what holds and follows with the measurement
  // that is still young enough to need four caveats.
  {
    id: "switchers-portability",
    label: "For switchers",
    nav: false,
    Component: SwitchersPortabilityPanel,
  },
  { id: "switchers", label: "For switchers", nav: false, Component: SwitchersPanel },
  { id: "students", label: "For students", nav: true, Component: null },
  { id: "skills", label: "Skills", nav: true, Component: SkillsPanel },
  { id: "insights", label: "Insights", nav: true, Component: InsightsPanel },
  { id: "geography-intro", label: "Geography", nav: true, Component: GeographyIntroPanel },
  { id: "geography", label: "Geography", nav: false, Component: GeographyPanel },
  { id: "coverage", label: "Coverage & Method", nav: true, Component: CoveragePanel },
]

// Panels that come to rest on their own. Snapping the whole track was tried
// and rejected — it made the scroll feel controlling. These two are dense
// charts that are unreadable when left half-shown, so they get it and nothing
// else does; everywhere else the track still rests wherever the user stops.
const SNAP_IDS = new Set(["seekers-pay", "seekers-market", "switchers"])

// Each nav item owns the panels from its own index up to (but excluding) the
// next nav item's. "For seekers" owns three panels, "Skills" owns one — which
// is what decides how far its pill fills per panel: thirds vs all at once.
const NAV_SECTIONS = (() => {
  const navIdx = PANELS.map((p, i) => (p.nav ? i : -1)).filter((i) => i >= 0)
  return navIdx.map((start, k) => {
    const end = (navIdx[k + 1] ?? PANELS.length) - 1
    return {
      id: PANELS[start].id,
      label: PANELS[start].label,
      start,
      span: end - start + 1,
    }
  })
})()

export default function StoryPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  // Holds the live ScrollTrigger so the nav can compute jump targets.
  const stRef = useRef<ScrollTrigger | null>(null)

  const [data, setData] = useState<SiteData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch everything in parallel, once, into a keyed object.
  useEffect(() => {
    const keys = Object.keys(ENDPOINTS) as (keyof typeof ENDPOINTS)[]

    // Each endpoint is fetched independently: one failing (bad JSON, 500,
    // empty body) yields null for that key instead of rejecting the whole
    // batch and blanking the page. A panel with null data degrades on its own.
    const safeFetch = async (url: string) => {
      try {
        const r = await fetch(url)
        if (!r.ok) return null
        const text = await r.text()
        return text ? JSON.parse(text) : null
      } catch (err) {
        console.error("fetch failed:", url, err)
        return null
      }
    }

    Promise.all(keys.map((k) => safeFetch(ENDPOINTS[k]))).then((results) => {
      setData(
        Object.fromEntries(keys.map((k, i) => [k, results[i]])) as unknown as SiteData
      )
    })
  }, [])

  // Horizontal scroll mechanic.
  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Progress values (0-1) of the panels that snap, derived from their index
    // so adding or reordering panels can't silently point this at the wrong
    // one. snapWindow is half a panel, the pull radius either side.
    const lastIndex = PANELS.length - 1
    const snapPoints = PANELS.reduce<number[]>((acc, p, i) => {
      if (SNAP_IDS.has(p.id)) acc.push(i / lastIndex)
      return acc
    }, [])
    const snapWindow = 0.5 / lastIndex

    // One panel == the viewport width minus the scrollbar, re-measured on
    // resize so this holds on any screen. There is no pure-CSS unit for it:
    // 100vw counts the scrollbar, and a container query would have to sit on
    // the pinned element, whose size GSAP freezes inline at pin time.
    // Measured from <body>, which stays stable because html reserves the
    // scrollbar gutter — and deliberately NOT measured inside ScrollTrigger's
    // refresh, which alters the scroller's overflow while measuring and
    // reports a width one scrollbar too wide.
    const setPanelWidth = () => {
      track.style.setProperty("--panel-w", `${document.body.clientWidth}px`)
    }

    setPanelWidth()

    const setFillOn = (id: string, fraction: number) => {
      const el = navRef.current?.querySelector<HTMLElement>(`[data-nav="${id}"]`)
      if (!el) return
      const f = Math.max(0, Math.min(1, fraction))
      el.style.setProperty("--fill", `${(f * 100).toFixed(2)}%`)
    }

    // Fill fraction for one nav item = how far the reader has moved through
    // the panels that item owns. A three-panel section therefore fills in
    // thirds; a one-panel section fills in a single step.
    const setNavFill = (progress: number) => {
      const pos = progress * (PANELS.length - 1)
      for (const s of NAV_SECTIONS) {
        setFillOn(s.id, (pos - s.start + 1) / s.span)
      }
    }

    const onResize = () => {
      setPanelWidth()
      ScrollTrigger.refresh()
    }
    window.addEventListener("resize", onResize)

    const ctx = gsap.context(() => {
      // Same measurement the panels are sized from, so the track and the
      // scroll distance can never disagree.
      const distance = () => track.scrollWidth - document.documentElement.clientWidth

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          // Per-panel snapping. snapTo receives the track's progress (0-1) and
          // returns where it should settle: the nearest opted-in panel if the
          // user stopped within half a panel of one, otherwise the value
          // untouched, which is a no-op. That keeps free scrolling everywhere
          // except the two chart panels.
          snap: {
            snapTo: (value) => {
              let best = value
              let bestDist = Infinity
              for (const point of snapPoints) {
                const d = Math.abs(value - point)
                if (d < bestDist) {
                  bestDist = d
                  best = point
                }
              }
              return bestDist <= snapWindow ? best : value
            },
            duration: reduced ? 0 : { min: 0.15, max: 0.45 },
            delay: 0.06,
            ease: "power2.inOut",
          },
          // Drives the nav pills. Progress runs 0 -> 1 across the whole track,
          // so scaling it by the panel count gives a continuous position in
          // panel units — panel 2.4 means "40% of the way from panel 2 to 3".
          //
          // Written straight to the DOM as a CSS variable rather than through
          // React state. This used to `setActive` every frame, which
          // re-rendered the page on every scroll tick and was the source of
          // the stutter at panel boundaries; now nothing re-renders on scroll
          // at all.
          onUpdate: (self) => setNavFill(self.progress),
          onRefresh: (self) => setNavFill(self.progress),
        },
      })

      stRef.current = tween.scrollTrigger ?? null

      // Overview gets the same pill, but its fill cannot come from the track —
      // it is the vertical section after the pin, not one of the panels. So it
      // has its own trigger measuring how far the reader has scrolled through
      // the section itself: 0 as it reaches the top of the viewport, 1 once
      // its bottom does. Same visual language, honestly sourced.
      if (overviewRef.current) {
        ScrollTrigger.create({
          trigger: overviewRef.current,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => setFillOn("overview", self.progress),
          onRefresh: (self) => setFillOn("overview", self.progress),
        })
      }

      // Entrance animations for content inside the horizontal track.
      //
      // `containerAnimation: tween` is the part that matters: these elements
      // never move vertically, so a normal ScrollTrigger would treat them as
      // permanently in view and fire everything at once. Passing the container
      // tween lets ScrollTrigger resolve their position along the horizontal
      // scrub instead, so a panel animates as it actually slides in.
      //
      // Only opacity and transform are animated — both composite on the GPU,
      // so this doesn't cost layout work per frame while scrubbing.
      if (!reduced) {
        const panels = gsap.utils.toArray<HTMLElement>("section", track)
        panels.forEach((panel) => {
          const items = panel.querySelectorAll("[data-anim]")
          if (!items.length) return

          gsap.from(items, {
            opacity: 0,
            y: 28,
            // With scrub, duration/stagger no longer mean seconds — they set
            // the proportions of a timeline that is mapped onto the scroll
            // range below, so the columns still arrive in sequence.
            duration: 1,
            stagger: 0.4,
            ease: "power2.out",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tween,
              // Reveal spans the panel sliding in: from its left edge 85%
              // across the viewport until it has settled at 25%.
              start: "left 85%",
              end: "left 25%",
              // Tied to scroll position rather than played on trigger, so the
              // content appears as fast as the user scrolls — and reverses
              // when they scroll back. A number rather than `true` adds that
              // many seconds of catch-up, matching the eased feel of the
              // track's own scrub:1; rigid 1:1 binding reads as twitchy
              // against a smoothed container.
              scrub: 0.6,
            },
          })
        })
      }
    }, container)

    return () => {
      window.removeEventListener("resize", onResize)
      ctx.revert()
    }
  }, [])

  // Re-measure once the loader is gone and layout is final.
  useEffect(() => {
    if (!loading) ScrollTrigger.refresh()
  }, [loading])

  // Built once per data change, NOT per scroll frame. ScrollTrigger's onUpdate
  // calls setActive on every frame; whenever the rounded panel index changes
  // that re-renders StoryPage, and without this the whole track — the 64-path
  // map and the Recharts scatter included — reconciled again mid-scroll, which
  // is what makes the motion stutter at panel boundaries. Holding the same
  // element references lets React skip the entire subtree; only the nav, which
  // actually depends on `active`, re-renders.
  const panelEls = useMemo(
    () =>
      PANELS.map((p, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Panel = p.Component as React.ComponentType<any> | null
        return (
          <section key={p.id} className="story-panel h-full shrink-0 bg-canvas">
            {Panel ? (
              <Panel
                metrics={data?.metrics ?? null}
                geography={data?.geography ?? null}
                opportunity={data?.opportunity ?? null}
                applicationWindow={data?.applicationWindow ?? null}
                topRoles={data?.topRoles ?? null}
                momentum={data?.momentum ?? null}
                portability={data?.portability ?? null}
                skills={data?.skills ?? null}
                marketSignals={data?.marketSignals ?? null}
                sourceMatrix={data?.sourceMatrix ?? null}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <span className="font-mono text-sm tracking-widest text-muted/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-5xl font-light text-ink">{p.label}</h2>
              </div>
            )}
          </section>
        )
      }),
    [data]
  )

  // Overview begins where the pin releases. Scrolling to the element's own
  // offsetTop is what makes the transition read as continuous rather than a
  // jump to somewhere else.
  const goToOverview = () => {
    const el = overviewRef.current
    if (!el) return
    gsap.to(window, {
      scrollTo: { y: el.offsetTop, autoKill: false },
      duration: 1.2,
      ease: "power2.inOut",
    })
  }

  // Panels are evenly spaced along the trigger's scroll range, so panel i
  // sits at start + (end - start) * (i / (panels - 1)).
  const goToPanel = (i: number) => {
    const st = stRef.current
    if (!st) return
    const y = st.start + (st.end - st.start) * (i / (PANELS.length - 1))
    gsap.to(window, {
      scrollTo: { y, autoKill: false },
      duration: 1,
      ease: "power2.inOut",
    })
  }

  return (
    <>
      {loading && (
        <BrandLoader ready={data !== null} onDone={() => setLoading(false)} />
      )}

      {/* Nav sits above the pinned track. */}
      <nav className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-canvas/80 px-8 py-5 backdrop-blur">
        {/* "Tracer" alone, not "Tracer Int." — the hero states the full name
            immediately below, and "Int." reads as International to most
            people, which is worse than being longer. */}
        <button
          onClick={() => goToPanel(0)}
          className="text-2xl leading-none text-ink transition-colors hover:text-brand"
          style={{ fontFamily: "var(--font-wordmark), serif", fontWeight: 500 }}
        >
          Tracer
        </button>

        <div ref={navRef} className="flex items-center gap-2">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              data-nav={s.id}
              onClick={() => goToPanel(s.start)}
              className="nav-pill rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-widest text-ink"
            >
              {s.label}
            </button>
          ))}

          {/* Overview is part of this page too, so it carries a pill — its
              fill just comes from vertical progress through the section
              instead of from the track. */}
          <button
            data-nav="overview"
            onClick={goToOverview}
            className="nav-pill rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-widest text-ink"
          >
            Overview
          </button>

          {/* Search is the only thing here that leaves the page — hence no
              pill, and a new tab, so the reader's place in the track survives
              going off to look something up. */}
          <a
            href="/search"
            target="_blank"
            rel="noopener"
            className="ml-2 text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-ink"
          >
            Search
          </a>
        </div>
      </nav>

      <main>
        <div ref={containerRef} className="h-screen overflow-hidden">
          <div ref={trackRef} className="flex h-full w-fit">
            {panelEls}
          </div>
        </div>

        {/* Overview: same route, same nav. The pin above holds for a fixed
            scroll distance; once it releases, this scrolls up normally, so
            sideways movement simply becomes downward movement. */}
        <div ref={overviewRef}>
          <OverviewSection
            metrics={data?.metrics ?? null}
            overview={data?.overview ?? null}
            categories={data?.categories ?? null}
            trending={data?.trending ?? null}
            recentJobs={data?.recentJobs ?? null}
          />
        </div>
      </main>
    </>
  )
}