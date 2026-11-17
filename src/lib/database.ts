// ─── CBS Multi-Connection Architecture ────────────────────────────────────────
//
//  1. ART & VCCT: Shared MySQL Database
//     - Host, Port (3306), Database name, MySQL user, password
//
//  2. NPD: National Prevention Database — DHIS2 Instance
//     - DHIS2 Server / API URL (e.g. https://npd.nchads.gov.kh)
//     - DHIS2 user credentials

export type ConnectionKind = "MYSQL" | "DHIS2"
export type ProgramType = "ART" | "VCCT" | "ART_VCCT" | "NPD" | string

export interface DbConnection {
  id: string
  name: string
  kind: ConnectionKind
  program: ProgramType
  programs: string[]
  // DHIS2 instance specific
  serverUrl?: string
  // MySQL specific
  host?: string
  port?: number
  dbName?: string
  username: string
  createdAt: string
  lastConnected?: string
  color: string
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
  password: string
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
    const res = await fetch("/api/mysql/records?type=vcct&pageSize=1")
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to connect to MySQL" }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "MySQL connection failed" }
  }
}
