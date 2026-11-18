import mysql from "mysql2/promise"
import { decodeValue, VCCT_RISK_LABELS_KH } from "@/lib/clinicalDictionary"

// Singleton MySQL Connection Pool for NCHADS MPI (main_dbs)
let pool: mysql.Pool | null = null
let currentPoolKey = ""

export function loadEnvFallback() {
  try {
    const fs = require("fs")
    const path = require("path")
    const candidatePaths = [
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), "..", ".env.local"),
      "d:/B/cbs/.env.local",
      "d:/B/.env.local",
    ]
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8")
        content.split("\n").forEach((line: string) => {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith("#")) {
            const eqIdx = trimmed.indexOf("=")
            if (eqIdx > 0) {
              const k = trimmed.substring(0, eqIdx).trim()
              const v = trimmed.substring(eqIdx + 1).trim()
              if (k) {
                process.env[k] = v
              }
            }
          }
        })
        break
      }
    }
  } catch { }
}

export function getMySqlPool(): mysql.Pool {
  loadEnvFallback()

  const host = process.env.MYSQL_HOST || "127.0.0.1"
  const port = Number(process.env.MYSQL_PORT) || 3306
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || ""
  const database = process.env.MYSQL_DATABASE || "main_dbs"
  const key = `${host}:${port}:${user}:${database}:${password}`

  if (!pool || currentPoolKey !== key) {
    if (pool) {
      try {
        pool.end()
      } catch { }
    }
    currentPoolKey = key
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    })
  }
  return pool
}

export interface VcctRecord {
  vcct_id: number
  uuic: string
  pmrs_code: string
  hts_code: string
  registration_date: string | null
  post_counseling_date: string | null
  site_code: string
  site_name?: string
  od_name?: string
  sex?: number
  sex_label?: string
  dob?: string | null
  age?: number | null
  phone_number?: string
  idpoor?: string
  combo_result: number
  hiv_result: number
  vl_result: number
  rtri_result_id?: number
  rtri_result_kh?: string
  rita_result?: number
  hiv_result_kh?: string
  refer_service_name?: string
  refer_from_name?: string
  occupation_name?: string
  patient_type_name?: string
  province_kh?: string
  district_kh?: string
  commune_kh?: string
  counselor_id?: number
  risks?: string[]
  line_tests?: {
    line_control?: number
    line_positive?: number
    line_longterm?: number
    cambo_ag?: number
    cambo_ab?: number
  } | null
  retests?: Array<{
    result: number
    result_kh: string
    test_date: string | null
    age?: number
  }>
}

export interface ArtStatusInfo {
  statusText: string
  statusType: "active" | "dead" | "transferred" | "lost" | "suspended"
  badgeColor: string
  cause: string | null
  date: string | null
  place?: string | null
}

export interface ArtPrescribedDrug {
  DrugName: string
  Dose: string
  Freq: string
  Form: string
  Quantity: number | null
  Status: number
  StatusText: string
  Da: string | null
  Reason: string | null
}

export interface ArtVisit {
  DatVisit: string | null
  TypeVisit: number
  TypeVisitText: string
  Weight: number | null
  Height: number | null
  Blood: string | null
  Temp?: number | null
  Pulse?: number | null
  ARTAdher: string | null
  ARVreg: number | null
  ARVregLabel?: string
  DaApp: string | null
  WHO?: number | null
  WHOLabel?: string
  Function?: number | null
  FunctionLabel?: string
  TB?: number | null
  VLDetectable?: number | null
  Vid?: string | number | null
}

export interface ArtLabTest {
  Dat: string | null
  CD4: string | number | null
  CD?: string | null
  CD8?: string | null
  HIVLoad: string | number | null
  HIVLog: string | number | null
  HCV: string | null
  HBsAg: number | string | null
  HGB?: string | null
  Creatinine?: string | null
}

export interface ArtPatientProfile {
  ClinicID: string | number
  site_code: string
  site_name?: string
  od_name?: string
  isChild?: boolean
  patientTypeLabel?: string
  Codes?: string
  Typecode?: string
  DaART: string | null
  DaHIV: string | null
  DafirstVisit: string | null
  Artnum: string
  Sex: number
  SexLabel: string
  DaBirth: string | null
  Age: number | null
  Targroup: number
  Education?: number
  EducationLabel?: string
  Referred?: number
  ReferredLabel?: string
  Orefferred?: string
  TbPast?: number
  TbPastLabel?: string
  Tbtreat?: number
  TbtreatLabel?: string
  TypeTB?: number
  TypeTBLabel?: string
  TPT?: number
  TPTLabel?: string
  TPTdrug?: number
  DaStartTPT?: string | null
  DaEndTPT?: string | null
  ARVTreatHis?: number
  ARVTreatHisLabel?: string
  Allergy?: number
  AllergyLabel?: string
  Feeding?: number
  FeedingLabel?: string
  demographics?: {
    phone?: string
    village?: string
    commune?: string
    district?: string
    province?: string
    marital?: number
    maritalLabel?: string
    occupation?: string
  }
  regimens: Array<{ ART: string; DaArt: string | null }>
  status: ArtStatusInfo
  drugs: ArtPrescribedDrug[]
  tptDrugs: ArtPrescribedDrug[]
  tbDrugs: ArtPrescribedDrug[]
  oiDrugs: ArtPrescribedDrug[]
  visits: ArtVisit[]
  tests: ArtLabTest[]
  allergies: Array<{ DrugName: string; Allergy: number; AllergyLabel: string; Da: string | null }>
  arvTreatHistory: Array<{ DrugName: string; Clinic: string; DaStart: string | null; DaStop: string | null; Note: string }>
  family: Array<{ Faminily: string; Age: number; HIVstatus: string; StartARV: string }>
}

export interface CombinedClientProfile {
  uuic: string
  pmrs: string
  artnum?: string
  vcctId?: string | number
  foundInVcct: boolean
  foundInArt: boolean
  vcct: VcctRecord[]
  art: ArtPatientProfile[]
}

/** Format MySQL dates safely to YYYY-MM-DD */
export function formatSqlDate(val: any): string | null {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    if (d.getFullYear() <= 1900) return null
    return d.toISOString().split("T")[0]
  } catch {
    return null
  }
}

export function calculateAge(dobStr?: string | null): number | null {
  if (!dobStr) return null
  try {
    const dob = new Date(dobStr)
    if (isNaN(dob.getTime())) return null
    const diffMs = Date.now() - dob.getTime()
    const ageDt = new Date(diffMs)
    return Math.abs(ageDt.getUTCFullYear() - 1970)
  } catch {
    return null
  }
}

export function formatTypeVisit(type?: number): string {
  switch (type) {
    case 0:
      return "មកដំបូង"
    case 1:
      return "មុនពេលណាត់"
    case 2:
      return "ទាន់ពេល / ធម្មតា"
    case 3:
      return "យឺត / លើសណាត់"
    default:
      return "—"
  }
}

export function formatDrugStatus(status?: number): string {
  switch (status) {
    case 0:
    case 1:
      return "ចាប់ផ្តើម"
    case 2:
      return "បន្ត"
    case 3:
      return "ប្តូរថ្នាំ"
    case 4:
      return "បញ្ឈប់"
    default:
      return "បន្ត"
  }
}

export function resolvePatientStatus(statusRow?: any): ArtStatusInfo {
  if (!statusRow) {
    return {
      statusText: "កំពុងទទួលការព្យាបាល ART (Active)",
      statusType: "active",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      cause: null,
      date: null,
      place: null,
    }
  }

  const s = statusRow.Status
  const date = formatSqlDate(statusRow.Da)
  const cause = (statusRow.Cause || statusRow.OPlace || "").trim()
  const place = decodeValue("Place", statusRow.Place)

  if (s === 1) {
    return {
      statusText: "ស្លាប់ (Dead)",
      statusType: "dead",
      badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      cause: cause ? `មូលហេតុ៖ ${cause}` : null,
      date,
      place: place !== "—" ? place : null,
    }
  }
  if (s === 3) {
    return {
      statusText: "ផ្ទេរចេញ (Transferred Out)",
      statusType: "transferred",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      cause: cause ? `ផ្ទេរទៅ៖ ${cause}` : null,
      date,
      place: place !== "—" ? place : null,
    }
  }
  if (s === 0) {
    return {
      statusText: "បាត់បង់ការតាមដាន (Lost to Follow-up)",
      statusType: "lost",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
      cause: cause ? `មូលហេតុ៖ ${cause}` : null,
      date,
      place: place !== "—" ? place : null,
    }
  }
  if (s === 2) {
    return {
      statusText: "ផ្អាកការព្យាបាល (Suspended)",
      statusType: "suspended",
      badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      cause: cause ? `មូលហេតុ៖ ${cause}` : null,
      date,
      place: place !== "—" ? place : null,
    }
  }

  return {
    statusText: "កំពុងទទួលការព្យាបាល ART (Active)",
    statusType: "active",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    cause: null,
    date,
    place: null,
  }
}

/** Lookup complete VCCT & ART profile for a client */
export async function getClientProfileByCodes(params: {
  uuic?: string
  pmrs?: string
  hts?: string
  artnum?: string
  vcctId?: string | number
  clinicId?: string | number
  siteCode?: string
}): Promise<CombinedClientProfile> {
  const p = getMySqlPool()

  const uuic = (params.uuic || "").trim()
  const pmrs = (params.pmrs || "").trim()
  const hts = (params.hts || "").trim()
  const artnum = (params.artnum || "").trim()
  const vcctId = params.vcctId ? String(params.vcctId).trim() : ""
  const clinicId = params.clinicId ? String(params.clinicId).trim() : ""
  const siteCode = (params.siteCode || "").trim()

  const result: CombinedClientProfile = {
    uuic,
    pmrs,
    artnum,
    vcctId,
    foundInVcct: false,
    foundInArt: false,
    vcct: [],
    art: [],
  }

  if (!uuic && !pmrs && !hts && !artnum && !vcctId && !clinicId) {
    return result
  }

  // 1. Fetch VCCT records with full lookups, risks, line tests & retests
  try {
    const conditions: string[] = []
    const sqlParams: any[] = []

    if (uuic) {
      conditions.push("v.uuic = ?")
      sqlParams.push(uuic)
    }

    if (pmrs) {
      conditions.push("v.pmrs_code = ?")
      sqlParams.push(pmrs)
    }

    if (!uuic && !pmrs) {
      if (siteCode && vcctId) {
        conditions.push("(v.site_code = ? AND v.vcct_id = ?)")
        sqlParams.push(siteCode, vcctId)
      } else if (vcctId) {
        conditions.push("v.vcct_id = ?")
        sqlParams.push(vcctId)
      }
      if (hts) {
        conditions.push("v.hts_code = ?")
        sqlParams.push(hts)
      }
    }

    if (conditions.length > 0) {
      const whereClause = conditions.join(" OR ")
      const [vcctRows] = await p.query<any[]>(
        `
        SELECT 
          v.vcct_id, v.site_code, v.uuic, v.pmrs_code, v.hts_code, v.registration_date,
          v.sex, v.dob, v.phone_number, v.idpoor, v.combo_result, v.hiv_result, v.vl_result,
          v.rtri_result_id, v.rita_result, v.post_counseling_date, v.counselor_id,
          s.site_name, s.od_name,
          pt.type_kh as patient_type_name,
          r.service_kh as refer_service_name,
          rf.refer_name as refer_from_name,
          occ.occupation as occupation_name,
          prov.province_kh, dist.district_kh, comm.commune_kh
        FROM vccts v
        LEFT JOIN tblsites s ON s.vcct_site_code = v.site_code
        LEFT JOIN vcct_patient_types pt ON pt.id = v.patient_type_id
        LEFT JOIN vcct_refer_to_services r ON r.id = v.refer_to_service_id
        LEFT JOIN vcct_refer_froms rf ON rf.id = v.refer_from_id
        LEFT JOIN occupations occ ON occ.id = v.occupation_id
        LEFT JOIN tblprovince prov ON prov.id = v.province_id
        LEFT JOIN tbldistrict dist ON dist.id = v.district_id
        LEFT JOIN tblcommune comm ON comm.id = v.commune_id
        WHERE ${whereClause}
        ORDER BY v.registration_date DESC
        LIMIT 20
      `,
        sqlParams
      )

      if (vcctRows && vcctRows.length > 0) {
        for (const row of vcctRows) {
          const vSite = row.site_code
          const vId = row.vcct_id

          // Fetch risks
          const activeRisks: string[] = []
          try {
            const [riskRows] = await p.query<any[]>(
              `SELECT * FROM vcct_risks WHERE site_code = ? AND vcct_id = ? LIMIT 1`,
              [vSite, vId]
            )
            if (riskRows && riskRows[0]) {
              const r = riskRows[0]
              for (let i = 1; i <= 18; i++) {
                if (r[`risk${i}`] === 1 && VCCT_RISK_LABELS_KH[i]) {
                  activeRisks.push(VCCT_RISK_LABELS_KH[i])
                }
              }
            }
          } catch { }

          // Fetch line tests
          let lineTests: any = null
          try {
            const [lineRows] = await p.query<any[]>(
              `SELECT line_control, line_positive, line_longterm, cambo_ag, cambo_ab FROM vcct_line_test_results WHERE site_code = ? AND vcct_id = ? LIMIT 1`,
              [vSite, vId]
            )
            if (lineRows && lineRows[0]) {
              lineTests = lineRows[0]
            }
          } catch { }

          // Fetch retests
          let retests: any[] = []
          try {
            const [retestRows] = await p.query<any[]>(
              `SELECT result, test_date, age FROM vcct_retests WHERE site_code = ? AND vcct_id = ? ORDER BY test_date DESC LIMIT 5`,
              [vSite, vId]
            )
            retests = (retestRows || []).map((rt) => ({
              result: rt.result ?? 0,
              result_kh: rt.result === 1 ? "អវិជ្ជមាន" : rt.result === 2 ? "វិជ្ជមាន" : "មិនច្បាស់លាស់",
              test_date: formatSqlDate(rt.test_date),
              age: rt.age ?? undefined,
            }))
          } catch { }

          const dobStr = formatSqlDate(row.dob)

          result.vcct.push({
            vcct_id: row.vcct_id,
            uuic: row.uuic || "",
            pmrs_code: row.pmrs_code || "",
            hts_code: row.hts_code || "",
            registration_date: formatSqlDate(row.registration_date),
            post_counseling_date: formatSqlDate(row.post_counseling_date),
            site_code: row.site_code || "",
            site_name: row.site_name || row.site_code || "មិនស្គាល់",
            od_name: row.od_name || "",
            sex: row.sex,
            sex_label: decodeValue("Sex", row.sex),
            dob: dobStr,
            age: calculateAge(dobStr),
            phone_number: row.phone_number || "",
            idpoor: row.idpoor || "",
            combo_result: row.combo_result ?? 0,
            hiv_result: row.hiv_result ?? 0,
            vl_result: row.vl_result ?? 0,
            rtri_result_id: row.rtri_result_id ?? 0,
            rtri_result_kh:
              row.rtri_result_id === 1 ? "Recent" : row.rtri_result_id === 2 ? "Long-term" : undefined,
            rita_result: row.rita_result ?? 0,
            hiv_result_kh:
              row.hiv_result === 1
                ? "អវិជ្ជមាន"
                : row.hiv_result === 2
                  ? "វិជ្ជមាន"
                  : row.hiv_result === 3
                    ? "មិនច្បាស់លាស់"
                    : "មិនបានធ្វើ",
            refer_service_name: row.refer_service_name || "",
            refer_from_name: row.refer_from_name || "",
            occupation_name: row.occupation_name || "",
            patient_type_name: row.patient_type_name || "",
            province_kh: row.province_kh || "",
            district_kh: row.district_kh || "",
            commune_kh: row.commune_kh || "",
            counselor_id: row.counselor_id || undefined,
            risks: activeRisks,
            line_tests: lineTests,
            retests,
          })
        }

        if (result.vcct.length > 0) {
          result.foundInVcct = true
        }
      }
    }
  } catch (err) {
    console.error("Error querying VCCT from MySQL:", err)
  }

  // 2. Fetch ART profiles (Adult and Pediatric) with all related tables
  const candidateCodes = new Set<string>()
  if (pmrs) candidateCodes.add(pmrs)
  if (uuic) candidateCodes.add(uuic)
  for (const v of result.vcct) {
    if (v.pmrs_code) candidateCodes.add(v.pmrs_code)
  }

  const codesList = Array.from(candidateCodes).filter(Boolean)

  if (codesList.length > 0 || artnum || (siteCode && clinicId)) {
    try {
      // 2.1 Adult Admissions (tblaimain)
      let adultWhere = ""
      const adultParams: any[] = []

      if (artnum) {
        if (codesList.length > 0) {
          const placeholders = codesList.map(() => "?").join(", ")
          adultWhere = `(a.Artnum = ? OR l.Codes IN (${placeholders}))`
          adultParams.push(artnum, ...codesList)
        } else {
          adultWhere = `a.Artnum = ?`
          adultParams.push(artnum)
        }
      } else if (codesList.length > 0) {
        const placeholders = codesList.map(() => "?").join(", ")
        adultWhere = `l.Codes IN (${placeholders})`
        adultParams.push(...codesList)
      } else if (siteCode && clinicId) {
        adultWhere = `(a.site_code = ? AND a.ClinicID = ?)`
        adultParams.push(siteCode, clinicId)
      }

      const [adultLinks] = await p.query<any[]>(
        `
        SELECT 
          a.ClinicID, a.site_code, l.Codes, l.Typecode,
          a.DaART, a.DaHIV, a.DafirstVisit, a.Artnum, a.Sex, a.DaBirth, a.Targroup,
          a.Education, a.Referred, a.Orefferred, a.TbPast, a.Tbtreat, a.TypeTB,
          a.TPT, a.TPTdrug, a.DaStartTPT, a.DaEndTPT, a.ARVTreatHis, a.Allergy,
          s.site_name, s.od_name, 0 as isChild
        FROM tblaimain a
        LEFT JOIN tblalink l ON (l.site_code = a.site_code AND l.ClinicID = a.ClinicID)
        LEFT JOIN tblsites s ON s.art_site_code COLLATE utf8mb3_general_ci = a.site_code
        WHERE ${adultWhere}
        ORDER BY a.DaART DESC
        LIMIT 10
      `,
        adultParams
      )

      // 2.2 Pediatric / Child Admissions (tblcimain)
      let childWhere = ""
      const childParams: any[] = []

      if (artnum) {
        if (codesList.length > 0) {
          const placeholders = codesList.map(() => "?").join(", ")
          childWhere = `(c.Artnum = ? OR l.Codes IN (${placeholders}))`
          childParams.push(artnum, ...codesList)
        } else {
          childWhere = `c.Artnum = ?`
          childParams.push(artnum)
        }
      } else if (codesList.length > 0) {
        const placeholders = codesList.map(() => "?").join(", ")
        childWhere = `l.Codes IN (${placeholders})`
        childParams.push(...codesList)
      } else if (siteCode && clinicId) {
        childWhere = `(c.site_code = ? AND c.ClinicID = ?)`
        childParams.push(siteCode, clinicId)
      }

      const [childLinks] = await p.query<any[]>(
        `
        SELECT 
          c.ClinicID, c.site_code, l.Codes, l.Typecode,
          c.DaART, NULL as DaHIV, c.DaFirstVisit as DafirstVisit, c.Artnum, c.Sex, c.DaBirth, 0 as Targroup,
          NULL as Education, c.Referred, NULL as Orefferred, c.TbPast, c.Tbtreat, c.TypeTB,
          NULL as TPT, c.TPTdrug, c.DaStartTPT, c.DaEndTPT, NULL as ARVTreatHis, NULL as Allergy,
          c.Feeding,
          s.site_name, s.od_name, 1 as isChild
        FROM tblcimain c
        LEFT JOIN tblclink l ON (l.site_code = c.site_code AND l.ClinicID = c.ClinicID)
        LEFT JOIN tblsites s ON s.art_site_code COLLATE utf8mb3_general_ci = c.site_code
        WHERE ${childWhere}
        ORDER BY c.DaART DESC
        LIMIT 10
      `,
        childParams
      )

      const allAdmissions = [...(adultLinks || []), ...(childLinks || [])]

      if (allAdmissions.length > 0) {
        result.foundInArt = true

        // Deduplicate enrollments by (site_code, ClinicID)
        const clinicMap = new Map<string, any>()
        for (const link of allAdmissions) {
          const key = `${link.site_code}-${link.ClinicID}`
          if (!clinicMap.has(key)) {
            clinicMap.set(key, { ...link, allCodes: [] })
          }
          if (link.Codes) {
            clinicMap.get(key).allCodes.push({ code: link.Codes, type: link.Typecode || "" })
          }
        }

        // For each unique clinic enrollment, fetch complete clinical data
        for (const link of Array.from(clinicMap.values())) {
          const siteCode = link.site_code
          const clinicId = link.ClinicID
          const isChild = Boolean(link.isChild)

          // 1. Status (tblavpatientstatus / tblcvpatientstatus)
          const statusTable = isChild ? "tblcvpatientstatus" : "tblavpatientstatus"
          let statusInfo: ArtStatusInfo = {
            statusText: "កំពុងទទួលការព្យាបាល ART (Active)",
            statusType: "active",
            badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            cause: null,
            date: null,
          }
          try {
            const [statusRows] = await p.query<any[]>(
              `SELECT Status, Place, OPlace, Da, Cause FROM ${statusTable} WHERE site_code = ? AND ClinicID = ? ORDER BY Da DESC LIMIT 1`,
              [siteCode, clinicId]
            )
            statusInfo = resolvePatientStatus(statusRows?.[0])
          } catch { }

          // 2. Demographics & Contact (tblaumain / tblcumain)
          let demographics: any = undefined
          try {
            const demoTable = isChild ? "tblcumain" : "tblaumain"
            const [demoRows] = await p.query<any[]>(
              `SELECT * FROM ${demoTable} WHERE site_code = ? AND ClinicID = ? ORDER BY Daupdate DESC LIMIT 1`,
              [siteCode, clinicId]
            )
            if (demoRows && demoRows[0]) {
              const dm = demoRows[0]
              demographics = {
                phone: dm.Phone || dm.Phone1 || "",
                village: dm.Village || "",
                commune: dm.Commune || "",
                district: dm.District || "",
                province: dm.Province || "",
                marital: dm.Marital ?? undefined,
                maritalLabel: decodeValue("Marital", dm.Marital),
                occupation: dm.Occupation || "",
              }
            }
          } catch { }

          // 3. Regimens history (tblaart / tblcart)
          let regimens: Array<{ ART: string; DaArt: string | null }> = []
          try {
            const regTable = isChild ? "tblcart" : "tblaart"
            const [regRows] = await p.query<any[]>(
              `SELECT ART, DaArt FROM ${regTable} WHERE site_code = ? AND ClinicID = ? ORDER BY DaArt DESC LIMIT 10`,
              [siteCode, clinicId]
            )
            regimens = (regRows || []).map((r) => ({
              ART: r.ART ? String(r.ART).trim() : "",
              DaArt: formatSqlDate(r.DaArt),
            }))
          } catch { }

          // 4. Clinical Visits (tblavmain / tblcvmain)
          let visits: any[] = []
          if (isChild) {
            const [vRows] = await p.query<any[]>(
              `
              SELECT Vid, ClinicID, ARTnum, DatVisit, TypeVisit, Weight, Height, Temp, Pulse, Blood, WHO, PTB, Treatfail, DaApp
              FROM tblcvmain
              WHERE site_code = ? AND ClinicID = ?
              ORDER BY DatVisit DESC
              LIMIT 20
            `,
              [siteCode, clinicId]
            )
            visits = vRows || []
          } else {
            const [vRows] = await p.query<any[]>(
              `
              SELECT Vid, ClinicID, ARTnum, DatVisit, TypeVisit, Weight, Height, Temp, Pulse, Blood, WHO, TB, ARVreg, ARTAdher, \`Function\`, VLDetectable, DaApp
              FROM tblavmain
              WHERE site_code = ? AND ClinicID = ?
              ORDER BY DatVisit DESC
              LIMIT 20
            `,
              [siteCode, clinicId]
            )
            visits = vRows || []
          }

          // 5. Prescribed ARV Drugs (tblavarvdrug / tblcvarvdrug)
          let arvDrugs: any[] = []
          try {
            if (isChild) {
              const [dRows] = await p.query<any[]>(
                `
                SELECT DISTINCT
                  d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM (
                  SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                  FROM tblcvmain v
                  INNER JOIN tblcvarvdrug d ON d.Vid = v.Vid AND d.site_code = v.site_code
                  WHERE v.site_code = ? AND v.ClinicID = ?
                  UNION
                  SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                  FROM tblcvarvdrug d
                  WHERE d.site_code = ? AND (d.id = ? OR d.Vid LIKE CONCAT(?, '%'))
                ) d
                ORDER BY d.Da DESC, d.DrugName ASC
                LIMIT 100
              `,
                [siteCode, clinicId, siteCode, clinicId, clinicId]
              )
              arvDrugs = dRows || []
            } else {
              const [dRows] = await p.query<any[]>(
                `
                SELECT DISTINCT
                  d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM (
                  SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                  FROM tblavmain v
                  INNER JOIN tblavarvdrug d ON d.Vid = v.Vid AND d.site_code = v.site_code
                  WHERE v.site_code = ? AND v.ClinicID = ?
                  UNION
                  SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                  FROM tblavarvdrug d
                  WHERE d.site_code = ? AND d.id = ?
                ) d
                ORDER BY d.Da DESC, d.DrugName ASC
                LIMIT 100
              `,
                [siteCode, clinicId, siteCode, clinicId]
              )
              arvDrugs = dRows || []
            }
          } catch (e) {
            console.error("Error querying ARV drugs:", e)
          }

          // 6. TPT Drugs (tblavtptdrug / tblcvtptdrug)
          let tptDrugs: any[] = []
          try {
            const tptTable = isChild ? "tblcvtptdrug" : "tblavtptdrug"
            const mainTable = isChild ? "tblcvmain" : "tblavmain"
            const [tptRows] = await p.query<any[]>(
              `
              SELECT DISTINCT
                d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
              FROM (
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${mainTable} v
                INNER JOIN ${tptTable} d ON d.Vid = v.Vid AND d.site_code = v.site_code
                WHERE v.site_code = ? AND v.ClinicID = ?
                UNION
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${tptTable} d
                WHERE d.site_code = ? AND d.id = ?
              ) d
              ORDER BY d.Da DESC, d.DrugName ASC
              LIMIT 50
            `,
              [siteCode, clinicId, siteCode, clinicId]
            )
            tptDrugs = tptRows || []
          } catch (e) {
            console.error("Error querying TPT drugs:", e)
          }

          // 7. TB Drugs (tblavtbdrug / tblcvtbdrug)
          let tbDrugs: any[] = []
          try {
            const tbTable = isChild ? "tblcvtbdrug" : "tblavtbdrug"
            const mainTable = isChild ? "tblcvmain" : "tblavmain"
            const [tbRows] = await p.query<any[]>(
              `
              SELECT DISTINCT
                d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
              FROM (
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${mainTable} v
                INNER JOIN ${tbTable} d ON d.Vid = v.Vid AND d.site_code = v.site_code
                WHERE v.site_code = ? AND v.ClinicID = ?
                UNION
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${tbTable} d
                WHERE d.site_code = ? AND d.id = ?
              ) d
              ORDER BY d.Da DESC, d.DrugName ASC
              LIMIT 50
            `,
              [siteCode, clinicId, siteCode, clinicId]
            )
            tbDrugs = tbRows || []
          } catch (e) {
            console.error("Error querying TB drugs:", e)
          }

          // 8. OI Drugs (tblavoidrug / tblcvoidrug)
          let oiDrugs: any[] = []
          try {
            const oiTable = isChild ? "tblcvoidrug" : "tblavoidrug"
            const mainTable = isChild ? "tblcvmain" : "tblavmain"
            const [oiRows] = await p.query<any[]>(
              `
              SELECT DISTINCT
                d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
              FROM (
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${mainTable} v
                INNER JOIN ${oiTable} d ON d.Vid = v.Vid AND d.site_code = v.site_code
                WHERE v.site_code = ? AND v.ClinicID = ?
                UNION
                SELECT d.DrugName, d.Dose, d.Quantity, d.Freq, d.Form, d.Status, d.Da, d.Reason, d.Vid
                FROM ${oiTable} d
                WHERE d.site_code = ? AND d.id = ?
              ) d
              ORDER BY d.Da DESC, d.DrugName ASC
              LIMIT 50
            `,
              [siteCode, clinicId, siteCode, clinicId]
            )
            oiDrugs = oiRows || []
          } catch (e) {
            console.error("Error querying OI drugs:", e)
          }

          // 9. Lab Tests (tblpatienttest)
          let tests: any[] = []
          try {
            const [testRows] = await p.query<any[]>(
              `
              SELECT Dat, CD4, CD, CD8, HIVLoad, HIVLog, HCV, HBsAg, HGB, Creatinine
              FROM tblpatienttest
              WHERE site_code = ? AND ClinicID = ?
              ORDER BY Dat DESC
              LIMIT 20
            `,
              [siteCode, String(clinicId)]
            )
            tests = testRows || []
          } catch { }

          // 10. Allergies (tblaiallergy / tblciallergy)
          let allergies: any[] = []
          try {
            const allTable = isChild ? "tblciallergy" : "tblaiallergy"
            const [allRows] = await p.query<any[]>(
              `SELECT DrugName, Allergy, Da FROM ${allTable} WHERE site_code = ? AND ClinicID = ? ORDER BY Da DESC LIMIT 10`,
              [siteCode, clinicId]
            )
            allergies = (allRows || []).map((al) => ({
              DrugName: al.DrugName || "",
              Allergy: al.Allergy ?? 0,
              AllergyLabel: decodeValue("Allergy", al.Allergy),
              Da: formatSqlDate(al.Da),
            }))
          } catch { }

          // 11. Prior ARV Treatment History (tblaiarvtreathis)
          let arvTreatHistory: any[] = []
          try {
            if (!isChild) {
              const [hisRows] = await p.query<any[]>(
                `SELECT DrugName, Clinic, DaStart, DaStop, Note FROM tblaiarvtreathis WHERE site_code = ? AND ClinicID = ? ORDER BY DaStart DESC LIMIT 10`,
                [siteCode, clinicId]
              )
              arvTreatHistory = (hisRows || []).map((h) => ({
                DrugName: h.DrugName || "",
                Clinic: h.Clinic || "",
                DaStart: formatSqlDate(h.DaStart),
                DaStop: formatSqlDate(h.DaStop),
                Note: h.Note || "",
              }))
            }
          } catch { }

          // 12. Family History for child (tblcifamily)
          let family: any[] = []
          try {
            if (isChild) {
              const [famRows] = await p.query<any[]>(
                `SELECT Faminily, Age, HIVstatus, StartARV FROM tblcifamily WHERE site_code = ? AND ClinicID = ? LIMIT 10`,
                [siteCode, clinicId]
              )
              family = (famRows || []).map((f) => ({
                Faminily: decodeValue("Faminily", f.Faminily),
                Age: f.Age ?? 0,
                HIVstatus: decodeValue("HIVstatus", f.HIVstatus),
                StartARV: decodeValue("StartARV", f.StartARV),
              }))
            }
          } catch { }

          const mergedCodes =
            link.allCodes?.length > 0
              ? link.allCodes.map((c: any) => (c.type ? `${c.code} (${c.type})` : c.code)).join(", ")
              : link.Codes || ""

          const dobStr = formatSqlDate(link.DaBirth)

          result.art.push({
            ClinicID: clinicId,
            site_code: siteCode,
            site_name: link.site_name || siteCode || "មិនស្គាល់",
            od_name: link.od_name || "",
            isChild,
            patientTypeLabel: isChild ? "កុមារ" : "មនុស្សពេញវ័យ",
            Codes: mergedCodes,
            Typecode: link.Typecode || "",
            DaART: formatSqlDate(link.DaART),
            DaHIV: formatSqlDate(link.DaHIV),
            DafirstVisit: formatSqlDate(link.DafirstVisit),
            Artnum: link.Artnum || "",
            Sex: link.Sex ?? 0,
            SexLabel: decodeValue("Sex", link.Sex),
            DaBirth: dobStr,
            Age: calculateAge(dobStr),
            Targroup: link.Targroup ?? 0,
            Education: link.Education ?? undefined,
            EducationLabel: decodeValue("Education", link.Education),
            Referred: link.Referred ?? undefined,
            ReferredLabel: decodeValue("Referred", link.Referred),
            Orefferred: link.Orefferred || undefined,
            TbPast: link.TbPast ?? undefined,
            TbPastLabel: decodeValue("TbPast", link.TbPast),
            Tbtreat: link.Tbtreat ?? undefined,
            TbtreatLabel: decodeValue("Tbtreat", link.Tbtreat),
            TypeTB: link.TypeTB ?? undefined,
            TypeTBLabel: decodeValue("TypeTB", link.TypeTB),
            TPT: link.TPT ?? undefined,
            TPTLabel: decodeValue("TPT", link.TPT),
            TPTdrug: link.TPTdrug ?? undefined,
            DaStartTPT: formatSqlDate(link.DaStartTPT),
            DaEndTPT: formatSqlDate(link.DaEndTPT),
            ARVTreatHis: link.ARVTreatHis ?? undefined,
            ARVTreatHisLabel: decodeValue("ARVTreatHis", link.ARVTreatHis),
            Allergy: link.Allergy ?? undefined,
            AllergyLabel: decodeValue("Allergy", link.Allergy),
            Feeding: link.Feeding ?? undefined,
            FeedingLabel: decodeValue("Feeding", link.Feeding),
            demographics,
            regimens,
            status: statusInfo,
            drugs: (arvDrugs || []).map((d) => ({
              DrugName: d.DrugName ? String(d.DrugName).trim() : "",
              Dose: d.Dose ? String(d.Dose).trim() : "",
              Freq: d.Freq ? String(d.Freq).trim() : "",
              Form: d.Form ? String(d.Form).trim() : "",
              Quantity: d.Quantity ?? null,
              Status: d.Status ?? 2,
              StatusText: formatDrugStatus(d.Status),
              Da: formatSqlDate(d.Da),
              Reason: d.Reason ? String(d.Reason).trim() : null,
            })),
            tptDrugs: (tptDrugs || []).map((d) => ({
              DrugName: d.DrugName ? String(d.DrugName).trim() : "",
              Dose: d.Dose ? String(d.Dose).trim() : "",
              Freq: d.Freq ? String(d.Freq).trim() : "",
              Form: d.Form ? String(d.Form).trim() : "",
              Quantity: d.Quantity ?? null,
              Status: d.Status ?? 2,
              StatusText: formatDrugStatus(d.Status),
              Da: formatSqlDate(d.Da),
              Reason: d.Reason ? String(d.Reason).trim() : null,
            })),
            tbDrugs: (tbDrugs || []).map((d) => ({
              DrugName: d.DrugName ? String(d.DrugName).trim() : "",
              Dose: d.Dose ? String(d.Dose).trim() : "",
              Freq: d.Freq ? String(d.Freq).trim() : "",
              Form: d.Form ? String(d.Form).trim() : "",
              Quantity: d.Quantity ?? null,
              Status: d.Status ?? 2,
              StatusText: formatDrugStatus(d.Status),
              Da: formatSqlDate(d.Da),
              Reason: d.Reason ? String(d.Reason).trim() : null,
            })),
            oiDrugs: (oiDrugs || []).map((d) => ({
              DrugName: d.DrugName ? String(d.DrugName).trim() : "",
              Dose: d.Dose ? String(d.Dose).trim() : "",
              Freq: d.Freq ? String(d.Freq).trim() : "",
              Form: d.Form ? String(d.Form).trim() : "",
              Quantity: d.Quantity ?? null,
              Status: d.Status ?? 2,
              StatusText: formatDrugStatus(d.Status),
              Da: formatSqlDate(d.Da),
              Reason: d.Reason ? String(d.Reason).trim() : null,
            })),
            visits: (visits || []).map((v) => ({
              DatVisit: formatSqlDate(v.DatVisit),
              TypeVisit: v.TypeVisit ?? 0,
              TypeVisitText: formatTypeVisit(v.TypeVisit),
              Weight: v.Weight ?? null,
              Height: v.Height ?? null,
              Blood: v.Blood || null,
              Temp: v.Temp ?? null,
              Pulse: v.Pulse ?? null,
              ARTAdher: v.ARTAdher || null,
              ARVreg: v.ARVreg ?? null,
              ARVregLabel: decodeValue("ARVreg", v.ARVreg),
              DaApp: formatSqlDate(v.DaApp),
              WHO: v.WHO ?? null,
              WHOLabel: decodeValue("WHO", v.WHO),
              Function: v.Function ?? null,
              FunctionLabel: decodeValue(isChild ? "Function_child" : "Function", v.Function),
              TB: v.TB ?? null,
              VLDetectable: v.VLDetectable ?? null,
              Vid: v.Vid ?? null,
            })),
            tests: (tests || []).map((t) => ({
              Dat: formatSqlDate(t.Dat),
              CD4: t.CD4 !== "" ? t.CD4 : null,
              CD: t.CD !== "" ? t.CD : null,
              CD8: t.CD8 !== "" ? t.CD8 : null,
              HIVLoad: t.HIVLoad !== "" ? t.HIVLoad : null,
              HIVLog: t.HIVLog !== "" ? t.HIVLog : null,
              HCV: t.HCV || null,
              HBsAg: t.HBsAg !== -1 ? t.HBsAg : null,
              HGB: t.HGB || null,
              Creatinine: t.Creatinine || null,
            })),
            allergies,
            arvTreatHistory,
            family,
          })
        }
      }
    } catch (err) {
      console.error("Error querying ART from MySQL:", err)
    }
  }

  return result
}
