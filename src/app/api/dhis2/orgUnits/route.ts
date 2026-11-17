import { NextRequest, NextResponse } from "next/server"
import { resolveDhis2Credentials, dhis2Fetch } from "@/lib/dhis2Client"

interface OrgUnitItem {
  id: string
  displayName: string
  name: string
  level: number
  path?: string
  parent?: { id: string; displayName: string }
}

// Cache all organisation units to keep modal opening instantaneous
let cachedAllOus: {
  timestamp: number
  serverUrl: string
  units: OrgUnitItem[]
} | null = null

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(req: NextRequest) {
  try {
    const credentials = resolveDhis2Credentials(req)
    const { searchParams } = new URL(req.url)
    const program = searchParams.get("program")?.trim()

    // 1. Get all organisation units (from cache or DHIS2)
    const now = Date.now()
    let allOus: OrgUnitItem[] | null =
      cachedAllOus &&
      cachedAllOus.serverUrl === credentials.serverUrl &&
      now - cachedAllOus.timestamp < CACHE_TTL_MS
        ? cachedAllOus.units
        : null

    if (!allOus) {
      const res = await dhis2Fetch(
        "/api/organisationUnits.json?fields=id,displayName,name,level,path,parent[id,displayName]&paging=false",
        credentials
      )

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ ok: false, error: err }, { status: res.status })
      }

      const data = await res.json()
      const rawUnits = (data.organisationUnits || []) as OrgUnitItem[]
      // Exclude test organisation units (e.g. "NGO Province (Test)", "(Test)")
      allOus = rawUnits.filter((ou) => {
        const name = `${ou.displayName || ""} ${ou.name || ""}`.toLowerCase()
        return !name.includes("(test)") && !name.includes("test province") && !name.includes("test od")
      })
      cachedAllOus = {
        timestamp: now,
        serverUrl: credentials.serverUrl,
        units: allOus,
      }
    }

    if (!allOus) {
      allOus = []
    }

    // 2. If program is specified, filter tree by program-assigned organisation units
    if (program && program !== "ALL") {
      const progRes = await dhis2Fetch(
        `/api/programs/${program}.json?fields=id,displayName,organisationUnits[id,path]`,
        credentials
      )

      if (progRes.ok) {
        const progData = await progRes.json()
        const assignedOus: Array<{ id: string; path?: string }> = progData.organisationUnits || []
        const assignedIds = new Set(assignedOus.map((o) => o.id))
        const assignedPaths = assignedOus.map((o) => o.path || "").filter(Boolean)

        const filtered = allOus.filter((ou) => {
          if (assignedIds.has(ou.id)) return true
          if (ou.path) {
            // Keep if ou is an ancestor of any assigned unit (to form the tree leading to the site)
            if (assignedPaths.some((p) => p.startsWith(`${ou.path}/`))) return true
            // Keep if ou is a descendant of any assigned unit
            if (assignedPaths.some((p) => ou.path!.startsWith(`${p}/`))) return true
          }
          return false
        })

        return NextResponse.json({
          ok: true,
          programId: program,
          totalAssigned: assignedOus.length,
          organisationUnits: filtered,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      organisationUnits: allOus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching organisation units"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
