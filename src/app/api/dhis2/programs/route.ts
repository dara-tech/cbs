import { NextRequest, NextResponse } from "next/server"
import { resolveDhis2Credentials, dhis2Fetch } from "@/lib/dhis2Client"

export async function GET(req: NextRequest) {
  try {
    const credentials = resolveDhis2Credentials(req)

    const res = await dhis2Fetch(
      "/api/programs.json?fields=id,displayName,programType,selectEnrollmentDatesInFuture,selectIncidentDatesInFuture,displayIncidentDate,trackedEntityType[id,displayName],programTrackedEntityAttributes[displayInList,sortOrder,mandatory,trackedEntityAttribute[id,name,displayName,valueType]]&paging=false",
      credentials
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        {
          ok: false,
          error: `DHIS2 programs query failed with HTTP ${res.status}: ${errText.slice(0, 200)}`,
        },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      ok: true,
      serverUrl: credentials.serverUrl,
      programs: data.programs || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error fetching programs"
    return NextResponse.json(
      { ok: false, error: `Failed to fetch programs: ${message}` },
      { status: 500 }
    )
  }
}
