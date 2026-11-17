import { NextRequest, NextResponse } from "next/server"
import { getMySqlPool } from "@/lib/mysqlClient"
import type { DhisOrgUnit } from "@/components/OrgUnitModal"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const program = (searchParams.get("program") || "ALL").toUpperCase() // "VCCT", "ART", or "ALL"

    const pool = getMySqlPool()

    // 1. Fetch all active sites from tblsites joined with tblprovince
    let siteQuery = `
      SELECT 
        s.id, 
        s.site_name, 
        s.od_code, 
        s.od_name, 
        s.province_id, 
        s.art_site_code, 
        s.vcct_site_code,
        p.province_kh, 
        p.province_en
      FROM tblsites s
      LEFT JOIN tblprovince p ON p.id = s.province_id
      WHERE s.status_id = 1
        AND LOWER(s.site_name) NOT LIKE '%test%'
        AND LOWER(s.od_name) NOT LIKE '%test%'
    `

    if (program === "VCCT") {
      siteQuery += " AND s.vcct_site_code IS NOT NULL AND s.vcct_site_code != ''"
    } else if (program === "ART") {
      siteQuery += " AND s.art_site_code IS NOT NULL AND s.art_site_code != ''"
    }

    siteQuery += " ORDER BY p.province_kh ASC, s.od_name ASC, s.site_name ASC"

    const [sites] = await pool.query<any[]>(siteQuery)

    // Build hierarchy strictly from tblsites
    const rootId = "cambodia_root"
    const orgUnits: DhisOrgUnit[] = []

    // Level 1: Root (កម្ពុជា / Cambodia)
    orgUnits.push({
      id: rootId,
      displayName: "កម្ពុជា (Cambodia)",
      name: "Cambodia",
      level: 1,
      path: `/${rootId}`,
    })

    const provincesMap = new Map<number, { id: string; name: string }>()
    const odsMap = new Map<string, { id: string; name: string; provId: string }>()

    for (const s of sites) {
      const pId = s.province_id || 0
      const provKey = `prov_${pId}`

      // Level 2: Province
      if (!provincesMap.has(pId)) {
        const provName = s.province_kh || s.province_en || `ខេត្ត ${pId}`
        provincesMap.set(pId, { id: provKey, name: provName })
        orgUnits.push({
          id: provKey,
          displayName: provName,
          name: s.province_en || provName,
          level: 2,
          path: `/${rootId}/${provKey}`,
          parent: { id: rootId, displayName: "កម្ពុជា (Cambodia)" },
        })
      }

      // Level 3: Operational District (OD)
      const odCode = s.od_code || "unknown"
      const odKey = `od_${odCode}`
      const odLookupKey = `${pId}_${odCode}`

      if (!odsMap.has(odLookupKey)) {
        const odName = s.od_name || `ស្រុកប្រតិបត្តិ ${odCode}`
        odsMap.set(odLookupKey, { id: odKey, name: odName, provId: provKey })
        orgUnits.push({
          id: odKey,
          displayName: odName,
          name: odName,
          level: 3,
          path: `/${rootId}/${provKey}/${odKey}`,
          parent: { id: provKey },
        })
      }

      // Level 4: Facility / Health Center / Referral Hospital (Site)
      const siteCode =
        program === "ART"
          ? s.art_site_code || s.site_name
          : program === "VCCT"
          ? s.vcct_site_code || s.site_name
          : s.art_site_code || s.vcct_site_code || `site_${s.id}`

      orgUnits.push({
        id: siteCode,
        displayName: s.site_name,
        name: s.site_name,
        level: 4,
        path: `/${rootId}/${provKey}/${odKey}/${siteCode}`,
        parent: { id: odKey },
      })
    }

    return NextResponse.json({
      ok: true,
      program,
      totalSites: sites.length,
      orgUnits,
    })
  } catch (error: any) {
    console.error("API /api/mysql/orgUnits error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load MySQL orgUnits from tblsites" },
      { status: 500 }
    )
  }
}
