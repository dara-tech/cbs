import { NextRequest, NextResponse } from "next/server"
import mysql from "mysql2/promise"
import { loadEnvFallback } from "@/lib/mysqlClient"

export const dynamic = "force-dynamic"

export async function GET() {
  loadEnvFallback()
  const host = process.env.MYSQL_HOST || "127.0.0.1"
  const port = Number(process.env.MYSQL_PORT) || 3306
  const user = process.env.MYSQL_USER || "root"
  const database = process.env.MYSQL_DATABASE || "main_dbs"
  const password = process.env.MYSQL_PASSWORD || ""

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 5000,
    })
    await conn.query("SELECT 1")
    await conn.end()

    return NextResponse.json({
      ok: true,
      connected: true,
      source: "env",
      config: {
        host,
        port,
        database,
        user,
      },
    })
  } catch (err: any) {
    let userMsg = err?.message || "Failed to connect to MySQL"
    if (err?.code === "ER_ACCESS_DENIED_ERROR") {
      userMsg = `Access denied for user '${user}' at ${host}. Check MYSQL_USER/MYSQL_PASSWORD in .env.local.`
    } else if (err?.code === "ECONNREFUSED") {
      userMsg = `Connection refused at ${host}:${port}. MySQL server may be down or firewall blocked.`
    } else if (err?.code === "ENOTFOUND") {
      userMsg = `Cannot resolve host '${host}'. Check internet connection or VPN.`
    } else if (err?.code === "ETIMEDOUT") {
      userMsg = `Connection timed out connecting to ${host}:${port}.`
    }
    return NextResponse.json({
      ok: false,
      connected: false,
      source: "env",
      error: userMsg,
      code: err?.code,
      config: {
        host,
        port,
        database,
        user,
      },
    })
  }
}

export async function POST(req: NextRequest) {
  loadEnvFallback()

  let host = process.env.MYSQL_HOST || "127.0.0.1"
  let port = Number(process.env.MYSQL_PORT) || 3306
  let user = process.env.MYSQL_USER || "root"
  let password = process.env.MYSQL_PASSWORD || ""
  let database = process.env.MYSQL_DATABASE || "main_dbs"

  try {
    const body = await req.json().catch(() => ({}))
    // If body provides custom overrides and env is missing them, allow fallback
    if (body.host && !process.env.MYSQL_HOST) host = body.host.trim()
    if (body.port && !process.env.MYSQL_PORT) port = Number(body.port)
    if (body.username && !process.env.MYSQL_USER) user = body.username.trim()
    if (body.password && !process.env.MYSQL_PASSWORD) password = body.password
    if (body.dbName && !process.env.MYSQL_DATABASE) database = body.dbName.trim()

    // Test direct connection
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 5000,
    })

    await conn.query("SELECT 1")
    await conn.end()

    const res = NextResponse.json({
      ok: true,
      message: "MySQL connected successfully from .env",
      source: "env",
      config: { host, port, database, user },
    })

    // Store in cookie for session persistence
    res.cookies.set("cbs_mysql_host", host, { path: "/", httpOnly: true, sameSite: "lax" })
    res.cookies.set("cbs_mysql_db", database, { path: "/", httpOnly: true, sameSite: "lax" })
    res.cookies.set("cbs_mysql_user", user, { path: "/", httpOnly: true, sameSite: "lax" })

    return res
  } catch (err: any) {
    console.error("MySQL connect test failed:", err?.message)
    let userMsg = err?.message || "Failed to connect to MySQL database"
    if (err?.code === "ECONNREFUSED") {
      userMsg = `Connection refused at ${host}:${port}. Please verify MySQL host.`
    } else if (err?.code === "ER_ACCESS_DENIED_ERROR") {
      userMsg = `Access denied for user '${user}'. Verify MYSQL_USER and MYSQL_PASSWORD in .env.local.`
    } else if (err?.code === "ENOTFOUND") {
      userMsg = `Host not found: Cannot resolve "${host}". Check internet or VPN connection.`
    } else if (err?.code === "ETIMEDOUT") {
      userMsg = `Connection timed out connecting to ${host}:${port}.`
    }
    return NextResponse.json({ ok: false, error: userMsg, code: err?.code, config: { host, port, database, user } }, { status: 400 })
  }
}
