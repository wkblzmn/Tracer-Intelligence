import type { Metadata } from "next"
import { IBM_Plex_Sans, Fraunces, Source_Serif_4 } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-wordmark",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Tracer Intelligence",
  description: "Bangladesh Labor Market Intelligence",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${fraunces.variable} ${sourceSerif.variable}`}
    >
      <body
        className="min-h-screen bg-white text-gray-900"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <nav className="border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              style={{ fontFamily: "var(--font-wordmark), serif" }}
              className="text-xl font-bold tracking-tight"
            >
              Tracer Intelligence
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/search" className="text-gray-600 hover:text-gray-900">
                Search
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}