import { NextRequest } from "next/server"

export interface Dhis2Credentials {
  serverUrl: string
  authHeader: string // "Basic <base64>"
  username?: string
}

const DEFAULT_SERVER = process.env.DHIS2_SERVER_URL || "https://npd.nchads.gov.kh"
const DEFAULT_USER = process.env.DHIS2_USERNAME || "sovandara"
const DEFAULT_PASS = process.env.DHIS2_PASSWORD || "Mpi@2023"

/**
 * Resolves DHIS2 connection credentials from cookies, headers, query params, or default env
 */
export function resolveDhis2Credentials(req?: NextRequest): Dhis2Credentials {
  let serverUrl = DEFAULT_SERVER
  let authHeader = `Basic ${Buffer.from(`${DEFAULT_USER}:${DEFAULT_PASS}`).toString("base64")}`
  let username = DEFAULT_USER

  if (req) {
    // 1. Check HTTP-only cookies
    const cookieServer = req.cookies.get("cbs_dhis2_server")?.value
    const cookieAuth = req.cookies.get("cbs_dhis2_auth")?.value
    const cookieUser = req.cookies.get("cbs_dhis2_user")?.value

    if (cookieServer) serverUrl = cookieServer
    if (cookieAuth) authHeader = cookieAuth.startsWith("Basic ") ? cookieAuth : `Basic ${cookieAuth}`
    if (cookieUser) username = cookieUser

    // 2. Check custom headers
    const headerServer = req.headers.get("x-dhis2-server")
    const headerAuth = req.headers.get("x-dhis2-auth") || req.headers.get("authorization")

    if (headerServer) serverUrl = headerServer
    if (headerAuth) authHeader = headerAuth.startsWith("Basic ") ? headerAuth : `Basic ${headerAuth}`

    // 3. Check query parameters
    const { searchParams } = new URL(req.url)
    const paramServer = searchParams.get("serverUrl")
    const paramUser = searchParams.get("username")
    const paramPass = searchParams.get("password")
    const paramAuth = searchParams.get("auth")

    if (paramServer) serverUrl = paramServer
    if (paramAuth) {
      authHeader = paramAuth.startsWith("Basic ") ? paramAuth : `Basic ${paramAuth}`
    } else if (paramUser && paramPass) {
      authHeader = `Basic ${Buffer.from(`${paramUser}:${paramPass}`).toString("base64")}`
      username = paramUser
    }
  }

  return {
    serverUrl: serverUrl.replace(/\/$/, "").trim(),
    authHeader,
    username,
  }
}

/**
 * Fetch from DHIS2 instance using resolved credentials
 */
export async function dhis2Fetch(
  endpoint: string,
  credentials: Dhis2Credentials,
  init?: RequestInit
): Promise<Response> {
  const url = `${credentials.serverUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  const headers = new Headers(init?.headers)
  headers.set("Authorization", credentials.authHeader)
  headers.set("Accept", "application/json")

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })
}
