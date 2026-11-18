/**
 * CBS (Case-Based Surveillance) Patient Matching Engine
 * National Center for HIV/AIDS, Dermatology and STDs (NCHADS), Cambodia
 * 
 * Multi-Tier Identity Linkage across:
 * - NPD Surveillance (DHIS2 Tracker)
 * - VCCT (MySQL `vccts`)
 * - ART (MySQL Adult `tblaimain` / Pediatric `tblcimain` / `tblalink` / `tblclink`)
 */

// ============================================================================
// 1. DATA MODELS & ENUMS
// ============================================================================

export type PatientSourceSystem = "DHIS2" | "VCCT" | "ART"

export type CanonicalGender = "M" | "F" | "TG" | "OTHER" | "UNKNOWN"

export interface UnifiedPatientRecord {
  source: PatientSourceSystem
  recordId: string // DHIS2 TEI UID, VCCT ID, or ClinicID
  siteCode?: string
  siteName?: string
  odName?: string
  province?: string
  district?: string
  commune?: string

  // Core Identifiers
  uuic?: string | null
  pmrs?: string | null
  hts?: string | null
  nationalId?: string | null
  idpoor?: string | null
  artNum?: string | null

  // Demographics
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  sex: CanonicalGender
  dob?: string | null // ISO YYYY-MM-DD
  age?: number | null
  phone?: string | null

  // Clinical & Risk Context
  kpType?: string | null // FEW, MSM, TG, PWUD, PWID, GP, etc.
  hivResult?: "POSITIVE" | "NEGATIVE" | "INDETERMINATE" | "UNKNOWN"
  registrationDate?: string | null
  artStartDate?: string | null
  isChild?: boolean
}

export type MatchTier = "TIER_1_AUTO" | "TIER_2_MANUAL" | "TIER_3_REJECT"

export type MatchMethod =
  | "auto_deterministic"
  | "auto_probabilistic"
  | "manual_verified"
  | "manual_overridden"
  | "legacy_sync"

export type DisambiguationFlag =
  | "POTENTIAL_TWIN_OR_SIBLING"
  | "SHARED_COMMUNITY_PHONE"
  | "DUPLICATE_UUIC_COLLISION"
  | "TEMPORAL_SEQUENCE_ANOMALY"
  | "DISCORDANT_HIV_STATUS"
  | "AMBIGUOUS_MULTI_CANDIDATE"
  | "CROSS_PROVINCE_TRANSFER"
  | "TRANSLITERATION_VARIATION"
  | "INVERTED_NAME_ORDER"
  | "LUNAR_YEAR_DOB_OFFSET"

export interface FieldScoreDetail {
  score: number // 0.0 to 1.0
  weight: number // 0 to 100
  weightedScore: number
  matchType: string
  detail: string
}

/**
 * Standard Match Criteria JSON structure required by `mpi_client_links.match_criteria`
 * as defined in CBS MPI Architecture.
 */
export interface MpiMatchCriteriaPayload {
  exactUuic: boolean
  exactDob: boolean
  phoneMatch: boolean
  nameLevenshtein: number // 0.0 to 1.0 (similarity ratio)
  dobDiffDays: number // integer days difference
  fieldBreakdown: {
    uuicScore: number
    nameScore: number
    dobScore: number
    phoneScore: number
    locationScore: number
    kpConcordance: number
  }
  bonuses: string[]
  penalties: string[]
  flags: DisambiguationFlag[]
}

export interface MatchResult {
  sourceRecordId: string
  candidateRecordId: string
  sourceSystem: PatientSourceSystem
  candidateSystem: PatientSourceSystem
  overallScore: number // 0 to 100
  tier: MatchTier
  method: MatchMethod
  isAutoLinkable: boolean
  matchCriteria: MpiMatchCriteriaPayload
  explanationKh: string
  explanationEn: string
}

// Known hotline / shared community numbers in Cambodia (health lines, outreach centers)
export const SHARED_HOTLINE_NUMBERS = new Set<string>([
  "1280", "1222", "115", "023883838", "023883839", "012800122", "012800128"
])

// Dummy / Placeholder UUIC values that must NOT be matched deterministically
export const DUMMY_UUIC_PATTERNS = [
  /^0+$/,
  /^9+$/,
  /^X+$/i,
  /^UNKNOWN$/i,
  /^TEST/i,
  /^NA$/i,
  /^NONE$/i,
  /^DEFAULT$/i,
  /^N\/A$/i,
  /^123456/,
]

// ============================================================================
// 2. SYSTEM-SPECIFIC NORMALIZATION ADAPTERS
// ============================================================================

/**
 * VCCT Sex Encoding: 1 = Male, 2 = Female, -1 = Unset
 */
export function normalizeVcctSex(sex?: number | null): CanonicalGender {
  if (sex === 1) return "M"
  if (sex === 2) return "F"
  return "UNKNOWN"
}

/**
 * ART Sex Encoding (Adult tblaimain / Child tblcimain): 1 = Male, 0 = Female, -1 = Unset
 * NOTE: Critical 0 vs 2 inversion between ART and VCCT!
 */
export function normalizeArtSex(sex?: number | null): CanonicalGender {
  if (sex === 1) return "M"
  if (sex === 0) return "F"
  return "UNKNOWN"
}

/**
 * DHIS2 Sex Encoding: "Male", "Female", "TG", "Other", "1", "2"
 */
export function normalizeDhis2Sex(val?: string | null): CanonicalGender {
  if (!val) return "UNKNOWN"
  const s = val.trim().toLowerCase()
  if (s === "male" || s === "m" || s === "1" || s === "ប្រុស") return "M"
  if (s === "female" || s === "f" || s === "2" || s === "ស្រី") return "F"
  if (s === "tg" || s === "transgender" || s === "other") return "TG"
  return "UNKNOWN"
}

/**
 * Parse date strings safely to ISO YYYY-MM-DD
 */
export function normalizeIsoDate(val?: any): string | null {
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

/**
 * Calculates absolute day difference between two YYYY-MM-DD dates
 */
export function calculateDateDiffDays(d1?: string | null, d2?: string | null): number {
  if (!d1 || !d2) return 99999
  try {
    const t1 = new Date(d1).getTime()
    const t2 = new Date(d2).getTime()
    if (isNaN(t1) || isNaN(t2)) return 99999
    return Math.abs(Math.round((t1 - t2) / (1000 * 60 * 60 * 24)))
  } catch {
    return 99999
  }
}

// ============================================================================
// 3. KHMER & LATIN PHONETICS & STRING SIMILARITY UTILITIES
// ============================================================================

export class KhmerPhonetics {
  /**
   * Normalizes Khmer Unicode characters: strips zero-width spaces, diacritics duplication,
   * converts full-width spaces to standard spaces.
   */
  public static cleanKhmerText(str?: string | null): string {
    if (!str) return ""
    return str
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width spaces
      .replace(/\s+/g, " ")
      .trim()
  }

  /**
   * Standardizes Latin romanization of Khmer names to account for frequent transliteration
   * variations (French vs English phonetic spelling, silent consonants, vowel shifts).
   */
  public static normalizeRomanizedKhmer(str?: string | null): string {
    if (!str) return ""
    let s = str.toLowerCase().trim()

    // Remove punctuation, dashes, quotes
    s = s.replace(/[^a-z0-9\s]/g, "")

    // Common consonant clusters in Khmer romanization
    s = s.replace(/ph/g, "p")
    s = s.replace(/kh/g, "k")
    s = s.replace(/th/g, "t")
    s = s.replace(/ch/g, "c")
    s = s.replace(/sh/g, "s")
    s = s.replace(/gh/g, "g")
    s = s.replace(/ck/g, "k")
    s = s.replace(/qu/g, "k")

    // Word endings: Sok vs Sokh, Rath vs Roat vs Roth
    s = s.replace(/ath\b/g, "at")
    s = s.replace(/oth\b/g, "at")
    s = s.replace(/oat\b/g, "at")
    s = s.replace(/okh\b/g, "ok")
    s = s.replace(/ann\b/g, "an")
    s = s.replace(/anh\b/g, "an")
    s = s.replace(/ang\b/g, "ang")

    // Vowel equivalencies
    s = s.replace(/ea/g, "e")
    s = s.replace(/ei/g, "ey")
    s = s.replace(/ai/g, "ey")
    s = s.replace(/ay/g, "ey")
    s = s.replace(/oo/g, "u")
    s = s.replace(/ou/g, "u")
    s = s.replace(/ee/g, "i")
    s = s.replace(/y\b/g, "i")

    // Double consonants collapse
    s = s.replace(/([a-z])\1+/g, "$1")

    return s.trim()
  }

  /**
   * Generates a phonetic soundex-like key for Khmer Latin names
   */
  public static getPhoneticKey(name?: string | null): string {
    const norm = this.normalizeRomanizedKhmer(name)
    if (!norm) return ""
    const tokens = norm.split(/\s+/).filter(Boolean)
    return tokens
      .map((t) => {
        if (t.length <= 1) return t
        const first = t[0]
        const rest = t.slice(1).replace(/[aeiouwy]/g, "")
        return (first + rest).slice(0, 4)
      })
      .join("-")
  }
}

export class StringSimilarity {
  /**
   * Levenshtein Distance
   */
  public static levenshtein(a: string, b: string): number {
    const s1 = a || ""
    const s2 = b || ""
    const m = s1.length
    const n = s2.length
    if (m === 0) return n
    if (n === 0) return m

    const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) d[i][0] = i
    for (let j = 0; j <= n; j++) d[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // deletion
          d[i][j - 1] + 1, // insertion
          d[i - 1][j - 1] + cost // substitution
        )
      }
    }
    return d[m][n]
  }

  /**
   * Normalized Levenshtein similarity [0, 1]
   */
  public static levenshteinRatio(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1.0
    const dist = this.levenshtein(a, b)
    return Math.max(0, 1.0 - dist / maxLen)
  }

  /**
   * Jaro-Winkler Distance [0, 1]
   */
  public static jaroWinkler(s1: string, s2: string): number {
    if (!s1 && !s2) return 1.0
    if (!s1 || !s2) return 0.0
    if (s1 === s2) return 1.0

    const len1 = s1.length
    const len2 = s2.length
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1

    const s1Matches = new Array(len1).fill(false)
    const s2Matches = new Array(len2).fill(false)

    let matches = 0
    let transpositions = 0

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow)
      const end = Math.min(i + matchWindow + 1, len2)

      for (let j = start; j < end; j++) {
        if (s2Matches[j]) continue
        if (s1[i] !== s2[j]) continue
        s1Matches[i] = true
        s2Matches[j] = true
        matches++
        break
      }
    }

    if (matches === 0) return 0.0

    let k = 0
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue
      while (!s2Matches[k]) k++
      if (s1[i] !== s2[k]) transpositions++
      k++
    }

    const jaro =
      (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0

    // Winkler prefix bonus
    let prefix = 0
    for (let i = 0; i < Math.min(4, len1, len2); i++) {
      if (s1[i] === s2[i]) prefix++
      else break
    }

    return jaro + prefix * 0.1 * (1.0 - jaro)
  }

  /**
   * Bigram Dice coefficient
   */
  public static diceCoefficient(s1: string, s2: string): number {
    if (s1 === s2) return 1.0
    if (s1.length < 2 || s2.length < 2) return 0.0

    const getBigrams = (str: string) => {
      const bigrams = new Map<string, number>()
      for (let i = 0; i < str.length - 1; i++) {
        const bg = str.slice(i, i + 2)
        bigrams.set(bg, (bigrams.get(bg) || 0) + 1)
      }
      return bigrams
    }

    const bg1 = getBigrams(s1)
    const bg2 = getBigrams(s2)

    let intersection = 0
    bg1.forEach((count1, bg) => {
      if (bg2.has(bg)) {
        intersection += Math.min(count1, bg2.get(bg)!)
      }
    })

    const total = (s1.length - 1) + (s2.length - 1)
    return (2.0 * intersection) / total
  }
}

// ============================================================================
// 4. FIELD-LEVEL COMPARATORS
// ============================================================================

export class DobComparator {
  public static evaluate(
    dob1?: string | null,
    dob2?: string | null,
    age1?: number | null,
    age2?: number | null
  ): { score: number; matchType: string; detail: string; exactDob: boolean; diffDays: number; flag?: DisambiguationFlag } {
    const cleanDob1 = (dob1 || "").trim()
    const cleanDob2 = (dob2 || "").trim()
    const diffDays = calculateDateDiffDays(cleanDob1, cleanDob2)

    // 1. Both exact dates available
    if (cleanDob1 && cleanDob2) {
      if (cleanDob1 === cleanDob2) {
        return {
          score: 1.0,
          matchType: "EXACT_DOB",
          detail: `Exact DOB match: ${cleanDob1}`,
          exactDob: true,
          diffDays: 0,
        }
      }

      // Check for Day/Month Transposition (e.g. 1990-05-02 vs 1990-02-05)
      const parts1 = cleanDob1.split("-")
      const parts2 = cleanDob2.split("-")
      if (parts1.length === 3 && parts2.length === 3) {
        const [y1, m1, d1] = parts1
        const [y2, m2, d2] = parts2

        if (y1 === y2 && m1 === d2 && d1 === m2) {
          return {
            score: 0.95,
            matchType: "DAY_MONTH_SWAP",
            detail: `Transposed day/month in same year: ${cleanDob1} vs ${cleanDob2}`,
            exactDob: false,
            diffDays,
          }
        }

        // Defaulted Jan 1 or July 1 match (administrative estimation in Cambodia)
        const isDefaultDate1 = (m1 === "01" && d1 === "01") || (m1 === "07" && d1 === "01")
        const isDefaultDate2 = (m2 === "01" && d2 === "01") || (m2 === "07" && d2 === "01")
        if (y1 === y2 && (isDefaultDate1 || isDefaultDate2)) {
          return {
            score: 0.88,
            matchType: "YEAR_MATCH_ESTIMATED_DOB",
            detail: `Exact birth year ${y1} with administrative default date: ${cleanDob1} vs ${cleanDob2}`,
            exactDob: false,
            diffDays,
          }
        }

        const yearNum1 = parseInt(y1, 10)
        const yearNum2 = parseInt(y2, 10)
        const yearDiff = Math.abs(yearNum1 - yearNum2)

        if (yearDiff === 1) {
          return {
            score: 0.75,
            matchType: "DOB_YEAR_OFFSET_1",
            detail: `DOB off by 1 year (Khmer lunar/animal year offset): ${y1} vs ${y2}`,
            exactDob: false,
            diffDays,
            flag: "LUNAR_YEAR_DOB_OFFSET",
          }
        }

        if (yearDiff === 2) {
          return {
            score: 0.50,
            matchType: "DOB_YEAR_OFFSET_2",
            detail: `DOB off by 2 years: ${y1} vs ${y2}`,
            exactDob: false,
            diffDays,
            flag: "LUNAR_YEAR_DOB_OFFSET",
          }
        }

        if (yearDiff > 5) {
          return {
            score: 0.0,
            matchType: "DOB_INCOMPATIBLE",
            detail: `Severe birth year discrepancy (${yearDiff} years): ${y1} vs ${y2}`,
            exactDob: false,
            diffDays,
          }
        }
      }
    }

    // 2. Fallback to Age Comparison if DOB missing in one or both
    const effectiveAge1 = age1 ?? (cleanDob1 ? this.calcAge(cleanDob1) : null)
    const effectiveAge2 = age2 ?? (cleanDob2 ? this.calcAge(cleanDob2) : null)

    if (effectiveAge1 !== null && effectiveAge2 !== null) {
      const ageDiff = Math.abs(effectiveAge1 - effectiveAge2)
      if (ageDiff === 0) {
        return {
          score: 0.85,
          matchType: "EXACT_AGE_MATCH",
          detail: `Exact age match: ${effectiveAge1} years`,
          exactDob: false,
          diffDays: 0,
        }
      }
      if (ageDiff === 1) {
        return {
          score: 0.70,
          matchType: "AGE_OFFSET_1",
          detail: `Age off by 1 year: ${effectiveAge1} vs ${effectiveAge2}`,
          exactDob: false,
          diffDays: 365,
          flag: "LUNAR_YEAR_DOB_OFFSET",
        }
      }
      if (ageDiff === 2) {
        return {
          score: 0.45,
          matchType: "AGE_OFFSET_2",
          detail: `Age off by 2 years: ${effectiveAge1} vs ${effectiveAge2}`,
          exactDob: false,
          diffDays: 730,
        }
      }
      return {
        score: 0.0,
        matchType: "AGE_MISMATCH",
        detail: `Age difference too large: ${effectiveAge1} vs ${effectiveAge2}`,
        exactDob: false,
        diffDays: ageDiff * 365,
      }
    }

    return {
      score: 0.5,
      matchType: "DOB_MISSING",
      detail: "DOB/Age not documented in one or both records",
      exactDob: false,
      diffDays: 99999,
    }
  }

  private static calcAge(dobStr: string): number | null {
    try {
      const d = new Date(dobStr)
      if (isNaN(d.getTime())) return null
      const diff = Date.now() - d.getTime()
      return Math.abs(new Date(diff).getUTCFullYear() - 1970)
    } catch {
      return null
    }
  }
}

export class UuicEvaluator {
  public static isDummy(uuic?: string | null): boolean {
    if (!uuic) return true
    const clean = uuic.trim()
    if (clean.length < 5) return true
    return DUMMY_UUIC_PATTERNS.some((p) => p.test(clean))
  }

  public static evaluate(
    u1?: string | null,
    u2?: string | null
  ): { score: number; matchType: string; detail: string; exactUuic: boolean; flag?: DisambiguationFlag } {
    const s1 = (u1 || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
    const s2 = (u2 || "").toUpperCase().replace(/[^A-Z0-9]/g, "")

    if (!s1 || !s2) {
      return { score: 0.0, matchType: "UUIC_MISSING", detail: "UUIC absent in one or both records", exactUuic: false }
    }

    if (this.isDummy(s1) || this.isDummy(s2)) {
      return { score: 0.0, matchType: "DUMMY_UUIC_IGNORED", detail: "Placeholder UUIC rejected", exactUuic: false }
    }

    if (s1 === s2) {
      return { score: 1.0, matchType: "EXACT_UUIC", detail: `Exact UUIC match: ${s1}`, exactUuic: true }
    }

    // Levenshtein on standardized UUIC
    const dist = StringSimilarity.levenshtein(s1, s2)
    if (dist === 1) {
      return {
        score: 0.85,
        matchType: "UUIC_TYPO_1_CHAR",
        detail: `Single character variation in UUIC (${s1} vs ${s2})`,
        exactUuic: false,
      }
    }
    if (dist === 2) {
      return {
        score: 0.65,
        matchType: "UUIC_TYPO_2_CHAR",
        detail: `Two character variation in UUIC (${s1} vs ${s2})`,
        exactUuic: false,
      }
    }

    // Component overlap check (Demographic suffix e.g. M8804)
    if (s1.length >= 6 && s2.length >= 6) {
      const suffix1 = s1.slice(-5)
      const suffix2 = s2.slice(-5)
      if (suffix1 === suffix2) {
        return {
          score: 0.60,
          matchType: "UUIC_DEMOGRAPHIC_SUFFIX_MATCH",
          detail: `UUIC demographic suffix matches (${suffix1}) across different facility prefixes`,
          exactUuic: false,
          flag: "CROSS_PROVINCE_TRANSFER",
        }
      }
    }

    return {
      score: 0.0,
      matchType: "UUIC_MISMATCH",
      detail: `UUIC values discordant (${s1} vs ${s2})`,
      exactUuic: false,
    }
  }
}

export class NameEvaluator {
  public static evaluate(
    rec1: UnifiedPatientRecord,
    rec2: UnifiedPatientRecord
  ): { score: number; matchType: string; detail: string; levenshteinRatio: number; flag?: DisambiguationFlag } {
    const full1 = (rec1.fullName || `${rec1.lastName || ""} ${rec1.firstName || ""}`).trim()
    const full2 = (rec2.fullName || `${rec2.lastName || ""} ${rec2.firstName || ""}`).trim()

    if (!full1 || !full2) {
      return {
        score: 0.5,
        matchType: "NAME_MISSING",
        detail: "Name unrecorded in one or both systems",
        levenshteinRatio: 0.5,
      }
    }

    const levRatio = StringSimilarity.levenshteinRatio(full1.toLowerCase(), full2.toLowerCase())

    // 1. Exact string match (Khmer or Latin)
    if (full1.toLowerCase() === full2.toLowerCase()) {
      return {
        score: 1.0,
        matchType: "EXACT_NAME",
        detail: `Exact name match: "${full1}"`,
        levenshteinRatio: 1.0,
      }
    }

    // 2. Name Inversion Check: Surname First vs GivenName First
    const tokens1 = full1.split(/\s+/).filter(Boolean)
    const tokens2 = full2.split(/\s+/).filter(Boolean)
    if (tokens1.length === 2 && tokens2.length === 2) {
      if (
        tokens1[0].toLowerCase() === tokens2[1].toLowerCase() &&
        tokens1[1].toLowerCase() === tokens2[0].toLowerCase()
      ) {
        return {
          score: 0.95,
          matchType: "INVERTED_NAME_ORDER",
          detail: `Inverted surname/given name order: "${full1}" vs "${full2}"`,
          levenshteinRatio: 0.95,
          flag: "INVERTED_NAME_ORDER",
        }
      }
    }

    // 3. Khmer Script Dice & Levenshtein
    const isKhmer = /[\u1780-\u17FF]/.test(full1) || /[\u1780-\u17FF]/.test(full2)
    if (isKhmer) {
      const clean1 = KhmerPhonetics.cleanKhmerText(full1)
      const clean2 = KhmerPhonetics.cleanKhmerText(full2)
      const dice = StringSimilarity.diceCoefficient(clean1, clean2)
      const jw = StringSimilarity.jaroWinkler(clean1, clean2)
      const khmerScore = Math.max(dice, jw)

      if (khmerScore >= 0.80) {
        return {
          score: khmerScore,
          matchType: "KHMER_FUZZY_MATCH",
          detail: `Khmer orthographic similarity (${(khmerScore * 100).toFixed(1)}%): "${clean1}" vs "${clean2}"`,
          levenshteinRatio: khmerScore,
        }
      }
    }

    // 4. Romanized Phonetic & Normalized Matching
    const norm1 = KhmerPhonetics.normalizeRomanizedKhmer(full1)
    const norm2 = KhmerPhonetics.normalizeRomanizedKhmer(full2)

    if (norm1 && norm2 && norm1 === norm2) {
      return {
        score: 0.92,
        matchType: "PHONETIC_CANONICAL_MATCH",
        detail: `Khmer romanization variant match: "${full1}" ~ "${full2}" (Normalized: ${norm1})`,
        levenshteinRatio: 0.90,
        flag: "TRANSLITERATION_VARIATION",
      }
    }

    const jwScore = StringSimilarity.jaroWinkler(norm1 || full1.toLowerCase(), norm2 || full2.toLowerCase())
    if (jwScore >= 0.82) {
      return {
        score: jwScore,
        matchType: "FUZZY_NAME_JARO_WINKLER",
        detail: `Fuzzy phonetic match (${(jwScore * 100).toFixed(1)}%): "${full1}" vs "${full2}"`,
        levenshteinRatio: jwScore,
      }
    }

    return {
      score: 0.0,
      matchType: "NAME_DISCORDANT",
      detail: `Names distinct: "${full1}" vs "${full2}"`,
      levenshteinRatio: levRatio,
    }
  }
}

export class PhoneEvaluator {
  public static normalize(phone?: string | null): string {
    if (!phone) return ""
    let p = phone.replace(/[^0-9]/g, "")
    // Cambodian E.164 (+855) -> local 0
    if (p.startsWith("855")) {
      p = "0" + p.slice(3)
    }
    if (p.startsWith("00")) {
      p = p.slice(1)
    }
    return p
  }

  public static evaluate(
    phone1?: string | null,
    phone2?: string | null
  ): { score: number; matchType: string; detail: string; phoneMatch: boolean; flag?: DisambiguationFlag } {
    const p1 = this.normalize(phone1)
    const p2 = this.normalize(phone2)

    if (!p1 || !p2) {
      return { score: 0.5, matchType: "PHONE_MISSING", detail: "Phone missing in one or both records", phoneMatch: false }
    }

    // Check shared community hotline
    if (SHARED_HOTLINE_NUMBERS.has(p1) || SHARED_HOTLINE_NUMBERS.has(p2)) {
      return {
        score: 0.0,
        matchType: "SHARED_HOTLINE_PHONE",
        detail: `Phone ${p1 || p2} is an outreach hotline or clinic helpline`,
        phoneMatch: false,
        flag: "SHARED_COMMUNITY_PHONE",
      }
    }

    if (p1 === p2) {
      return { score: 1.0, matchType: "EXACT_PHONE", detail: `Exact phone match: ${p1}`, phoneMatch: true }
    }

    // Last 7 digits match (carrier switch or omitted leading zero)
    if (p1.length >= 7 && p2.length >= 7 && p1.slice(-7) === p2.slice(-7)) {
      return {
        score: 0.80,
        matchType: "PHONE_SUFFIX_MATCH",
        detail: `Phone 7-digit subscriber suffix match: ${p1} vs ${p2}`,
        phoneMatch: true,
      }
    }

    return {
      score: 0.0,
      matchType: "PHONE_MISMATCH",
      detail: `Phone numbers differ: ${p1} vs ${p2}`,
      phoneMatch: false,
    }
  }
}

export class LocationEvaluator {
  public static evaluate(
    rec1: UnifiedPatientRecord,
    rec2: UnifiedPatientRecord
  ): { score: number; matchType: string; detail: string; flag?: DisambiguationFlag } {
    // 1. Same facility
    if (rec1.siteCode && rec2.siteCode && rec1.siteCode === rec2.siteCode) {
      return {
        score: 1.0,
        matchType: "SAME_HEALTH_FACILITY",
        detail: `Same clinic site code: ${rec1.siteCode} (${rec1.siteName || ""})`,
      }
    }

    // 2. Same OD (Operational District)
    if (rec1.odName && rec2.odName && rec1.odName.toLowerCase() === rec2.odName.toLowerCase()) {
      return {
        score: 0.85,
        matchType: "SAME_OPERATIONAL_DISTRICT",
        detail: `Same OD: ${rec1.odName}`,
      }
    }

    // 3. Same Province
    const p1 = (rec1.province || "").trim().toLowerCase()
    const p2 = (rec2.province || "").trim().toLowerCase()
    if (p1 && p2 && (p1 === p2 || p1.includes(p2) || p2.includes(p1))) {
      return {
        score: 0.65,
        matchType: "SAME_PROVINCE",
        detail: `Same Province: ${rec1.province}`,
      }
    }

    if (p1 && p2 && p1 !== p2) {
      return {
        score: 0.20,
        matchType: "DIFFERENT_PROVINCE",
        detail: `Inter-provincial mobility / clinic transfer: ${rec1.province} -> ${rec2.province}`,
        flag: "CROSS_PROVINCE_TRANSFER",
      }
    }

    return {
      score: 0.50,
      matchType: "LOCATION_PARTIAL_OR_UNSPECIFIED",
      detail: "Facility/geographic location incomplete",
    }
  }
}

// ============================================================================
// 5. SCORING ENGINE & DECISION MATRIX
// ============================================================================

export interface ScoringWeights {
  uuic: number // 30
  name: number // 25
  dob: number // 20
  phone: number // 15
  location: number // 10
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  uuic: 30,
  name: 25,
  dob: 20,
  phone: 15,
  location: 10,
}

export class CBSCandidateScoringEngine {
  private weights: ScoringWeights

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights
  }

  /**
   * Main candidate scoring function between a source record and a candidate record.
   */
  public scorePair(source: UnifiedPatientRecord, candidate: UnifiedPatientRecord): MatchResult {
    const flags: DisambiguationFlag[] = []
    const penaltiesApplied: Array<{ reason: string; penalty: number }> = []
    const bonusesApplied: Array<{ reason: string; bonus: number }> = []

    // -------------------------------------------------------------------------
    // HARD REJECTION CHECK: Biological Sex Contradiction
    // -------------------------------------------------------------------------
    const isTransgender =
      source.kpType?.toUpperCase() === "TG" ||
      candidate.kpType?.toUpperCase() === "TG" ||
      source.sex === "TG" ||
      candidate.sex === "TG" ||
      source.sex === "OTHER" ||
      candidate.sex === "OTHER"

    if (!isTransgender && source.sex !== "UNKNOWN" && candidate.sex !== "UNKNOWN") {
      if (source.sex !== candidate.sex) {
        return this.createHardReject(
          source,
          candidate,
          "SEX_CONTRADICTION",
          `Biological sex mismatch (${source.sex} vs ${candidate.sex}) without TG indicator`
        )
      }
    }

    // -------------------------------------------------------------------------
    // TIER 1: DETERMINISTIC MATCH CHECKS (Instant Auto-Link >= 95%)
    // -------------------------------------------------------------------------

    // 1A. Exact National ID Match
    const natId1 = (source.nationalId || "").trim()
    const natId2 = (candidate.nationalId || "").trim()
    if (natId1 && natId2 && natId1.length >= 8 && natId1 === natId2) {
      return this.createDeterministicMatch(
        source,
        candidate,
        100,
        "auto_deterministic",
        `Exact National ID match: ${natId1}`,
        `ការផ្គូផ្គងលេខអត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរត្រឹមត្រូវ ១០០% (${natId1})`,
        true,
        true,
        true
      )
    }

    // 1B. Exact IDPoor Card Match
    const idp1 = (source.idpoor || "").trim()
    const idp2 = (candidate.idpoor || "").trim()
    if (idp1 && idp2 && idp1.length >= 6 && idp1 === idp2) {
      return this.createDeterministicMatch(
        source,
        candidate,
        99,
        "auto_deterministic",
        `Exact IDPoor equity card match: ${idp1}`,
        `ការផ្គូផ្គងប័ណ្ណសមធម៌ក្រីក្រ (IDPoor) ត្រឹមត្រូវ ៩៩% (${idp1})`,
        true,
        true,
        false
      )
    }

    // 1C. Exact PMRS Code Match
    const pmrs1 = (source.pmrs || "").trim().toUpperCase()
    const pmrs2 = (candidate.pmrs || "").trim().toUpperCase()
    if (pmrs1 && pmrs2 && pmrs1.length >= 6 && pmrs1 === pmrs2) {
      return this.createDeterministicMatch(
        source,
        candidate,
        98,
        "auto_deterministic",
        `Exact PMRS code match: ${pmrs1}`,
        `ការផ្គូផ្គងលេខកូដ PMRS ត្រឹមត្រូវ ៩៨% (${pmrs1})`,
        true,
        false,
        false
      )
    }

    // 1D. Exact HTS Code Match
    const hts1 = (source.hts || "").trim().toUpperCase()
    const hts2 = (candidate.hts || "").trim().toUpperCase()
    if (hts1 && hts2 && hts1.length >= 6 && hts1 === hts2) {
      return this.createDeterministicMatch(
        source,
        candidate,
        96,
        "auto_deterministic",
        `Exact HTS HIV testing service code match: ${hts1}`,
        `ការផ្គូផ្គងលេខកូដតេស្ត HTS ត្រឹមត្រូវ ៩៦% (${hts1})`,
        false,
        false,
        false
      )
    }

    // 1E. Exact Canonical UUIC + Consistent Demographics
    const uuicEval = UuicEvaluator.evaluate(source.uuic, candidate.uuic)
    const dobEval = DobComparator.evaluate(source.dob, candidate.dob, source.age, candidate.age)
    const nameEval = NameEvaluator.evaluate(source, candidate)
    const phoneEval = PhoneEvaluator.evaluate(source.phone, candidate.phone)
    const locEval = LocationEvaluator.evaluate(source, candidate)

    if (uuicEval.exactUuic) {
      // Guard against duplicate UUIC collision (e.g. twins or same initials in same month)
      if (nameEval.score >= 0.70 || dobEval.score >= 0.75) {
        return this.createDeterministicMatch(
          source,
          candidate,
          97,
          "auto_deterministic",
          `Exact UUIC match (${source.uuic}) confirmed by congruent name/DOB`,
          `ការផ្គូផ្គងលេខកូដសម្គាល់ UUIC ត្រឹមត្រូវ (${source.uuic}) គាំទ្រដោយទិន្នន័យឈ្មោះ/ថ្ងៃខែឆ្នាំកំណើត`,
          true,
          dobEval.exactDob,
          phoneEval.phoneMatch
        )
      } else {
        flags.push("DUPLICATE_UUIC_COLLISION")
        penaltiesApplied.push({
          reason: "Identical UUIC but discordant name/demographics (possible UUIC collision)",
          penalty: 30,
        })
      }
    }

    // 1F. Exact Phone + Sex + Exact DOB + Moderate Name match
    if (
      phoneEval.phoneMatch &&
      !phoneEval.flag &&
      dobEval.exactDob &&
      nameEval.score >= 0.50
    ) {
      return this.createDeterministicMatch(
        source,
        candidate,
        95,
        "auto_deterministic",
        `Exact phone (${PhoneEvaluator.normalize(source.phone)}) + exact DOB (${source.dob}) match`,
        `ការផ្គូផ្គងលេខទូរស័ព្ទត្រឹមត្រូវ (${PhoneEvaluator.normalize(source.phone)}) រួមទាំងថ្ងៃខែឆ្នាំកំណើតដូចគ្នា`,
        uuicEval.exactUuic,
        true,
        true
      )
    }

    // -------------------------------------------------------------------------
    // TIER 2: PROBABILISTIC & COMPOSITE SCORING
    // -------------------------------------------------------------------------

    if (dobEval.flag) flags.push(dobEval.flag)
    if (nameEval.flag) flags.push(nameEval.flag)
    if (phoneEval.flag) flags.push(phoneEval.flag)
    if (locEval.flag) flags.push(locEval.flag)

    // Key Population & Risk Concordance Bonus
    let kpScore = 0.5
    let kpDetail = "Target group not comparable"
    if (source.kpType && candidate.kpType) {
      if (source.kpType.toLowerCase() === candidate.kpType.toLowerCase()) {
        kpScore = 1.0
        kpDetail = `Concordant key population category: ${source.kpType}`
        bonusesApplied.push({ reason: `Concordant KP category (${source.kpType})`, bonus: 5 })
      } else {
        kpScore = 0.2
        kpDetail = `Different KP group: ${source.kpType} vs ${candidate.kpType}`
      }
    }

    // Calculate raw weighted score
    const w = this.weights
    let rawScore =
      uuicEval.score * w.uuic +
      nameEval.score * w.name +
      dobEval.score * w.dob +
      phoneEval.score * w.phone +
      locEval.score * w.location

    // Apply bonuses
    for (const b of bonusesApplied) {
      rawScore += b.bonus
    }

    // Twin / Sibling Disambiguation:
    if (
      dobEval.score >= 0.95 &&
      locEval.score >= 0.85 &&
      nameEval.score === 0.0 &&
      (source.fullName || "").length > 0 &&
      (candidate.fullName || "").length > 0
    ) {
      flags.push("POTENTIAL_TWIN_OR_SIBLING")
      penaltiesApplied.push({
        reason: "Potential twin or sibling: identical DOB and site with distinct personal names",
        penalty: 40,
      })
    }

    // Phone Discordance Penalty
    if (
      phoneEval.matchType === "PHONE_MISMATCH" &&
      source.phone &&
      candidate.phone
    ) {
      penaltiesApplied.push({
        reason: "Contradictory personal phone numbers documented",
        penalty: 10,
      })
    }

    // Chronological Sequence Check (VCCT HIV test vs ART initiation)
    if (source.registrationDate && candidate.artStartDate) {
      const vcctDate = new Date(source.registrationDate).getTime()
      const artDate = new Date(candidate.artStartDate).getTime()
      if (!isNaN(vcctDate) && !isNaN(artDate)) {
        if (artDate < vcctDate - 90 * 86400000) {
          flags.push("TEMPORAL_SEQUENCE_ANOMALY")
          penaltiesApplied.push({
            reason: `Temporal anomaly: ART initiated (${candidate.artStartDate}) before VCCT test date (${source.registrationDate})`,
            penalty: 25,
          })
        } else {
          bonusesApplied.push({
            reason: "Plausible clinical timeline (VCCT diagnosis followed by ART enrollment)",
            bonus: 3,
          })
          rawScore += 3
        }
      }
    }

    // Apply penalties
    for (const p of penaltiesApplied) {
      rawScore -= p.penalty
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)))

    // -------------------------------------------------------------------------
    // CLASSIFICATION & THRESHOLDS
    // -------------------------------------------------------------------------
    let tier: MatchTier = "TIER_3_REJECT"
    let method: MatchMethod = "manual_verified"
    let isAutoLinkable = false

    if (finalScore >= 95 && !flags.includes("DUPLICATE_UUIC_COLLISION") && !flags.includes("POTENTIAL_TWIN_OR_SIBLING")) {
      tier = "TIER_1_AUTO"
      method = "auto_probabilistic"
      isAutoLinkable = true
    } else if (finalScore >= 70) {
      tier = "TIER_2_MANUAL"
      method = "manual_verified"
      isAutoLinkable = false
    } else {
      tier = "TIER_3_REJECT"
      method = "manual_verified"
      isAutoLinkable = false
    }

    const explanationEn = this.buildExplanationEn(finalScore, tier, flags, nameEval, dobEval, uuicEval)
    const explanationKh = this.buildExplanationKh(finalScore, tier, flags, nameEval, dobEval, uuicEval)

    return {
      sourceRecordId: source.recordId,
      candidateRecordId: candidate.recordId,
      sourceSystem: source.source,
      candidateSystem: candidate.source,
      overallScore: finalScore,
      tier,
      method,
      isAutoLinkable,
      matchCriteria: {
        exactUuic: uuicEval.exactUuic,
        exactDob: dobEval.exactDob,
        phoneMatch: phoneEval.phoneMatch,
        nameLevenshtein: Math.round(nameEval.levenshteinRatio * 100) / 100,
        dobDiffDays: dobEval.diffDays,
        fieldBreakdown: {
          uuicScore: Math.round(uuicEval.score * 100),
          nameScore: Math.round(nameEval.score * 100),
          dobScore: Math.round(dobEval.score * 100),
          phoneScore: Math.round(phoneEval.score * 100),
          locationScore: Math.round(locEval.score * 100),
          kpConcordance: Math.round(kpScore * 100),
        },
        bonuses: bonusesApplied.map((b) => b.reason),
        penalties: penaltiesApplied.map((p) => p.reason),
        flags,
      },
      explanationKh,
      explanationEn,
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER FACTORIES
  // ---------------------------------------------------------------------------

  private createDeterministicMatch(
    source: UnifiedPatientRecord,
    candidate: UnifiedPatientRecord,
    score: number,
    method: MatchMethod,
    explanationEn: string,
    explanationKh: string,
    exactUuic: boolean,
    exactDob: boolean,
    phoneMatch: boolean
  ): MatchResult {
    const diffDays = calculateDateDiffDays(source.dob, candidate.dob)
    return {
      sourceRecordId: source.recordId,
      candidateRecordId: candidate.recordId,
      sourceSystem: source.source,
      candidateSystem: candidate.source,
      overallScore: score,
      tier: "TIER_1_AUTO",
      method,
      isAutoLinkable: true,
      matchCriteria: {
        exactUuic,
        exactDob,
        phoneMatch,
        nameLevenshtein: 1.0,
        dobDiffDays: diffDays,
        fieldBreakdown: {
          uuicScore: 100,
          nameScore: 100,
          dobScore: 100,
          phoneScore: 100,
          locationScore: 100,
          kpConcordance: 100,
        },
        bonuses: ["Deterministic primary identifier match"],
        penalties: [],
        flags: [],
      },
      explanationKh,
      explanationEn,
    }
  }

  private createHardReject(
    source: UnifiedPatientRecord,
    candidate: UnifiedPatientRecord,
    reason: string,
    detail: string
  ): MatchResult {
    return {
      sourceRecordId: source.recordId,
      candidateRecordId: candidate.recordId,
      sourceSystem: source.source,
      candidateSystem: candidate.source,
      overallScore: 0,
      tier: "TIER_3_REJECT",
      method: "manual_verified",
      isAutoLinkable: false,
      matchCriteria: {
        exactUuic: false,
        exactDob: false,
        phoneMatch: false,
        nameLevenshtein: 0,
        dobDiffDays: 99999,
        fieldBreakdown: {
          uuicScore: 0,
          nameScore: 0,
          dobScore: 0,
          phoneScore: 0,
          locationScore: 0,
          kpConcordance: 0,
        },
        bonuses: [],
        penalties: [detail],
        flags: [],
      },
      explanationKh: `ការបដិសេធស្វ័យប្រវត្ត៖ ${detail}`,
      explanationEn: `Hard rejection: ${detail}`,
    }
  }

  private buildExplanationEn(
    score: number,
    tier: MatchTier,
    flags: DisambiguationFlag[],
    nameEval: any,
    dobEval: any,
    uuicEval: any
  ): string {
    const parts: string[] = [`Match score ${score}% (${tier}).`]
    if (uuicEval.score >= 0.85) parts.push(`UUIC: ${uuicEval.detail}.`)
    if (nameEval.score >= 0.70) parts.push(`Name: ${nameEval.detail}.`)
    if (dobEval.score >= 0.70) parts.push(`DOB: ${dobEval.detail}.`)
    if (flags.length > 0) parts.push(`Reviewer flags: [${flags.join(", ")}].`)
    return parts.join(" ")
  }

  private buildExplanationKh(
    score: number,
    tier: MatchTier,
    flags: DisambiguationFlag[],
    nameEval: any,
    dobEval: any,
    uuicEval: any
  ): string {
    const tierKh =
      tier === "TIER_1_AUTO"
        ? "ភ្ជាប់ស្វ័យប្រវត្តិ (Auto-Link)"
        : tier === "TIER_2_MANUAL"
        ? "រង់ចាំការផ្ទៀងផ្ទាត់ដោយមន្ត្រី (Manual Review)"
        : "មិនត្រូវគ្នា (Non-Match)"
    const parts: string[] = [`ពិន្ទុភាពដូចគ្នា៖ ${score}% (${tierKh})។`]
    if (uuicEval.score >= 0.85) parts.push(`កូដ UUIC៖ ${uuicEval.detail}។`)
    if (nameEval.score >= 0.70) parts.push(`ឈ្មោះ៖ ${nameEval.detail}។`)
    if (dobEval.score >= 0.70) parts.push(`ថ្ងៃខែឆ្នាំកំណើត៖ ${dobEval.detail}។`)
    if (flags.length > 0) parts.push(`ចំណាំពិសេស៖ ${flags.join(", ")}។`)
    return parts.join(" ")
  }
}

// ============================================================================
// 6. MULTI-CANDIDATE DISAMBIGUATION RESOLVER
// ============================================================================

export interface DisambiguatedMatchDecision {
  sourceRecordId: string
  bestCandidateId: string | null
  confidenceScore: number
  tier: MatchTier
  recommendedAction: "AUTO_LINK" | "QUEUE_FOR_MANUAL_REVIEW" | "NO_LINK"
  decisionRationale: string
  candidateRankings: MatchResult[]
}

export class CBSDisambiguationResolver {
  private engine: CBSCandidateScoringEngine

  constructor(engine?: CBSCandidateScoringEngine) {
    this.engine = engine || new CBSCandidateScoringEngine()
  }

  public resolveCandidates(
    source: UnifiedPatientRecord,
    candidates: UnifiedPatientRecord[]
  ): DisambiguatedMatchDecision {
    if (!candidates || candidates.length === 0) {
      return {
        sourceRecordId: source.recordId,
        bestCandidateId: null,
        confidenceScore: 0,
        tier: "TIER_3_REJECT",
        recommendedAction: "NO_LINK",
        decisionRationale: "No candidates found across target registries",
        candidateRankings: [],
      }
    }

    const scoredList = candidates
      .map((c) => this.engine.scorePair(source, c))
      .sort((a, b) => b.overallScore - a.overallScore)

    const top = scoredList[0]

    // Case 1: Auto-link candidate (>= 95%)
    if (top.overallScore >= 95 && top.isAutoLinkable) {
      // Check for competing candidate ambiguity (margin of victory < 10%)
      if (scoredList.length > 1) {
        const runnerUp = scoredList[1]
        const margin = top.overallScore - runnerUp.overallScore
        if (margin < 10 && runnerUp.overallScore >= 80) {
          top.matchCriteria.flags.push("AMBIGUOUS_MULTI_CANDIDATE")
          return {
            sourceRecordId: source.recordId,
            bestCandidateId: top.candidateRecordId,
            confidenceScore: top.overallScore,
            tier: "TIER_2_MANUAL",
            recommendedAction: "QUEUE_FOR_MANUAL_REVIEW",
            decisionRationale: `Ambiguous multi-match: Top candidate scored ${top.overallScore}% but runner-up (${runnerUp.candidateRecordId}) scored ${runnerUp.overallScore}% (margin ${margin}% < 10%). Queued for manual verification.`,
            candidateRankings: scoredList,
          }
        }
      }

      return {
        sourceRecordId: source.recordId,
        bestCandidateId: top.candidateRecordId,
        confidenceScore: top.overallScore,
        tier: "TIER_1_AUTO",
        recommendedAction: "AUTO_LINK",
        decisionRationale: `High confidence match (${top.overallScore}%) via ${top.method}: ${top.explanationEn}`,
        candidateRankings: scoredList,
      }
    }

    // Case 2: Manual Review Window (70% - 94%)
    if (top.overallScore >= 70) {
      return {
        sourceRecordId: source.recordId,
        bestCandidateId: top.candidateRecordId,
        confidenceScore: top.overallScore,
        tier: "TIER_2_MANUAL",
        recommendedAction: "QUEUE_FOR_MANUAL_REVIEW",
        decisionRationale: `Probabilistic candidate found (${top.overallScore}%). Requires surveillance officer review.`,
        candidateRankings: scoredList,
      }
    }

    // Case 3: Non-Match (< 70%)
    return {
      sourceRecordId: source.recordId,
      bestCandidateId: null,
      confidenceScore: top.overallScore,
      tier: "TIER_3_REJECT",
      recommendedAction: "NO_LINK",
      decisionRationale: `Top candidate score (${top.overallScore}%) is below the 70% confidence threshold.`,
      candidateRankings: scoredList,
    }
  }
}

// ============================================================================
// 7. RECORD CONVERTERS & INGESTION ADAPTERS
// ============================================================================

export class PatientRecordAdapters {
  /**
   * Ingests a DHIS2 Tracked Entity Instance into UnifiedPatientRecord
   */
  public static fromDhis2Case(c: any): UnifiedPatientRecord {
    return {
      source: "DHIS2",
      recordId: c.id || c.trackedEntityInstance,
      uuic: c.uuic || null,
      firstName: c.firstName || null,
      lastName: c.lastName || null,
      fullName: c.fullName || null,
      sex: normalizeDhis2Sex(c.gender),
      dob: normalizeIsoDate(c.dob),
      age: c.age ?? null,
      phone: c.phone || null,
      province: c.province || null,
      district: c.district || null,
      commune: c.commune || null,
      kpType: c.kpType || null,
      registrationDate: normalizeIsoDate(c.created),
    }
  }

  /**
   * Ingests a MySQL VCCT record into UnifiedPatientRecord
   */
  public static fromVcctRecord(v: any): UnifiedPatientRecord {
    return {
      source: "VCCT",
      recordId: String(v.vcct_id),
      siteCode: v.site_code || undefined,
      siteName: v.site_name || undefined,
      odName: v.od_name || undefined,
      province: v.province_kh || undefined,
      district: v.district_kh || undefined,
      commune: v.commune_kh || undefined,
      uuic: v.uuic || null,
      pmrs: v.pmrs_code || null,
      hts: v.hts_code || null,
      idpoor: v.idpoor || null,
      sex: normalizeVcctSex(v.sex),
      dob: normalizeIsoDate(v.dob),
      age: v.age ?? null,
      phone: v.phone_number || null,
      kpType: v.patient_type_name || null,
      hivResult:
        v.hiv_result === 2
          ? "POSITIVE"
          : v.hiv_result === 1
          ? "NEGATIVE"
          : v.hiv_result === 3
          ? "INDETERMINATE"
          : "UNKNOWN",
      registrationDate: normalizeIsoDate(v.registration_date),
    }
  }

  /**
   * Ingests a MySQL ART Patient Profile into UnifiedPatientRecord
   */
  public static fromArtRecord(a: any): UnifiedPatientRecord {
    return {
      source: "ART",
      recordId: String(a.ClinicID),
      siteCode: a.site_code || undefined,
      siteName: a.site_name || undefined,
      odName: a.od_name || undefined,
      artNum: a.Artnum || null,
      pmrs: a.pmrs || (a.Typecode === "PMRS" ? a.Codes : null),
      uuic: a.uuic || (a.Typecode === "UUIC" ? a.Codes : null),
      idpoor: a.Typecode === "IDPOOR" ? a.Codes : null,
      sex: normalizeArtSex(a.Sex),
      dob: normalizeIsoDate(a.DaBirth),
      age: a.Age ?? null,
      phone: a.demographics?.phone || null,
      province: a.demographics?.province || undefined,
      district: a.demographics?.district || undefined,
      commune: a.demographics?.commune || undefined,
      kpType: a.patientTypeLabel || undefined,
      hivResult: "POSITIVE", // All ART clients are HIV confirmed
      artStartDate: normalizeIsoDate(a.DaART),
      registrationDate: normalizeIsoDate(a.DafirstVisit || a.DaART),
      isChild: Boolean(a.isChild),
    }
  }
}
