"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  GitMerge,
  Info,
  Link2,
  Loader2,
  MapPin,
  Phone,
  Pill,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  UnifiedClientRecord,
  CandidateMatchResult,
  LinkageStatus,
} from "./types"

export interface MatchReviewModalProps {
  isOpen: boolean
  onClose: () => void
  sourceRecord: UnifiedClientRecord
  candidateMatch: CandidateMatchResult
  onConfirmLink: (sourceKey: string, candidateKey: string, note?: string) => Promise<void>
  onRejectMatch: (candidateId: string, reason: string) => Promise<void>
  onOpenManualSearch?: () => void
  onUnlink?: (linkId: string) => Promise<void>
}

export function MatchReviewModal({
  isOpen,
  onClose,
  sourceRecord,
  candidateMatch,
  onConfirmLink,
  onRejectMatch,
  onOpenManualSearch,
  onUnlink,
}: MatchReviewModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState<string>("different_person")
  const [rejectCustomNote, setRejectCustomNote] = useState<string>("")
  const [officerNote, setOfficerNote] = useState<string>("")
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      setActionError(null)
      await onConfirmLink(sourceRecord.recordKey, candidateMatch.candidateRecord.recordKey, officerNote)
      onClose()
    } catch (err: any) {
      setActionError(err?.message || "បរាជ័យក្នុងការភ្ជាប់កំណត់ត្រា។ សូមព្យាយាមម្តងទៀត។")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    try {
      setRejecting(true)
      setActionError(null)
      const finalReason = rejectReason === "other" ? rejectCustomNote : rejectReason
      await onRejectMatch(candidateMatch.candidateId, finalReason)
      setShowRejectDialog(false)
      onClose()
    } catch (err: any) {
      setActionError(err?.message || "បរាជ័យក្នុងការបដិសេធការផ្គូផ្គង។")
    } finally {
      setRejecting(false)
    }
  }

  const candidate = candidateMatch.candidateRecord
  const score = candidateMatch.confidenceScore

  // Helper to determine field match status
  const getFieldStatus = (
    val1?: string | number | null,
    val2?: string | number | null,
    type: "exact" | "date" | "phone" | "text" = "exact"
  ): { status: "match" | "fuzzy" | "conflict" | "empty"; note?: string } => {
    if (!val1 && !val2) return { status: "empty" }
    if (!val1 || !val2) return { status: "empty" }

    const s1 = String(val1).trim().toLowerCase()
    const s2 = String(val2).trim().toLowerCase()

    if (s1 === s2) return { status: "match" }

    if (type === "phone") {
      const clean1 = s1.replace(/[^0-9]/g, "")
      const clean2 = s2.replace(/[^0-9]/g, "")
      if (clean1 && clean2 && (clean1 === clean2 || clean1.endsWith(clean2) || clean2.endsWith(clean1))) {
        return { status: "match" }
      }
      return { status: "conflict", note: "លេខទូរស័ព្ទខុសគ្នា" }
    }

    if (type === "date") {
      try {
        const d1 = new Date(s1).getTime()
        const d2 = new Date(s2).getTime()
        const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24)
        if (diffDays <= 365) {
          return { status: "fuzzy", note: `ខុសគ្នាក្នុងរង្វង់ ${Math.round(diffDays / 30)} ខែ` }
        }
      } catch {
        // pass
      }
      return { status: "conflict", note: "ថ្ងៃខែឆ្នាំកំណើតខុសគ្នា" }
    }

    if (type === "text") {
      if (s1.includes(s2) || s2.includes(s1)) {
        return { status: "fuzzy", note: "ស្រដៀងគ្នា" }
      }
    }

    return { status: "conflict" }
  }

  interface DiffField {
    labelKh: string
    labelEn: string
    src?: string | number | null
    cand?: string | number | null
    isCode?: boolean
    isGender?: boolean
    status: { status: "match" | "fuzzy" | "conflict" | "empty"; note?: string }
  }

  interface DiffSection {
    titleKh: string
    titleEn: string
    fields: DiffField[]
  }

  // Comparison fields definitions
  const diffSections: DiffSection[] = [
    {
      titleKh: "លេខសម្គាល់គន្លឹះ (Primary Identifiers)",
      titleEn: "Primary Identifiers",
      fields: [
        {
          labelKh: "កូដ UUIC",
          labelEn: "UUIC Code",
          src: sourceRecord.identifiers.uuic,
          cand: candidate.identifiers.uuic,
          isCode: true,
          status: getFieldStatus(sourceRecord.identifiers.uuic, candidate.identifiers.uuic),
        },
        {
          labelKh: "កូដ PMRS",
          labelEn: "PMRS Code",
          src: sourceRecord.identifiers.pmrs,
          cand: candidate.identifiers.pmrs,
          isCode: true,
          status: getFieldStatus(sourceRecord.identifiers.pmrs, candidate.identifiers.pmrs),
        },
        {
          labelKh: "កូដ HTS / VCCT ID",
          labelEn: "HTS / VCCT ID",
          src: sourceRecord.identifiers.hts || sourceRecord.identifiers.vcctId,
          cand: candidate.identifiers.hts || candidate.identifiers.vcctId,
          isCode: true,
          status: getFieldStatus(
            sourceRecord.identifiers.hts || sourceRecord.identifiers.vcctId,
            candidate.identifiers.hts || candidate.identifiers.vcctId
          ),
        },
        {
          labelKh: "លេខកូដ ART / Clinic ID",
          labelEn: "ART Number / Clinic ID",
          src: sourceRecord.identifiers.artnum || sourceRecord.identifiers.clinicId,
          cand: candidate.identifiers.artnum || candidate.identifiers.clinicId,
          isCode: true,
          status: getFieldStatus(
            sourceRecord.identifiers.artnum || sourceRecord.identifiers.clinicId,
            candidate.identifiers.artnum || candidate.identifiers.clinicId
          ),
        },
        {
          labelKh: "អត្តសញ្ញាណប័ណ្ណ / IDPoor",
          labelEn: "National ID / IDPoor",
          src: sourceRecord.demographics.nationalId,
          cand: candidate.demographics.nationalId,
          isCode: true,
          status: getFieldStatus(sourceRecord.demographics.nationalId, candidate.demographics.nationalId),
        },
      ],
    },
    {
      titleKh: "ព័ត៌មានប្រជាសាស្ត្រ (Demographics)",
      titleEn: "Demographics",
      fields: [
        {
          labelKh: "ឈ្មោះអ្នកជំងឺ (Khmer / Latin)",
          labelEn: "Full Name",
          src: sourceRecord.demographics.nameKh || sourceRecord.demographics.nameEn,
          cand: candidate.demographics.nameKh || candidate.demographics.nameEn,
          status: getFieldStatus(
            sourceRecord.demographics.nameKh || sourceRecord.demographics.nameEn,
            candidate.demographics.nameKh || candidate.demographics.nameEn,
            "text"
          ),
        },
        {
          labelKh: "ភេទ (Gender)",
          labelEn: "Sex",
          src: sourceRecord.demographics.sex,
          cand: candidate.demographics.sex,
          status: getFieldStatus(sourceRecord.demographics.sex, candidate.demographics.sex),
          isGender: true,
        },
        {
          labelKh: "ថ្ងៃខែឆ្នាំកំណើត (DOB)",
          labelEn: "Date of Birth",
          src: sourceRecord.demographics.dob,
          cand: candidate.demographics.dob,
          status: getFieldStatus(sourceRecord.demographics.dob, candidate.demographics.dob, "date"),
        },
        {
          labelKh: "អាយុ (Age)",
          labelEn: "Calculated Age",
          src: sourceRecord.demographics.age ? `${sourceRecord.demographics.age} ឆ្នាំ` : null,
          cand: candidate.demographics.age ? `${candidate.demographics.age} ឆ្នាំ` : null,
          status: getFieldStatus(sourceRecord.demographics.age, candidate.demographics.age),
        },
      ],
    },
    {
      titleKh: "ទំនាក់ទំនង និងទីតាំង (Contact & Location)",
      titleEn: "Contact & Location",
      fields: [
        {
          labelKh: "លេខទូរស័ព្ទ (Phone)",
          labelEn: "Phone Number",
          src: sourceRecord.demographics.phone,
          cand: candidate.demographics.phone,
          status: getFieldStatus(sourceRecord.demographics.phone, candidate.demographics.phone, "phone"),
        },
        {
          labelKh: "ខេត្ត / ក្រុង (Province)",
          labelEn: "Province",
          src: sourceRecord.demographics.province,
          cand: candidate.demographics.province,
          status: getFieldStatus(sourceRecord.demographics.province, candidate.demographics.province, "text"),
        },
        {
          labelKh: "ស្រុកប្រតិបត្តិ / មូលដ្ឋានសុខាភិបាល",
          labelEn: "OD / Facility Site",
          src: sourceRecord.demographics.siteName || sourceRecord.demographics.district,
          cand: candidate.demographics.siteName || candidate.demographics.district,
          status: getFieldStatus(
            sourceRecord.demographics.siteName || sourceRecord.demographics.district,
            candidate.demographics.siteName || candidate.demographics.district,
            "text"
          ),
        },
      ],
    },
    {
      titleKh: "ប្រវត្តិគ្លីនិក និងតេស្ត (Clinical & History)",
      titleEn: "Clinical & Testing",
      fields: [
        {
          labelKh: "លទ្ធផលតេស្ត HIV (Result)",
          labelEn: "HIV Test Result",
          src: sourceRecord.clinical.hivResultLabel || sourceRecord.clinical.hivResult,
          cand: candidate.clinical.hivResultLabel || candidate.clinical.hivResult,
          status: getFieldStatus(
            sourceRecord.clinical.hivResultLabel || sourceRecord.clinical.hivResult,
            candidate.clinical.hivResultLabel || candidate.clinical.hivResult
          ),
        },
        {
          labelKh: "កាលបរិច្ឆេទតេស្ត / ពិនិត្យដំបូង",
          labelEn: "Test / Registration Date",
          src: sourceRecord.clinical.testDate || sourceRecord.clinical.postCounselingDate,
          cand: candidate.clinical.testDate || candidate.clinical.postCounselingDate || candidate.clinical.firstVisitDate,
          status: { status: "empty" as const },
        },
        {
          labelKh: "កាលបរិច្ឆេទចាប់ផ្តើម ART",
          labelEn: "ART Initiation Date",
          src: sourceRecord.clinical.artInitiationDate,
          cand: candidate.clinical.artInitiationDate,
          status: getFieldStatus(
            sourceRecord.clinical.artInitiationDate,
            candidate.clinical.artInitiationDate,
            "date"
          ),
        },
        {
          labelKh: "រូបមន្តថ្នាំ / បន្ទុកវីរុស (Regimen / VL)",
          labelEn: "Regimen / Viral Load",
          src: sourceRecord.clinical.regimen || sourceRecord.clinical.viralLoad,
          cand: candidate.clinical.regimen || candidate.clinical.viralLoad,
          status: { status: "empty" as const },
        },
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200/90 dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal Header ─── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 font-bold shrink-0 shadow-2xs">
              <GitMerge className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-zinc-50 leading-snug">
                  ផ្ទៀងផ្ទាត់ការផ្គូផ្គងអត្តសញ្ញាណ (Match Review & Diff)
                </h3>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {sourceRecord.system} ⇄ {candidate.system}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                ប្រៀបធៀបព័ត៌មានលម្អិតចន្លោះកំណត់ត្រាដើម្បីបញ្ជាក់ ឬបដិសេធការភ្ជាប់ Master Patient Index (MPI)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Confidence Score Bar ─── */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent px-6 py-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl font-black text-[17px] shadow-xs",
                    score >= 90
                      ? "bg-emerald-500 text-white"
                      : score >= 70
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                  )}
                >
                  {score}%
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-zinc-100 text-[13.5px]">
                  <span>កម្រិតភាពត្រូវគ្នា:</span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-black tracking-wide",
                      score >= 90
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : score >= 70
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    )}
                  >
                    {score >= 90
                      ? "កម្រិតខ្ពស់ (Tier 1 Auto-Link Candidate)"
                      : score >= 70
                      ? "កម្រិតមធ្យម (Tier 2 Manual Review Required)"
                      : "កម្រិតទាប (Low Confidence)"}
                  </span>
                </div>
                <div className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                  {candidateMatch.criteria.reasons?.length || 0} ចំណុចត្រូវគ្នាដែលត្រូវបានផ្ទៀងផ្ទាត់ដោយម៉ាស៊ីនផ្គូផ្គង
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span>{showBreakdown ? "លាក់លម្អិតពិន្ទុ" : "មើលលម្អិតពិន្ទុ (Breakdown)"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showBreakdown && "rotate-180")} />
            </button>
          </div>

          {/* Breakdown Drawer */}
          {showBreakdown && (
            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-inner dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="text-[12px] font-bold text-slate-800 dark:text-zinc-200 mb-2">
                ព័ត៌មានលម្អិតនៃការគណនាពិន្ទុ (Algorithm Score Breakdown):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                {candidateMatch.criteria.reasons?.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-zinc-800/60"
                  >
                    <div className="flex items-center gap-1.5">
                      {r.type === "positive" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : r.type === "warning" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-rose-500" />
                      )}
                      <span>{r.labelKh}</span>
                    </div>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        r.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {r.points > 0 ? `+${r.points}%` : `${r.points}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error notification banner */}
        {actionError && (
          <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2.5 text-[12px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* ─── Diff Comparison Table ─── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs dark:border-zinc-800">
            {/* Table Header: Columns */}
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100/90 py-2.5 px-4 text-[12px] font-bold text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <div className="col-span-4">ព័ត៌មានផ្ទៀងផ្ទាត់ (Attribute)</div>
              <div className="col-span-3 flex items-center gap-1.5 text-violet-700 dark:text-violet-400">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                <span>កំណត់ត្រាបច្ចុប្បន្ន ({sourceRecord.system})</span>
              </div>
              <div className="col-span-3 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>បេក្ខជនផ្គូផ្គង ({candidate.system})</span>
              </div>
              <div className="col-span-2 text-right">ស្ថានភាពផ្ទៀងផ្ទាត់</div>
            </div>

            {/* Sections & Rows */}
            <div className="divide-y divide-slate-100 bg-white dark:divide-zinc-800/80 dark:bg-zinc-950">
              {diffSections.map((sec, sIdx) => (
                <div key={sIdx}>
                  {/* Category Header */}
                  <div className="bg-slate-50/90 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-zinc-900/40 dark:text-zinc-400">
                    {sec.titleKh}
                  </div>

                  {sec.fields.map((f, fIdx) => {
                    const status = f.status.status
                    return (
                      <div
                        key={fIdx}
                        className={cn(
                          "grid grid-cols-12 items-center py-2.5 px-4 text-[12.5px] transition-colors",
                          status === "match" && "hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
                          status === "fuzzy" && "hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
                          status === "conflict" && "bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10",
                          status === "empty" && "hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                        )}
                      >
                        {/* Attribute Label */}
                        <div className="col-span-4 font-medium text-slate-700 dark:text-zinc-300">
                          <div>{f.labelKh}</div>
                          <div className="text-[10.5px] text-slate-400 dark:text-zinc-500">{f.labelEn}</div>
                        </div>

                        {/* Source Record Value */}
                        <div className="col-span-3 pr-2">
                          {f.src ? (
                            f.isCode ? (
                              <span className="font-mono font-bold text-violet-700 dark:text-violet-400 text-[13px]">
                                {f.src}
                              </span>
                            ) : f.isGender ? (
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                                  f.src === "F"
                                    ? "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                )}
                              >
                                {f.src === "F" ? "ស្រី (F)" : "ប្រុស (M)"}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-900 dark:text-zinc-100">{f.src}</span>
                            )
                          ) : (
                            <span className="text-[11.5px] italic text-slate-400 dark:text-zinc-600">— គ្មានទិន្នន័យ —</span>
                          )}
                        </div>

                        {/* Candidate Record Value */}
                        <div className="col-span-3 pr-2">
                          {f.cand ? (
                            f.isCode ? (
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[13px]">
                                {f.cand}
                              </span>
                            ) : f.isGender ? (
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                                  f.cand === "F"
                                    ? "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                )}
                              >
                                {f.cand === "F" ? "ស្រី (F)" : "ប្រុស (M)"}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-900 dark:text-zinc-100">{f.cand}</span>
                            )
                          ) : (
                            <span className="text-[11.5px] italic text-slate-400 dark:text-zinc-600">— គ្មានទិន្នន័យ —</span>
                          )}
                        </div>

                        {/* Status Diff Badge */}
                        <div className="col-span-2 text-right">
                          {status === "match" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>ត្រូវគ្នាទាំងស្រុង</span>
                            </span>
                          )}
                          {status === "fuzzy" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <span>≈ ស្រដៀងគ្នា</span>
                            </span>
                          )}
                          {status === "conflict" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              <span>ខុសគ្នា</span>
                            </span>
                          )}
                          {status === "empty" && (
                            <span className="text-[11px] text-slate-400 dark:text-zinc-600">—</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Officer Verification Note Input */}
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
              កំណត់ចំណាំការផ្ទៀងផ្ទាត់របស់មន្ត្រី (Officer Verification Note - Optional):
            </label>
            <input
              type="text"
              value={officerNote}
              onChange={(e) => setOfficerNote(e.target.value)}
              placeholder="ឧទាហរណ៍: បានផ្ទៀងផ្ទាត់តាមទូរស័ព្ទជាមួយគ្លីនិក ART បាត់ដំបង / Same client verified"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] text-slate-800 shadow-2xs focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* ─── Modal Footer Actions ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenManualSearch && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenManualSearch()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <span>ស្វែងរកបេក្ខជនផ្សេង (Search Manual)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRejectDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[12px] font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/80 active:scale-95 transition-all"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>បដិសេធការផ្គូផ្គង (Reject Match)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 active:scale-95 transition-all"
            >
              បោះបង់ (Cancel)
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>កំពុងភ្ជាប់...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>បញ្ជាក់ការភ្ជាប់ (Confirm Link)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── Reject Match Reason Dialog ─── */}
        {showRejectDialog && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-100"
            onClick={() => setShowRejectDialog(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-[15px] mb-3">
                <AlertTriangle className="h-5 w-5" />
                <span>បញ្ជាក់មូលហេតុនៃការបដិសេធ</span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mb-3">
                កំណត់ត្រានឹងត្រូវបានកត់ត្រាក្នុងបញ្ជីបដិសេធ (Rejection Registry) ដើម្បីកុំឱ្យម៉ាស៊ីនផ្គូផ្គងស្នើសុំម្តងទៀត។
              </p>

              <div className="space-y-2 mb-4 text-[12.5px]">
                {[
                  { id: "different_person", label: "បុគ្គលផ្សេងគ្នា (Different Person - Shared Phone/Family)" },
                  { id: "dob_mismatch", label: "ថ្ងៃខែឆ្នាំកំណើត ឬអាយុខុសគ្នាទាំងស្រុង (Discrepant Age/DOB)" },
                  { id: "duplicate_uuic_error", label: "កំហុសកូដ UUIC ជាន់គ្នា (Duplicate UUIC Typing Error)" },
                  { id: "other", label: "មូលហេតុផ្សេងទៀត (Other Reason)" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 p-2.5 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="reject_reason"
                      value={opt.id}
                      checked={rejectReason === opt.id}
                      onChange={() => setRejectReason(opt.id)}
                      className="accent-rose-600"
                    />
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{opt.label}</span>
                  </label>
                ))}

                {rejectReason === "other" && (
                  <textarea
                    rows={2}
                    value={rejectCustomNote}
                    onChange={(e) => setRejectCustomNote(e.target.value)}
                    placeholder="សូមបញ្ជាក់មូលហេតុលម្អិត..."
                    className="w-full rounded-xl border border-slate-200 p-2 text-[12px] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectDialog(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold text-slate-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>បដិសេធជាស្ថាពរ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
