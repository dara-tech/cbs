import { NextRequest, NextResponse } from "next/server"
import { getClientProfileByCodes } from "@/lib/mysqlClient"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uuic = searchParams.get("uuic") || ""
    const pmrs = searchParams.get("pmrs") || ""
    const hts = searchParams.get("hts") || ""
    const artnum = searchParams.get("artnum") || ""
    const vcctId = searchParams.get("vcctId") || ""
    const siteCode = searchParams.get("siteCode") || ""
    const clinicId = searchParams.get("clinicId") || ""

    if (!uuic && !pmrs && !hts && !artnum && !vcctId && !clinicId) {
      return NextResponse.json(
        { ok: false, error: "សូមផ្តល់លេខកូដ UUIC, លេខកូដ VCCT, ឬ ART Number ដើម្បីស្វែងរក" },
        { status: 400 }
      )
    }

    const profile = await getClientProfileByCodes({ uuic, pmrs, hts, artnum, vcctId, siteCode, clinicId })
    return NextResponse.json({ ok: true, data: profile })
  } catch (error: any) {
    console.error("API /api/mysql/profile error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch profile from MySQL" },
      { status: 500 }
    )
  }
}
