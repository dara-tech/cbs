import { NextRequest, NextResponse } from "next/server"
import { getMySqlPool, formatSqlDate } from "@/lib/mysqlClient"

export const dynamic = "force-dynamic"

function parsePeriodRange(period?: string): { start?: string; end?: string } {
  if (!period || period === "ALL") return {}
  if (period.startsWith("CUSTOM:")) {
    const parts = period.split(":")
    return { start: parts[1], end: parts[2] }
  }
  // Quarter e.g. 2026Q1
  const qMatch = period.match(/^(\d{4})Q([1-4])$/)
  if (qMatch) {
    const year = qMatch[1]
    const q = parseInt(qMatch[2], 10)
    const ranges = [
      { start: `${year}-01-01`, end: `${year}-03-31` },
      { start: `${year}-04-01`, end: `${year}-06-30` },
      { start: `${year}-07-01`, end: `${year}-09-30` },
      { start: `${year}-10-01`, end: `${year}-12-31` },
    ]
    return ranges[q - 1] || {}
  }
  // Month e.g. 202601
  const mMatch = period.match(/^(\d{4})(\d{2})$/)
  if (mMatch) {
    const year = parseInt(mMatch[1], 10)
    const month = parseInt(mMatch[2], 10)
    const lastDay = new Date(year, month, 0).getDate()
    return {
      start: `${year}-${String(month).padStart(2, "0")}-01`,
      end: `${year}-${String(month).padStart(2, "0")}-${lastDay}`,
    }
  }
  // Year e.g. 2026
  const yMatch = period.match(/^(\d{4})$/)
  if (yMatch) {
    return { start: `${yMatch[1]}-01-01`, end: `${yMatch[1]}-12-31` }
  }
  return {}
}

function decodeTargetGroup(tg?: number): string {
  switch (tg) {
    case 1:
      return "ស្ត្រីបម្រើសេវាកម្សាន្ត (FEW)"
    case 2:
      return "បុរសស្រឡាញ់បុរស (MSM)"
    case 3:
      return "មនុស្សប្តូរភេទ (TG)"
    case 4:
      return "អ្នកប្រើប្រាស់គ្រឿងញៀន (PWUD)"
    case 5:
      return "អ្នកចាក់គ្រឿងញៀន (PWID)"
    case 6:
      return "ប្រជាជនទូទៅ (GP)"
    case 7:
      return "MEW"
    case 8:
      return "PPW"
    default:
      return "—"
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get("type") || "vcct").toLowerCase() // "vcct", "art", or "all"
    const search = (searchParams.get("search") || "").trim()
    const orgUnitId = searchParams.get("orgUnitId") || ""
    const period = searchParams.get("period") || ""
    const kp = (searchParams.get("kp") || "ALL").toUpperCase()
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") || "20", 10)))
    const offset = (page - 1) * pageSize

    const pool = getMySqlPool()
    const periodRange = parsePeriodRange(period)

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. VCCT Query Builder
    // ─────────────────────────────────────────────────────────────────────────────
    const getVcctData = async (limitCount: number, offsetCount: number) => {
      let whereClause = "1=1"
      const params: any[] = []

      if (search) {
        whereClause += " AND (v.uuic LIKE ? OR CAST(v.vcct_id AS CHAR) LIKE ? OR v.pmrs_code LIKE ? OR v.hts_code LIKE ? OR v.phone_number LIKE ?)"
        const pattern = `%${search}%`
        params.push(pattern, pattern, pattern, pattern, pattern)
      }

      if (orgUnitId && orgUnitId !== "cambodia_root") {
        if (orgUnitId.startsWith("prov_")) {
          const provId = parseInt(orgUnitId.replace("prov_", ""), 10)
          whereClause += " AND s.province_id = ?"
          params.push(provId)
        } else if (orgUnitId.startsWith("od_")) {
          const odCode = orgUnitId.replace("od_", "")
          whereClause += " AND s.od_code = ?"
          params.push(odCode)
        } else if (orgUnitId.startsWith("site_")) {
          const siteId = parseInt(orgUnitId.replace("site_", ""), 10)
          whereClause += " AND s.id = ?"
          params.push(siteId)
        } else {
          whereClause += " AND (v.site_code = ? OR s.vcct_site_code = ?)"
          params.push(orgUnitId, orgUnitId)
        }
      }

      if (periodRange.start && periodRange.end) {
        whereClause += " AND v.registration_date >= ? AND v.registration_date <= ?"
        params.push(`${periodRange.start} 00:00:00`, `${periodRange.end} 23:59:59`)
      }

      if (kp !== "ALL") {
        const kpMap: Record<string, number> = {
          FEW: 1,
          MSM: 2,
          TG: 3,
          PWUD: 4,
          PWID: 5,
          GP: 6,
          MEW: 7,
          PPW: 8,
        }
        if (kpMap[kp]) {
          whereClause += " AND v.patient_type_id = ?"
          params.push(kpMap[kp])
        }
      }

      const [countResult] = await pool.query<any[]>(
        `SELECT COUNT(*) as total FROM vccts v LEFT JOIN tblsites s ON s.vcct_site_code = v.site_code WHERE ${whereClause}`,
        params
      )
      const total = countResult[0]?.total || 0

      const [rows] = await pool.query<any[]>(
        `
        SELECT 
          v.vcct_id, v.uuic, v.pmrs_code, v.hts_code, 
          v.registration_date, v.post_counseling_date, 
          v.site_code, v.combo_result, v.hiv_result, v.vl_result,
          v.phone_number, v.idpoor, v.sex, v.dob,
          s.site_name, s.od_name,
          r.service_kh as refer_service_name,
          pt.type_kh as patient_type_name
        FROM vccts v
        LEFT JOIN tblsites s ON s.vcct_site_code = v.site_code
        LEFT JOIN vcct_refer_to_services r ON r.id = v.refer_to_service_id
        LEFT JOIN vcct_patient_types pt ON pt.id = v.patient_type_id
        WHERE ${whereClause}
        ORDER BY v.registration_date DESC
        LIMIT ? OFFSET ?
      `,
        [...params, limitCount, offsetCount]
      )

      const formatted = (rows || []).map((row) => ({
        program: "vcct" as const,
        uniqueKey: `vcct-${row.site_code}-${row.vcct_id}`,
        vcct_id: row.vcct_id,
        uuic: row.uuic || "",
        pmrs_code: row.pmrs_code || "",
        hts_code: row.hts_code || "",
        registration_date: formatSqlDate(row.registration_date),
        post_counseling_date: formatSqlDate(row.post_counseling_date),
        site_code: row.site_code,
        site_name: row.site_name || row.site_code,
        od_name: row.od_name || "",
        combo_result: row.combo_result,
        hiv_result: row.hiv_result,
        vl_result: row.vl_result,
        hiv_result_kh:
          row.hiv_result === 1
            ? "អវិជ្ជមាន"
            : row.hiv_result === 2
            ? "វិជ្ជមាន"
            : row.hiv_result === 3
            ? "មិនច្បាស់លាស់"
            : "មិនបានធ្វើ",
        refer_service_name: row.refer_service_name || "",
        patient_type_name: row.patient_type_name || "",
        phone_number: row.phone_number || "",
        sex: row.sex === 1 ? "ប្រុស" : row.sex === 2 ? "ស្រី" : "មិនបានបញ្ជាក់",
        dob: formatSqlDate(row.dob),
      }))

      return { total, rows: formatted }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. ART Query Builder
    // ─────────────────────────────────────────────────────────────────────────────
    const getArtData = async (limitCount: number, offsetCount: number) => {
      let whereClause = "1=1"
      const params: any[] = []

      if (search) {
        whereClause += " AND (a.Artnum LIKE ? OR CAST(a.ClinicID AS CHAR) LIKE ? OR l.Codes LIKE ?)"
        const pattern = `%${search}%`
        params.push(pattern, pattern, pattern)
      }

      if (orgUnitId && orgUnitId !== "cambodia_root") {
        if (orgUnitId.startsWith("prov_")) {
          const provId = parseInt(orgUnitId.replace("prov_", ""), 10)
          whereClause += " AND s.province_id = ?"
          params.push(provId)
        } else if (orgUnitId.startsWith("od_")) {
          const odCode = orgUnitId.replace("od_", "")
          whereClause += " AND s.od_code = ?"
          params.push(odCode)
        } else if (orgUnitId.startsWith("site_")) {
          const siteId = parseInt(orgUnitId.replace("site_", ""), 10)
          whereClause += " AND s.id = ?"
          params.push(siteId)
        } else {
          whereClause += " AND (a.site_code = ? OR s.art_site_code = ?)"
          params.push(orgUnitId, orgUnitId)
        }
      }

      if (periodRange.start && periodRange.end) {
        whereClause += " AND a.DaART >= ? AND a.DaART <= ?"
        params.push(`${periodRange.start} 00:00:00`, `${periodRange.end} 23:59:59`)
      }

      if (kp !== "ALL") {
        const kpMap: Record<string, number> = {
          FEW: 1,
          MSM: 2,
          TG: 3,
          PWUD: 4,
          PWID: 5,
          GP: 6,
          MEW: 7,
          PPW: 8,
        }
        if (kpMap[kp]) {
          whereClause += " AND a.Targroup = ?"
          params.push(kpMap[kp])
        }
      }

      const [countResult] = await pool.query<any[]>(
        `
        SELECT COUNT(DISTINCT a.site_code, a.ClinicID) as total
        FROM tblaimain a
        LEFT JOIN tblalink l ON (l.site_code = a.site_code AND l.ClinicID = a.ClinicID)
        LEFT JOIN tblsites s ON s.art_site_code COLLATE utf8mb3_general_ci = a.site_code
        WHERE ${whereClause}
      `,
        params
      )
      const total = countResult[0]?.total || 0

      const [rows] = await pool.query<any[]>(
        `
        SELECT 
          a.site_code, a.ClinicID, a.Artnum, a.DaART, a.DaHIV, a.DafirstVisit,
          a.Sex, a.DaBirth, a.Targroup,
          l.Codes, l.Typecode,
          s.site_name, s.od_name
        FROM tblaimain a
        LEFT JOIN tblalink l ON (l.site_code = a.site_code AND l.ClinicID = a.ClinicID)
        LEFT JOIN tblsites s ON s.art_site_code COLLATE utf8mb3_general_ci = a.site_code
        WHERE ${whereClause}
        ORDER BY a.DaART DESC
        LIMIT ? OFFSET ?
      `,
        [...params, limitCount, offsetCount]
      )

      const formatted = (rows || []).map((row) => ({
        program: "art" as const,
        uniqueKey: `art-${row.site_code}-${row.ClinicID}`,
        ClinicID: row.ClinicID,
        Artnum: row.Artnum || "",
        uuic: row.Codes || "",
        pmrs_code: row.Codes || "",
        hts_code: "",
        registration_date: formatSqlDate(row.DaART || row.DafirstVisit),
        site_code: row.site_code,
        site_name: row.site_name || row.site_code,
        od_name: row.od_name || "",
        combo_result: null,
        hiv_result: 2,
        vl_result: null,
        hiv_result_kh: "ព្យាបាល ART",
        patient_type_name: decodeTargetGroup(row.Targroup),
        phone_number: "",
        sex: row.Sex === 1 ? "ប្រុស" : row.Sex === 2 ? "ស្រី" : "មិនបានបញ្ជាក់",
        dob: formatSqlDate(row.DaBirth),
        Codes: row.Codes || "",
        Typecode: row.Typecode || "",
        DaART: formatSqlDate(row.DaART),
        DaHIV: formatSqlDate(row.DaHIV),
        DafirstVisit: formatSqlDate(row.DafirstVisit),
      }))

      return { total, rows: formatted }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Execution based on requested Program Type
    // ─────────────────────────────────────────────────────────────────────────────
    if (type === "vcct") {
      const { total, rows } = await getVcctData(pageSize, offset)
      return NextResponse.json({
        ok: true,
        type: "vcct",
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        data: rows,
      })
    } else if (type === "art") {
      const { total, rows } = await getArtData(pageSize, offset)
      return NextResponse.json({
        ok: true,
        type: "art",
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        data: rows,
      })
    } else {
      // ── Type: "all" (Cross-Program Search & Listing) ──
      // When searching across programs, fetch matches from both and merge sorted by date
      const fetchCap = search ? 50 : pageSize
      const [vcctRes, artRes] = await Promise.all([
        getVcctData(fetchCap, search ? 0 : offset),
        getArtData(fetchCap, search ? 0 : offset),
      ])

      const total = vcctRes.total + artRes.total
      const combined = [...vcctRes.rows, ...artRes.rows]

      // Sort combined records by date descending
      combined.sort((a, b) => {
        const da = a.registration_date || ""
        const db = b.registration_date || ""
        return db.localeCompare(da)
      })

      const paginatedData = search ? combined.slice(offset, offset + pageSize) : combined.slice(0, pageSize)

      return NextResponse.json({
        ok: true,
        type: "all",
        total,
        vcctTotal: vcctRes.total,
        artTotal: artRes.total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        data: paginatedData,
      })
    }
  } catch (error: any) {
    console.error("API /api/mysql/records error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to query records from MySQL" },
      { status: 500 }
    )
  }
}
