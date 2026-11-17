import { NextRequest, NextResponse } from "next/server"
import { resolveDhis2Credentials, dhis2Fetch } from "@/lib/dhis2Client"

// Known UUIC attribute IDs in NPD
const UUIC_ATTRIBUTE_IDS = ["e5FXJFKQyuB", "HIM2iwwsilC", "zIPLqQeF6H7"]

// Attribute ID mappings for NPD
const ATTR_MAP: Record<string, string> = {
  KN6AR1YuTDn: "lastName",
  gJXkrAyY061: "firstName",
  FmWxUZurqA8: "dob",
  BR1fUe7Nx8V: "gender",
  tMRHTqExwBW: "kpType",
  bLz0sZNiURW: "riskLevel",
  UD1QRHQ7dSO: "hotspotName",
  xgRiwHElqm4: "hotspotType",
  SVJcO7Bczcj: "jobType",
  SVq6bXNRhJz: "maritalStatus",
  Kd68BViw8AF: "province",
  fW4E5W7ePjy: "district",
  f6ztgUdD9RV: "commune",
  YxKunRADsZs: "od",
}

interface RawAttribute {
  attribute: string
  displayName?: string
  value: string
  code?: string
}

interface RawTEI {
  trackedEntityInstance: string
  created: string
  lastUpdated: string
  orgUnit: string
  trackedEntityType: string
  attributes?: RawAttribute[]
}

function calculateAge(dobStr?: string): number | null {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (isNaN(dob.getTime())) return null
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

export async function GET(req: NextRequest) {
  try {
    const credentials = resolveDhis2Credentials(req)
    const { searchParams } = new URL(req.url)

    // Default program to Community Prevention (gmO3xUubvMb) if not supplied
    const program = searchParams.get("program") || "gmO3xUubvMb"
    const ou = searchParams.get("ou") || "vUs2cBkPn50" // Root Cambodia OU
    const ouMode = searchParams.get("ouMode") || "DESCENDANTS"
    const pageSize = searchParams.get("pageSize") || "35"
    const page = searchParams.get("page") || "1"
    const query = searchParams.get("query")?.trim() || ""

    const params = new URLSearchParams({
      ou,
      ouMode,
      pageSize,
      page,
      totalPages: "true",
    })

    if (program && program !== "ALL") {
      params.set("program", program)
    } else {
      // If ALL is selected, default to the main Key Population tracked entity type
      params.set("trackedEntityType", "MCPQUTHX1Ze")
    }

    // If searching by UUIC
    if (query) {
      // Try searching against the primary UUIC attribute
      params.set("filter", `e5FXJFKQyuB:LIKE:${query}`)
    }

    const dhisRes = await dhis2Fetch(
      `/api/trackedEntityInstances.json?${params.toString()}`,
      credentials
    )

    if (!dhisRes.ok) {
      // If the filter failed (e.g. attribute not in this program), retry without filter and filter client side
      if (query && dhisRes.status === 400) {
        params.delete("filter")
        const fallbackRes = await dhis2Fetch(
          `/api/trackedEntityInstances.json?${params.toString()}`,
          credentials
        )
        if (!fallbackRes.ok) {
          const err = await fallbackRes.text()
          return NextResponse.json({ ok: false, error: err }, { status: fallbackRes.status })
        }
        const fallbackData = await fallbackRes.json()
        const teis = (fallbackData.trackedEntityInstances || []) as RawTEI[]
        const filtered = teis.filter((tei) => {
          const attrs = tei.attributes || []
          return attrs.some((a) => a.value.toLowerCase().includes(query.toLowerCase()))
        })
        return NextResponse.json({
          ok: true,
          total: filtered.length,
          page: 1,
          pageSize: Number(pageSize),
          cases: formatTeis(filtered),
        })
      }

      const errText = await dhisRes.text()
      return NextResponse.json(
        { ok: false, error: `DHIS2 error ${dhisRes.status}: ${errText.slice(0, 300)}` },
        { status: dhisRes.status }
      )
    }

    const data = await dhisRes.json()
    const rawTeis = (data.trackedEntityInstances || []) as RawTEI[]
    const cases = formatTeis(rawTeis)

    return NextResponse.json({
      ok: true,
      total: data.pager?.total ?? cases.length,
      page: data.pager?.page ?? 1,
      pageSize: data.pager?.pageSize ?? Number(pageSize),
      pageCount: data.pager?.pageCount ?? 1,
      cases,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error fetching cases"
    return NextResponse.json(
      { ok: false, error: `Failed to fetch cases: ${message}` },
      { status: 500 }
    )
  }
}

function formatTeis(rawTeis: RawTEI[]) {
  return rawTeis.map((tei) => {
    const attrs = tei.attributes || []

    // Find UUIC
    let uuic = ""
    for (const id of UUIC_ATTRIBUTE_IDS) {
      const match = attrs.find((a) => a.attribute === id)
      if (match?.value) {
        uuic = match.value
        break
      }
    }
    if (!uuic) {
      // Check display name containing UUIC
      const uuicAttr = attrs.find((a) => a.displayName?.toLowerCase().includes("uuic"))
      if (uuicAttr?.value) uuic = uuicAttr.value
    }

    const fieldValues: Record<string, string> = {}
    for (const a of attrs) {
      const mappedKey = ATTR_MAP[a.attribute]
      if (mappedKey) {
        fieldValues[mappedKey] = a.value
      }
    }

    const firstName = fieldValues.firstName || ""
    const lastName = fieldValues.lastName || ""
    const fullName = [lastName, firstName].filter(Boolean).join(" ") || "Unknown"
    const dob = fieldValues.dob || ""
    const age = calculateAge(dob)

    return {
      id: tei.trackedEntityInstance,
      uuic: uuic || `ID-${tei.trackedEntityInstance.slice(0, 8)}`,
      fullName,
      lastName,
      firstName,
      gender: fieldValues.gender || "Unknown",
      dob,
      age,
      kpType: fieldValues.kpType || "General",
      riskLevel: fieldValues.riskLevel || "Standard",
      hotspotName: fieldValues.hotspotName || "—",
      province: fieldValues.province || "—",
      district: fieldValues.district || "—",
      commune: fieldValues.commune || "—",
      orgUnit: tei.orgUnit,
      created: tei.created,
      lastUpdated: tei.lastUpdated,
      rawAttributes: attrs,
    }
  })
}
