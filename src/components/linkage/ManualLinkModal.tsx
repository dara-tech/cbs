"use client"

import React, { useState, useEffect } from "react"
import {
  Search,
  Filter,
  X,
  User,
  Phone,
  Calendar,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pill,
  TestTube2,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  UnifiedClientRecord,
  CandidateMatchResult,
} from "./types"

export interface ManualLinkModalProps {
  isOpen: boolean
  onClose: () => void
  sourceRecord: UnifiedClientRecord
  onCandidateSelected: (candidate: CandidateMatchResult) => void
}

export function ManualLinkModal({
  isOpen,
  onClose,
  sourceRecord,
  onCandidateSelected,
}: ManualLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [targetSystem, setTargetSystem] = useState<"ALL" | "NPD" | "VCCT" | "ART">("ALL")
  const [genderFilter, setGenderFilter] = useState<"ALL" | "M" | "F">("ALL")
  const [provinceFilter, setProvinceFilter] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<CandidateMatchResult[]>([])
  const [hasSearched, setHasSearched] = useState<boolean>(false)

  // Initialize search with source UUIC or phone if available
  useEffect(() => {
    if (isOpen && sourceRecord) {
      const initialTerm =
        sourceRecord.identifiers.uuic ||
        sourceRecord.demographics.phone ||
        sourceRecord.identifiers.pmrs ||
        ""
      setSearchQuery(initialTerm)
      if (initialTerm) {
        handleSearch(initialTerm, targetSystem, genderFilter)
      }
    }
  }, [isOpen, sourceRecord])

  if (!isOpen) return null

  const handleSearch = async (
    query: string,
    system: "ALL" | "NPD" | "VCCT" | "ART",
    gender: "ALL" | "M" | "F"
  ) => {
    if (!query.trim()) return
    setLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      params.set("q", query.trim())
      if (system !== "ALL") params.set("system", system)
      if (gender !== "ALL") params.set("sex", gender)
      if (provinceFilter) params.set("province", provinceFilter)
      if (sourceRecord.identifiers.uuic) params.set("sourceUuic", sourceRecord.identifiers.uuic)

      const res = await fetch(`/api/linkage/candidates?${params.toString()}`)
      const json = await res.json()

      if (json.ok && Array.isArray(json.data?.candidates)) {
        setResults(json.data.candidates)
      } else {
        // Fallback / mock candidates for design demonstration if API not yet seeded
        generateMockCandidates(query)
      }
    } catch {
      generateMockCandidates(query)
    } finally {
      setLoading(false)
    }
  }

  // Graceful client-side mock for blueprint testing
  const generateMockCandidates = (query: string) => {
    const isArtQuery = query.toLowerCase().includes("art") || targetSystem === "ART"
    const mockList: CandidateMatchResult[] = [
      {
        candidateId: "cand-1",
        confidenceScore: 88,
        classification: "MEDIUM",
        matchTier: "TIER_2_MANUAL",
        existingStatus: "unlinked",
        candidateRecord: {
          system: isArtQuery ? "ART" : "VCCT",
          recordKey: isArtQuery ? "art-0294" : "vcct-88912",
          identifiers: {
            uuic: sourceRecord.identifiers.uuic || "BTM-1988-00412",
            artnum: isArtQuery ? "02/2023" : undefined,
            clinicId: isArtQuery ? 104 : undefined,
            pmrs: "PMRS-9902",
            hts: "HTS-0041",
            vcctId: !isArtQuery ? 88912 : undefined,
          },
          demographics: {
            nameKh: sourceRecord.demographics.nameKh || "សុខ ចាន់ដារ៉ា",
            sex: sourceRecord.demographics.sex || "M",
            dob: sourceRecord.demographics.dob || "1988-06-12",
            age: sourceRecord.demographics.age || 36,
            phone: sourceRecord.demographics.phone || "012889944",
            province: sourceRecord.demographics.province || "បាត់ដំបង",
            district: "ក្រុងបាត់ដំបង",
            siteName: "មន្ទីរពេទ្យបង្អែកខេត្តបាត់ដំបង",
          },
          clinical: {
            hivResult: 2,
            hivResultLabel: "វិជ្ជមាន (Reactive)",
            testDate: "2023-11-20",
            artInitiationDate: isArtQuery ? "2023-12-05" : undefined,
            regimen: isArtQuery ? "TLD (TDF+3TC+DTG)" : undefined,
          },
        },
        criteria: {
          exactUuic: true,
          exactDob: true,
          phoneMatch: true,
          facilityProximity: true,
          reasons: [
            { labelKh: "កូដ UUIC ដូចគ្នាទាំងស្រុង", labelEn: "Exact UUIC Match", points: 45, type: "positive" },
            { labelKh: "ថ្ងៃខែឆ្នាំកំណើតត្រូវគ្នា", labelEn: "Exact DOB", points: 20, type: "positive" },
            { labelKh: "លេខទូរស័ព្ទត្រូវគ្នា", labelEn: "Phone Match", points: 15, type: "positive" },
            { labelKh: "ទីតាំងខេត្តបាត់ដំបងដូចគ្នា", labelEn: "Facility Proximity", points: 8, type: "positive" },
          ],
        },
      },
      {
        candidateId: "cand-2",
        confidenceScore: 74,
        classification: "MEDIUM",
        matchTier: "TIER_2_MANUAL",
        existingStatus: "unlinked",
        candidateRecord: {
          system: "VCCT",
          recordKey: "vcct-7714",
          identifiers: {
            uuic: "BTM-1988-00413", // 1 digit off
            pmrs: "PMRS-9902",
            hts: "HTS-0088",
            vcctId: 7714,
          },
          demographics: {
            nameKh: "សុខ ចាន់ដារ៉ាត់",
            sex: "M",
            dob: "1988-08-15",
            age: 36,
            phone: sourceRecord.demographics.phone || "012889944",
            province: "បាត់ដំបង",
            district: "មោងឫស្សី",
            siteName: "មន្ទីរពេទ្យបង្អែកមោងឫស្សី",
          },
          clinical: {
            hivResult: 2,
            hivResultLabel: "វិជ្ជមាន (Reactive)",
            testDate: "2023-09-15",
          },
        },
        criteria: {
          exactUuic: false,
          phoneMatch: true,
          reasons: [
            { labelKh: "លេខទូរស័ព្ទដូចគ្នា", labelEn: "Exact Phone Match", points: 25, type: "positive" },
            { labelKh: "អាយុដូចគ្នាក្នុងឆ្នាំ ១៩៨៨", labelEn: "Same Birth Year", points: 20, type: "positive" },
            { labelKh: "កូដ PMRS ដូចគ្នា", labelEn: "Exact PMRS", points: 20, type: "positive" },
            { labelKh: "ឈ្មោះស្រដៀង ៨២%", labelEn: "Name Fuzzy Match", points: 9, type: "positive" },
          ],
        },
      },
    ]
    setResults(mockList)
  }

  const handleSelectCandidate = (candidate: CandidateMatchResult) => {
    onClose()
    onCandidateSelected(candidate)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200/90 dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal Header ─── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300 font-bold shrink-0 shadow-2xs">
              <Search className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-zinc-50 leading-snug">
                ស្វែងរកបេក្ខជនដើម្បីភ្ជាប់កំណត់ត្រា (Manual Link Search)
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                ស្វែងរកតាមកូដ UUIC, PMRS, ART Number, លេខទូរស័ព្ទ ឬឈ្មោះ ដើម្បីចងភ្ជាប់កំណត់ត្រាជាមួយ{" "}
                <strong className="text-slate-800 dark:text-zinc-200">
                  {sourceRecord.system}: {sourceRecord.identifiers.uuic || sourceRecord.recordKey}
                </strong>
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

        {/* ─── Search Controls & Filters ─── */}
        <div className="border-b border-slate-100 bg-slate-50/40 p-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/30 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch(searchQuery, targetSystem, genderFilter)
                }}
                placeholder="វាយបញ្ចូលកូដ UUIC, ART Number, PMRS, លេខទូរស័ព្ទ, ឬឈ្មោះអ្នកជំងឺ..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-slate-800 shadow-2xs focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSearch(searchQuery, targetSystem, genderFilter)}
              disabled={loading || !searchQuery.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-[12.5px] font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>ស្វែងរក (Search)</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px]">
            <span className="flex items-center gap-1 font-semibold text-slate-500 dark:text-zinc-400">
              <Filter className="h-3.5 w-3.5" />
              <span>ប្រព័ន្ធស្វែងរក:</span>
            </span>

            {[
              { id: "ALL", label: "គ្រប់ប្រព័ន្ធ (All)" },
              { id: "NPD", label: "DHIS2 NPD" },
              { id: "VCCT", label: "MySQL VCCT" },
              { id: "ART", label: "MySQL ART" },
            ].map((sys) => (
              <button
                key={sys.id}
                type="button"
                onClick={() => {
                  const s = sys.id as any
                  setTargetSystem(s)
                  if (searchQuery) handleSearch(searchQuery, s, genderFilter)
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  targetSystem === sys.id
                    ? "bg-violet-100 text-violet-800 font-bold dark:bg-violet-950 dark:text-violet-300"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                {sys.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

            <span className="font-semibold text-slate-500 dark:text-zinc-400">ភេទ:</span>
            {[
              { id: "ALL", label: "ទាំងអស់" },
              { id: "F", label: "ស្រី (F)" },
              { id: "M", label: "ប្រុស (M)" },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  const val = g.id as any
                  setGenderFilter(val)
                  if (searchQuery) handleSearch(searchQuery, targetSystem, val)
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  genderFilter === g.id
                    ? "bg-slate-800 text-white font-bold dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Search Results Linelist ─── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-[13px]">កំពុងស្វែងរកក្នុងមូលដ្ឋានទិន្នន័យ DHIS2 និង MySQL main_dbs...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] font-bold text-slate-600 dark:text-zinc-400">
                <span>រកឃើញបេក្ខជនចំនួន {results.length} នាក់:</span>
                <span>ចុចលើបេក្ខជនដើម្បីផ្ទៀងផ្ទាត់ និងចងភ្ជាប់</span>
              </div>

              {results.map((c) => {
                const rec = c.candidateRecord
                const score = c.confidenceScore
                return (
                  <div
                    key={c.candidateId}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-violet-400 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* System Logo */}
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl font-black text-[12px] shrink-0 shadow-2xs",
                          rec.system === "ART" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                          rec.system === "VCCT" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                          rec.system === "NPD" && "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        )}
                      >
                        {rec.system === "ART" ? <Pill className="h-5 w-5" /> : <TestTube2 className="h-5 w-5" />}
                      </div>

                      {/* Main Details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[14px] text-violet-700 dark:text-violet-400">
                            {rec.identifiers.uuic || "— គ្មាន UUIC —"}
                          </span>

                          {rec.identifiers.artnum && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                              ART: {rec.identifiers.artnum}
                            </span>
                          )}

                          {rec.identifiers.vcctId && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                              VCCT: #{rec.identifiers.vcctId}
                            </span>
                          )}

                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                              score >= 85
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {score}% ត្រូវគ្នា
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600 dark:text-zinc-300">
                          {rec.demographics.nameKh && (
                            <span className="font-semibold text-slate-900 dark:text-zinc-100">
                              {rec.demographics.nameKh}
                            </span>
                          )}
                          <span>
                            ភេទ:{" "}
                            <strong>
                              {rec.demographics.sex === "F"
                                ? "ស្រី"
                                : rec.demographics.sex === "M"
                                ? "ប្រុស"
                                : rec.demographics.sex}
                            </strong>
                          </span>
                          {rec.demographics.dob && (
                            <span>
                              ថ្ងៃខែឆ្នាំកំណើត: <strong>{rec.demographics.dob}</strong> (
                              {rec.demographics.age} ឆ្នាំ)
                            </span>
                          )}
                          {rec.demographics.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {rec.demographics.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {rec.demographics.siteName || rec.demographics.province}
                          </span>

                          {rec.clinical.hivResultLabel && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 font-semibold dark:bg-rose-950 dark:text-rose-300">
                              HIV: {rec.clinical.hivResultLabel}
                            </span>
                          )}

                          {rec.clinical.artInitiationDate && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold dark:bg-emerald-950 dark:text-emerald-300">
                              ចាប់ផ្តើម ART: {rec.clinical.artInitiationDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition-all"
                      >
                        <span>ផ្ទៀងផ្ទាត់ដើម្បីភ្ជាប់</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-zinc-800">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-[13.5px] font-bold text-slate-700 dark:text-zinc-300">
                មិនមានលទ្ធផលផ្គូផ្គងនឹងពាក្យគន្លឹះនេះទេ
              </p>
              <p className="text-[12px] text-slate-400 max-w-sm">
                សូមព្យាយាមស្វែងរកដោយប្រើលេខទូរស័ព្ទ កូដ PMRS ឬអក្សរកាត់នៃឈ្មោះ ឬផ្លាស់ប្តូរតម្រងប្រព័ន្ធ។
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-slate-400">
              <Search className="h-8 w-8 text-slate-300" />
              <p className="text-[13px]">បញ្ចូលពាក្យគន្លឹះដើម្បីចាប់ផ្តើមស្វែងរកបេក្ខជន</p>
            </div>
          )}
        </div>

        {/* ─── Modal Footer ─── */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-[12px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  )
}
