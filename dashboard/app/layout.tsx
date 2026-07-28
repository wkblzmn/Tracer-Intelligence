import type { Metadata } from "next"
import { IBM_Plex_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google"
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

// 300 and 500 added — the hero and loader use them for weight contrast.
// With only 700 loaded the browser fakes the lighter weights and every
// wordmark renders the same heaviness.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "700"],
  variable: "--font-wordmark",
})

export const metadata: Metadata = {
  title: "Tracer Intelligence",
  description: "Bangladesh Labor Market Intelligence",
}

// Root layout carries fonts and globals only. Chrome belongs to the route
// groups: app/(site)/layout.tsx renders the dashboard nav, and app/(story)
// deliberately has none because the story supplies its own.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
