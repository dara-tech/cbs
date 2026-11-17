import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ ok: true, status: "dhis2-connect-api-ready" })
}

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, username, password } = await req.json()

    if (!serverUrl || !username || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing server URL, username, or password" },
        { status: 400 }
      )
    }

    const cleanBase = serverUrl.replace(/\/$/, "").trim()
    const basicAuth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`

    // Verify credentials with DHIS2 /api/me
    const dhisRes = await fetch(`${cleanBase}/api/me?fields=id,username,displayName,organisationUnits[id,name]`, {
      method: "GET",
      headers: {
        Authorization: basicAuth,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!dhisRes.ok) {
      if (dhisRes.status === 401 || dhisRes.status === 403) {
        return NextResponse.json(
          { ok: false, error: "Invalid username or password for DHIS2 instance" },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { ok: false, error: `DHIS2 responded with HTTP ${dhisRes.status}` },
        { status: dhisRes.status }
      )
    }

    const userData = await dhisRes.json()

    // Create JSON response
    const response = NextResponse.json({
      ok: true,
      user: {
        id: userData.id,
        username: userData.username,
        displayName: userData.displayName || userData.username,
        organisationUnits: userData.organisationUnits || [],
      },
      serverUrl: cleanBase,
    })

    // Set HTTP session cookies for subsequent API route calls
    response.cookies.set("cbs_dhis2_server", cleanBase, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    })
    response.cookies.set("cbs_dhis2_auth", basicAuth, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    })
    response.cookies.set("cbs_dhis2_user", username, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    })

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error connecting to server"
    return NextResponse.json(
      { ok: false, error: `Connection failed: ${message}` },
      { status: 500 }
    )
  }
}
