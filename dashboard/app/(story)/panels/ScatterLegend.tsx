"use client"

// The scatter carries four encodings — x, y, size, colour. Describing them in a
// sentence asks the reader to hold four mappings in their head while looking at
// dots. Showing them is faster than saying them.
export default function ScatterLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-muted">
      <span className="flex items-center gap-1.5">
        <svg width="34" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="26" y2="5" stroke="#C9C6E4" strokeWidth="1" />
          <path d="M26 1 L32 5 L26 9 Z" fill="#C9C6E4" />
        </svg>
        more openings
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="10" height="30" aria-hidden="true">
          <line x1="5" y1="30" x2="5" y2="6" stroke="#C9C6E4" strokeWidth="1" />
          <path d="M1 6 L5 0 L9 6 Z" fill="#C9C6E4" />
        </svg>
        higher pay
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="30" height="14" aria-hidden="true">
          <circle cx="4" cy="7" r="2.5" fill="#9A93D6" />
          <circle cx="14" cy="7" r="4.5" fill="#9A93D6" />
          <circle cx="25" cy="7" r="6.5" fill="#9A93D6" />
        </svg>
        more employers
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="30" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill="rgba(83,74,183,0.22)" />
          <circle cx="15" cy="5" r="4" fill="rgba(83,74,183,0.55)" />
          <circle cx="25" cy="5" r="4" fill="rgba(83,74,183,0.9)" />
        </svg>
        more often states pay
      </span>
    </div>
  )
}