import type { Metadata } from "next"
import { IBM_Plex_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-wordmark",
})

export const metadata: Metadata = {
  title: "Tracer Intelligence",
  description: "Bangladesh Labor Market Intelligence",
  icons: { icon: "/favicon.png" },
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/skills", label: "Skills" },
  { href: "/sources", label: "Sources" },
  { href: "/insights", label: "Insights" },
  { href: "/geography", label: "Geography" }
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable}`}
    >
      <body
        className="min-h-screen antialiased"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <nav className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-4 w-4 rounded-[5px] bg-brand" />
              <span
                style={{ fontFamily: "var(--font-wordmark), serif" }}
                className="text-lg font-bold tracking-tight text-ink"
              >
                Tracer Intelligence
              </span>
            </Link>
            <div className="flex gap-7 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-muted hover:text-brand transition-colors">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}