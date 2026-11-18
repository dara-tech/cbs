import type {
  DisambiguationFlag,
  MatchTier,
  MatchMethod,
  MpiMatchCriteriaPayload,
  UnifiedPatientRecord,
  PatientSourceSystem,
} from "@/lib/matchingEngine"

export type LinkageStatus =
  | "verified"
  | "proposed"
  | "conflicted"
  | "unlinked"
  | "rejected"

export type LinkageMethod = MatchMethod

export type CanonicalGender = "M" | "F" | "TG" | "OTHER" | "UNKNOWN"

export interface PatientDemographics {
  nameKh?: string
  nameEn?: string
  sex: CanonicalGender
  dob?: string | null
  age?: number | null
  phone?: string | null
  nationalId?: string | null
  idpoor?: string | null
  province?: string | null
  district?: string | null
  commune?: string | null
  village?: string | null
  siteCode?: string | null
  siteName?: string | null
}

export interface PatientIdentifiers {
  uuic?: string | null
  pmrs?: string | null
  hts?: string | null
  artnum?: string | null
  clinicId?: number | string | null
  dhis2TeiId?: string | null
  vcctId?: number | string | null
  nationalId?: string | null
  idpoor?: string | null
}

export interface PatientClinicalSummary {
  hivResult?: "reactive" | "non-reactive" | "indeterminate" | number | string | null
  hivResultLabel?: string | null
  testDate?: string | null
  postCounselingDate?: string | null
  artInitiationDate?: string | null
  firstVisitDate?: string | null
  viralLoad?: string | number | null
  cd4?: string | number | null
  regimen?: string | null
  patientType?: string | null
  kpType?: string | null
  riskLevel?: string | null
}

export interface UnifiedClientRecord {
  system: "NPD" | "VCCT" | "ART"
  recordKey: string
  identifiers: PatientIdentifiers
  demographics: PatientDemographics
  clinical: PatientClinicalSummary
  linkStatus?: LinkageStatus
  mpiId?: string | null
}

export interface MatchCriteriaBreakdown {
  exactUuic?: boolean
  exactDob?: boolean
  exactPrms?: boolean
  exactHts?: boolean
  exactArtnum?: boolean
  phoneMatch?: boolean
  facilityProximity?: boolean
  nameSimilarity?: number // 0.0 to 1.0
  dobDiffDays?: number
  flags?: DisambiguationFlag[]
  reasons: Array<{
    labelKh: string
    labelEn: string
    points: number
    type: "positive" | "negative" | "warning"
  }>
}

export interface CandidateMatchResult {
  candidateId: string
  candidateRecord: UnifiedClientRecord
  confidenceScore: number // 0 to 100
  classification: "HIGH" | "MEDIUM" | "LOW"
  matchTier: MatchTier
  method?: MatchMethod
  explanationKh?: string
  explanationEn?: string
  flags?: DisambiguationFlag[]
  criteria: MatchCriteriaBreakdown
  existingStatus?: LinkageStatus
}

export interface LinkageStatsSummary {
  totalPatients: number
  verifiedCount: number
  proposedCount: number
  conflictedCount: number
  unlinkedCount: number
  overallLinkageRate: number // e.g. 84.5%
  threeWayLinkedRate: number // e.g. 62.1%
  cascadeGaps: {
    vcctPositiveNotLinkedToArt: number
    npdPositiveNotLinkedToVcct: number
  }
  lastUpdated: string
}
