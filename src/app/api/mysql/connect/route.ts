import { NextRequest, NextResponse } from "next/server"
import mysql from "mysql2/promise"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ ok: true, status: "mysql-connect-api-ready" })
}

export async function POST(req: NextRequest) {
  let host = "127.0.0.1"
  try {
    const body = await req.json()
    host = (body.host || process.env.MYSQL_HOST || "127.0.0.1").trim()
    const port = Number(body.port) || Number(process.env.MYSQL_PORT) || 3306
    const user = (body.username || body.user || process.env.MYSQL_USER || "root").trim()
    const password = (body.password !== undefined && body.password !== "") ? body.password : (process.env.MYSQL_PASSWORD || "")
    const database = (body.dbName || body.database || process.env.MYSQL_DATABASE || "main_dbs").trim()

    if (!host || !user || !database) {
      return NextResponse.json(
        { ok: false, error: "Missing required MySQL host, username, or database name" },
        { status: 400 }
      )
    }

    // Attempt direct connection with 5s timeout
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
      message: "MySQL connection successful",
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
      userMsg = `Connection refused at ${err.address || "host"}:${err.port || 3306}. Please ensure MySQL is running.`
    } else if (err?.code === "ER_ACCESS_DENIED_ERROR") {
      userMsg = "Access denied: Invalid MySQL username or password."
    } else if (err?.code === "ENOTFOUND") {
      userMsg = `Host not found: Cannot resolve host "${host}". Check internet or VPN connection.`
    } else if (err?.code === "ETIMEDOUT") {
      userMsg = "Connection timed out: MySQL server did not respond within 5 seconds."
    }
    return NextResponse.json({ ok: false, error: userMsg, code: err?.code }, { status: 400 })
  }
}
