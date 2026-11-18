// ─── CBS Multi-Connection Architecture ────────────────────────────────────────
//
//  1. ART & VCCT: Shared MySQL Database
//     - Host, Port (3306), Database name, MySQL user, password
//
//  2. NPD: National Prevention Database — DHIS2 Instance
//     - DHIS2 Server / API URL (e.g. https://npd.nchads.gov.kh)
//     - DHIS2 user credentials
//
//  3. CBS DUAL: Connects BOTH MySQL (ART & VCCT) and DHIS2 (NPD) simultaneously.

export type ConnectionKind = "MYSQL" | "DHIS2" | "DUAL"
export type ProgramType = "ART" | "VCCT" | "ART_VCCT" | "NPD" | "CBS_DUAL" | string

export interface DbConnection {
  id: string
  name: string
  kind: ConnectionKind
  program: ProgramType
  programs: string[]
  // DHIS2 instance specific
  serverUrl?: string
  dhis2Username?: string
  dhis2User?: { id: string; username: string; displayName: string }
  // MySQL specific
  host?: string
  port?: number
  dbName?: string
  username: string
  mysqlUsername?: string
  createdAt: string
  lastConnected?: string
  color: string
  // Dual connection active view
  activeView?: "NPD" | "CLINICAL"
  mysqlStatus?: "connected" | "error"
  dhis2Status?: "connected" | "error"
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

const ACTIVE_KEY = "cbs-active-connection"
const SAVED_KEY = "cbs-connections"

export function getActiveConnection(): DbConnection | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_KEY)
    return raw ? (JSON.parse(raw) as DbConnection) : null
  } catch {
    return null
  }
}

export function setActiveConnection(conn: DbConnection) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(conn))
}

export function clearActiveConnection() {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(ACTIVE_KEY)
}

export function getSavedConnections(): DbConnection[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_KEY)
    return raw ? (JSON.parse(raw) as DbConnection[]) : []
  } catch {
    return []
  }
}

export function saveConnection(conn: DbConnection) {
  const list = getSavedConnections().filter((c) => c.id !== conn.id)
  list.unshift({ ...conn, lastConnected: new Date().toISOString() })
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 20)))
}

export function deleteConnection(id: string) {
  const list = getSavedConnections().filter((c) => c.id !== id)
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(list))
}

// ─── Connection test helpers ───────────────────────────────────────────────────

function cleanUrl(url: string) {
  return url.replace(/\/$/, "").trim()
}

/** Test DHIS2 Web API Instance via Next.js Server API route (bypasses browser CORS) */
export async function testDhis2Connection(
  serverUrl: string,
  username: string,
  password?: string
): Promise<{ ok: boolean; error?: string; user?: { id: string; username: string; displayName: string } }> {
  const base = cleanUrl(serverUrl)
  if (!base) return { ok: false, error: "DHIS2 Server URL is required" }
  if (!username) return { ok: false, error: "DHIS2 Username is required" }
  if (!password) return { ok: false, error: "DHIS2 Password is required" }

  try {
    const res = await fetch("/api/dhis2/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverUrl: base, username, password }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to authenticate with DHIS2" }
    }

    return { ok: true, user: data.user }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed"
    return { ok: false, error: message }
  }
}

/** Test MySQL Database Connection */
export async function testMySqlConnection(
  host: string,
  port: number,
  dbName: string,
  username: string,
  password?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!host) return { ok: false, error: "MySQL Host is required" }
  if (!username) return { ok: false, error: "MySQL Username is required" }
  if (!dbName) return { ok: false, error: "Database name is required" }

  try {
    // 1. Try dedicated MySQL connect route
    const res = await fetch("/api/mysql/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port, dbName, username, password }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to connect to MySQL" }
    }
    return { ok: true }
  } catch {
    // Fallback probe
    try {
      const fb = await fetch("/api/mysql/records?type=vcct&pageSize=1")
      const fbData = await fb.json()
      if (fb.ok && fbData.ok) return { ok: true }
      return { ok: false, error: fbData.error || "MySQL connection failed" }
    } catch (fbErr: any) {
      return { ok: false, error: fbErr.message || "MySQL connection failed" }
    }
  }
}

export interface DualTestResult {
  ok: boolean
  mysqlOk: boolean
  dhis2Ok: boolean
  mysqlError?: string
  dhis2Error?: string
  error?: string
  dhis2User?: { id: string; username: string; displayName: string }
}

/** Test BOTH MySQL and DHIS2 simultaneously — both must succeed to login */
export async function testDualConnection(params: {
  mysql: { host: string; port: number; dbName: string; username: string; password?: string }
  dhis2: { serverUrl: string; username: string; password?: string }
}): Promise<DualTestResult> {
  const [mysqlRes, dhis2Res] = await Promise.all([
    testMySqlConnection(
      params.mysql.host,
      params.mysql.port,
      params.mysql.dbName,
      params.mysql.username,
      params.mysql.password
    ),
    testDhis2Connection(
      params.dhis2.serverUrl,
      params.dhis2.username,
      params.dhis2.password
    ),
  ])

  const mysqlOk = mysqlRes.ok
  const dhis2Ok = dhis2Res.ok
  const bothOk = mysqlOk && dhis2Ok

  let combinedError = ""
  if (!mysqlOk && !dhis2Ok) {
    combinedError = `បរាជ័យទាំងពីរ (Both systems failed):\n• MySQL: ${mysqlRes.error}\n• DHIS2: ${dhis2Res.error}`
  } else if (!mysqlOk) {
    combinedError = `MySQL បរាជ័យ (MySQL failed): ${mysqlRes.error}. Both systems are required to log in.`
  } else if (!dhis2Ok) {
    combinedError = `DHIS2 NPD បរាជ័យ (DHIS2 failed): ${dhis2Res.error}. Both systems are required to log in.`
  }

  return {
    ok: bothOk,
    mysqlOk,
    dhis2Ok,
    mysqlError: mysqlRes.error,
    dhis2Error: dhis2Res.error,
    error: combinedError || undefined,
    dhis2User: dhis2Res.user,
  }
}
