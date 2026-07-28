import SiteNav from "@/app/components/SiteNav"

// Chrome for the vertical detail pages only. It lives in this route group
// rather than the root layout because `/` is the horizontal story, which
// carries its own nav — previously a client component had to read the pathname
// and return null to stop the two doubling up. The route group does that
// structurally instead.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteNav />
      {children}
    </>
  )
}
