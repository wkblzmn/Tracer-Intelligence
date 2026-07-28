"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

const WORD = "Intelligence"
const MIN_MS = 1400 // minimum time on screen, so the reveal always completes

type Props = {
  /** flips true when the page's data has finished fetching */
  ready: boolean
  /** called after the exit fade — parent unmounts the loader here */
  onDone: () => void
}

export default function BrandLoader({ ready, onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [minPassed, setMinPassed] = useState(false)

  // Gate 1: minimum on-screen time. Prevents a 200ms flash on a fast fetch.
  useEffect(() => {
    const t = setTimeout(() => setMinPassed(true), MIN_MS)
    return () => clearTimeout(t)
  }, [])

  // Entrance: "Tracer" rises in, then the letters sweep I -> e.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set([".brand-tracer", ".brand-letter"], { opacity: 1, y: 0 })
        return
      }

      gsap
        .timeline()
        .from(".brand-tracer", {
          opacity: 0,
          y: 14,
          duration: 0.55,
          ease: "power2.out",
        })
        .from(
          ".brand-letter",
          {
            opacity: 0,
            y: 10,
            duration: 0.4,
            // each letter starts 55ms after the previous — the I -> e sweep
            stagger: 0.055,
            ease: "power2.out",
          },
          "-=0.2"
        )
    }, rootRef)

    return () => ctx.revert()
  }, [])

  // Held in a ref so the exit effect doesn't depend on the callback's identity.
  // The parent passes an inline arrow and re-renders on every scroll tick, so a
  // plain `onDone` dependency re-ran this effect continuously — each cleanup
  // reverted the fade back to opacity 1 and restarted it, meaning onComplete
  // never fired and the loader sat over the page forever.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // Gate 2: exit only when data is in AND the minimum time has elapsed.
  useEffect(() => {
    if (!ready || !minPassed) return

    const ctx = gsap.context(() => {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => onDoneRef.current(),
      })
    }, rootRef)

    return () => ctx.revert()
  }, [ready, minPassed])

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F7FB]"
    >
      <span
        className="brand-tracer text-6xl leading-none text-[#17172A]"
        style={{ fontFamily: "var(--font-wordmark), serif", fontWeight: 500 }}
      >
        Tracer
      </span>

      {/* aria-label keeps it one readable word for screen readers, since the
          visible text is split into 12 separate spans. */}
      <span
        aria-label={WORD}
        className="mt-2 flex text-5xl leading-none"
        style={{ fontFamily: "var(--font-wordmark), serif", fontWeight: 300 }}
      >
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="brand-letter inline-block text-[#534AB7]"
          >
            {ch}
          </span>
        ))}
      </span>
    </div>
  )
}