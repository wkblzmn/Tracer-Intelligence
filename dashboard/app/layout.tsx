import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tracer Intelligence",
  description: "Bangladesh Labor Market Intelligence",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-white text-gray-900">
        <nav className="border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-bold text-lg">
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