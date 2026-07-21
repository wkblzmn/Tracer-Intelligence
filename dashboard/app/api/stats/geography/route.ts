import { NextResponse } from "next/server"
import pool from "@/lib/db"

const ACTIVE = `duplicate_of IS NULL AND is_confidential = FALSE AND link_dead = FALSE
  AND last_seen_at >= NOW() - INTERVAL '3 days'`
const REAL_SECTOR = `category IS NOT NULL AND category <> '' AND category <> 'Uncategorized'`

export async function GET() {
  // district totals (for the map) + district x sector + hub x sector
  const [districtTotals, dxs, hxs] = await Promise.all([
    pool.query(`SELECT district, COUNT(*) n FROM job_postings
                WHERE ${ACTIVE} AND district IS NOT NULL GROUP BY district`),
    pool.query(`SELECT district, category, COUNT(*) n FROM job_postings
                WHERE ${ACTIVE} AND district IS NOT NULL AND ${REAL_SECTOR}
                GROUP BY district, category`),
    pool.query(`SELECT hub, category, COUNT(*) n FROM job_postings
                WHERE ${ACTIVE} AND hub IS NOT NULL AND ${REAL_SECTOR}
                GROUP BY hub, category`),
  ])

  // --- national baseline for Location Quotient (district-attributed universe) ---
  const natSector = new Map<string, number>()
  const distTotal = new Map<string, number>()
  let grand = 0
  for (const r of dxs.rows) {
    const n = Number(r.n)
    natSector.set(r.category, (natSector.get(r.category) ?? 0) + n)
    distTotal.set(r.district, (distTotal.get(r.district) ?? 0) + n)
    grand += n
  }

  // per-district sector rows with LQ = (share in district) / (share nationally)
  const perDistrict = new Map<string, { sector: string; count: number; lq: number }[]>()
  for (const r of dxs.rows) {
    const n = Number(r.n)
    const dt = distTotal.get(r.district) ?? 1
    const ns = natSector.get(r.category) ?? 1
    const lq = (n / dt) / (ns / grand)
    if (!perDistrict.has(r.district)) perDistrict.set(r.district, [])
    perDistrict.get(r.district)!.push({ sector: r.category, count: n, lq: Math.round(lq * 100) / 100 })
  }

  // top districts by volume; each keeps its over-indexed sectors (LQ >= 1.3, count >= 3)
  const districts = [...distTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([district, total]) => ({
      district,
      total,
      sectors: (perDistrict.get(district) ?? [])
        .filter((s) => s.lq >= 1.3 && s.count >= 3)
        .sort((a, b) => b.lq - a.lq)
        .slice(0, 4),
    }))

  // map payload: every district with a total (for the future choropleth)
  const map = districtTotals.rows
    .map((r) => ({ district: r.district as string, total: Number(r.n) }))
    .sort((a, b) => b.total - a.total)

  // hubs: total + top sectors by share
  const hubAgg = new Map<string, { total: number; sectors: Map<string, number> }>()
  for (const r of hxs.rows) {
    const n = Number(r.n)
    if (!hubAgg.has(r.hub)) hubAgg.set(r.hub, { total: 0, sectors: new Map() })
    const h = hubAgg.get(r.hub)!
    h.total += n
    h.sectors.set(r.category, (h.sectors.get(r.category) ?? 0) + n)
  }
  const hubs = [...hubAgg.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([hub, v]) => ({
      hub,
      total: v.total,
      sectors: [...v.sectors.entries()]
        .map(([sector, count]) => ({ sector, count, share: Math.round((count / v.total) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }))

  return NextResponse.json({ map, districts, hubs })
}