"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import gsap from "gsap"
import type { FeatureCollection, Geometry } from "geojson"
import districtShapes from "@/app/data/bd-districts.json"

type Props = {
  // district name -> posting count. Names already match location_map.py
  // exactly (the 9 colonial spellings were rewritten in the GeoJSON).
  counts: Record<string, number>
}

const geo = districtShapes as unknown as FeatureCollection<
  Geometry,
  { district: string; division: string }
>

// Portrait — Bangladesh spans ~4.7 deg of longitude but ~5.9 deg of latitude.
const W = 420
const H = 520

// The BrandLoader covers the page for ~1.4s plus a 0.5s fade. Starting later
// than that means the entrance actually gets seen instead of playing behind it.
const ENTRANCE_DELAY = 1.9

export default function BangladeshMap({ counts }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // Projection and paths never change, so build them once. Recomputing 64
  // path strings on every hover is what made this feel sluggish.
  // Sorted north -> south so the entrance reads as a deliberate sweep.
  const shapes = useMemo(() => {
    const projection = geoMercator().fitSize([W, H], geo)
    const path = geoPath(projection)
    return geo.features
      .map((f) => {
        const [cx, cy] = path.centroid(f)
        return {
          name: f.properties.district,
          d: path(f) ?? "",
          // centroid in viewBox units -> percentage of the rendered box
          cx: (cx / W) * 100,
          cy: (cy / H) * 100,
        }
      })
      .sort((a, b) => a.cy - b.cy)
  }, [])

  // Entrance: districts fade and settle in, top of the country downward.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const ctx = gsap.context(() => {
      gsap.from(".district", {
        opacity: 0,
        scale: 0.94,
        transformOrigin: "50% 50%",
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.012 },
        delay: ENTRANCE_DELAY,
      })
    }, svgRef)

    return () => ctx.revert()
  }, [])

  // Tooltip fades up on appear rather than popping into place.
  useEffect(() => {
    if (!hover || !tipRef.current) return
    gsap.fromTo(
      tipRef.current,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }
    )
  }, [hover])

  const max = Math.max(1, ...Object.values(counts))

  // Log scale, not linear: Dhaka dwarfs everything, and a linear ramp would
  // render all 63 other districts as effectively the same empty shade.
  const alpha = (n: number) =>
    n ? 0.15 + (Math.log(n + 1) / Math.log(max + 1)) * 0.85 : 0

  const fill = (n: number, isHover: boolean) => {
    if (!n) return isHover ? "#DEDCEC" : "#ECEBF4"
    // Lift the fill on hover so the shape itself responds, not just its edge.
    const a = Math.min(1, alpha(n) + (isHover ? 0.18 : 0))
    return `rgba(83, 74, 183, ${a.toFixed(3)})`
  }

  const active = hover ? shapes.find((s) => s.name === hover) : null
  const activeCount = hover ? counts[hover] ?? 0 : 0

  return (
    // relative, so the tooltip can be positioned against this box
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-label="Job postings by district in Bangladesh"
        onMouseLeave={() => setHover(null)}
      >
        {shapes.map((s) => (
          <path
            key={s.name}
            className="district cursor-pointer"
            d={s.d}
            // fill via style, not attribute — CSS transitions only apply to
            // the property, so an attribute would snap instead of easing.
            style={{
              fill: fill(counts[s.name] ?? 0, hover === s.name),
              transition: "fill 200ms ease-out",
            }}
            stroke="#FFFFFF"
            strokeWidth={0.6}
            // enter/leave only — no mousemove, so no re-render storm
            onMouseEnter={() => setHover(s.name)}
          />
        ))}

        {/* The hovered district is redrawn last so its outline sits on top.
            SVG has no z-index — without this, neighbouring shapes paint over
            the highlight and it looks broken on about half the districts. */}
        {active && (
          <path
            d={active.d}
            fill="none"
            stroke="#3F369A"
            strokeWidth={1.4}
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* Pinned to the district centroid, not the cursor — it lands in one
          place instead of jittering along with the mouse. */}
      {active && (
        <div
          ref={tipRef}
          className="pointer-events-none absolute z-10 w-auto -translate-x-1/2 -translate-y-full rounded border border-line bg-surface px-2.5 py-1.5"
          style={{ left: `${active.cx}%`, top: `calc(${active.cy}% - 6px)` }}
        >
          <p className="whitespace-nowrap text-xs font-medium leading-tight text-ink">
            {active.name}
            <span className="ml-2 font-mono font-normal text-muted">
              {activeCount.toLocaleString("en-US")}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}