"use client"

import React, { useState, useEffect } from "react"
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Folder,
  HeartPulse,
  Hospital,
  Info,
  Loader2,
  MapPin,
  Phone,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LinkStatusBadge } from "@/components/linkage/LinkStatusBadge"
import type {
  CombinedClientProfile,
  ArtPatientProfile,
  VcctRecord,
  ArtPrescribedDrug,
} from "@/lib/mysqlClient"

export interface NpdCaseInfo {
  fullName?: string
  gender?: string
  dob?: string
  age?: string | number | null
  kpType?: string
  riskLevel?: string
  province?: string
  district?: string
  hotspotName?: string
  orgUnit?: string
  rawAttributes?: Array<{ displayName?: string; attribute?: string; value: string }>
}

interface ClientProfileModalProps {
  isOpen: boolean
  onClose: () => void
  uuic?: string
  vcctId?: string | number
  siteCode?: string
  pmrs?: string
  hts?: string
  artnum?: string
  clinicId?: number
  program?: "vcct" | "art"
  clientName?: string
  npdCase?: NpdCaseInfo
}

export function ClientProfileModal({
  isOpen,
  onClose,
  uuic = "",
  vcctId,
  siteCode = "",
  pmrs = "",
  hts = "",
  artnum = "",
  clinicId,
  program,
  clientName,
  npdCase,
}: ClientProfileModalProps) {
  const [activeMainTab, setActiveMainTab] = useState<"clinical" | "npd">("clinical")
  const [clinicalTab, setClinicalTab] = useState<"vcct" | "art">(
    program === "art" || (artnum && !uuic) ? "art" : "vcct"
  )

  const [profile, setProfile] = useState<CombinedClientProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    async function fetchProfile() {
      if (!uuic && !pmrs && !hts && !artnum && !vcctId && !clinicId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        if (uuic) queryParams.set("uuic", uuic)
        if (pmrs) queryParams.set("pmrs", pmrs)
        if (hts) queryParams.set("hts", hts)
        if (artnum) queryParams.set("artnum", artnum)
        if (vcctId) queryParams.set("vcctId", String(vcctId))
        if (siteCode) queryParams.set("siteCode", siteCode)
        if (clinicId !== undefined && clinicId !== null) queryParams.set("clinicId", String(clinicId))

        const res = await fetch(`/api/mysql/profile?${queryParams.toString()}`)
        const json = await res.json()

        if (!isMounted) return

        if (json.ok && json.data) {
          setProfile(json.data)
          // Default tab to the one that has records
          if (program === "art" && json.data.art?.length > 0) {
            setClinicalTab("art")
          } else if (program === "vcct" && json.data.vcct?.length > 0) {
            setClinicalTab("vcct")
          } else if (artnum && json.data.art?.length > 0) {
            setClinicalTab("art")
          } else if (json.data.vcct?.length > 0) {
            setClinicalTab("vcct")
          } else if (json.data.art?.length > 0) {
            setClinicalTab("art")
          }
        } else {
          setError(json.error || "មិនអាចទាញទិន្នន័យពី MySQL បានទេ")
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "បញ្ហាក្នុងការតភ្ជាប់បណ្តាញ")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()
    return () => {
      isMounted = false
    }
  }, [isOpen, uuic, pmrs, hts, artnum, vcctId, program, siteCode, clinicId])

  if (!isOpen) return null

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const vcctCount = profile?.vcct?.length || 0
  const artCount = profile?.art?.length || 0

  const isArtFocused = program === "art" || (artnum && !uuic)
  const displayTitle = isArtFocused
    ? "ព័ត៌មានអ្នកជំងឺព្យាបាល ART"
    : clientName || (uuic ? `ព័ត៌មានអតិថិជន (${uuic})` : "ព័ត៌មានគ្លីនិកអតិថិជន")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200/90 dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal Header ─── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl shadow-2xs font-bold shrink-0",
                isArtFocused
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300"
              )}
            >
              {isArtFocused ? <Pill className="h-6 w-6" /> : <TestTube2 className="h-6 w-6" />}
            </div>

            <div>
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-zinc-50 leading-snug">
                {displayTitle}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-[12px] font-semibold">
                {artnum && (
                  <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                    <span>លេខកូដ ART: <strong className="font-uuic">{artnum}</strong></span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(artnum, "artnum", e)}
                      className="text-emerald-500 hover:text-emerald-700 ml-0.5"
                      title="ចម្លង"
                    >
                      {copiedKey === "artnum" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}

                {clinicId !== undefined && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/60">
                    គ្លីនិក: #{clinicId}
                  </span>
                )}

                {uuic && (
                  <div className="flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-0.5 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60">
                    <span>កូដ UUIC: <strong className="font-uuic">{uuic}</strong></span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(uuic, "uuic", e)}
                      className="text-violet-500 hover:text-violet-700 ml-0.5"
                      title="ចម្លង"
                    >
                      {copiedKey === "uuic" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}

                {vcctId && (
                  <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/60">
                    <span>លេខកូដ VCCT: #{vcctId}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(String(vcctId), "vcctId", e)}
                      className="text-slate-400 hover:text-slate-600 ml-0.5"
                      title="ចម្លង"
                    >
                      {copiedKey === "vcctId" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}

                {pmrs && (
                  <span className="text-[11.5px] text-slate-500 dark:text-zinc-400 font-uuic">
                    PMRS: {pmrs}
                  </span>
                )}
              </div>

              {/* Master Patient Linkage Status Badge */}
              <div className="mt-2.5">
                <LinkStatusBadge
                  size="md"
                  status={
                    profile?.foundInVcct && profile?.foundInArt
                      ? "verified"
                      : uuic && (artnum || vcctId)
                      ? "proposed"
                      : "unlinked"
                  }
                  confidenceScore={92}
                  mpiId={uuic ? `MPI-${uuic}` : undefined}
                  linkedSystems={
                    [
                      npdCase ? "NPD" : undefined,
                      profile?.foundInVcct || vcctId ? "VCCT" : undefined,
                      profile?.foundInArt || artnum ? "ART" : undefined,
                    ].filter(Boolean) as Array<"NPD" | "VCCT" | "ART">
                  }
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Main View Switcher (If NPD data available) ─── */}
        {npdCase && (
          <div className="flex border-b border-slate-100 bg-white px-6 pt-2 dark:border-zinc-800 dark:bg-zinc-950 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMainTab("clinical")}
              className={cn(
                "border-b-2 px-3.5 py-2 text-[12.5px] font-bold transition-all",
                activeMainTab === "clinical"
                  ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
              )}
            >
              ប្រវត្តិគ្លីនិក VCCT & ART
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab("npd")}
              className={cn(
                "border-b-2 px-3.5 py-2 text-[12.5px] font-bold transition-all",
                activeMainTab === "npd"
                  ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400"
              )}
            >
              ការតាមដាន NPD
            </button>
          </div>
        )}

        {/* ─── Sub-Tab Navigation: VCCT vs ART ─── */}
        {activeMainTab === "clinical" && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-2.5 bg-white dark:border-zinc-800 dark:bg-zinc-950 shrink-0">
            <button
              type="button"
              onClick={() => setClinicalTab("vcct")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-[13px] font-bold transition-all",
                clinicalTab === "vcct"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              <TestTube2 className="h-4 w-4" />
              <span>VCCT</span>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              ) : (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    clinicalTab === "vcct"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                >
                  {vcctCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setClinicalTab("art")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-[13px] font-bold transition-all",
                clinicalTab === "art"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              <Pill className="h-4 w-4" />
              <span>ART</span>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              ) : (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    clinicalTab === "art"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                >
                  {artCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ─── Modal Scrollable Body ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeMainTab === "npd" && npdCase ? (
            /* ─── NPD Surveillance Tab ─── */
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="text-[12px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
                  ព័ត៌មានប្រជាសាស្ត្រ
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px]">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ភេទ</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{npdCase.gender || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ថ្ងៃខែឆ្នាំកំណើត</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {npdCase.dob || "—"} {npdCase.age ? `(${npdCase.age} ឆ្នាំ)` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ក្រុមគោលដៅ</span>
                    <span className="font-semibold text-violet-700 dark:text-violet-400">{npdCase.kpType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ការវាយតម្លៃហានិភ័យ</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{npdCase.riskLevel || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="text-[12px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
                  ទីតាំង និងមូលដ្ឋានសុខាភិបាល
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ខេត្ត</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{npdCase.province || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ស្រុក / ខណ្ឌ</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{npdCase.district || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ទីតាំងហតស្ប៉ត</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{npdCase.hotspotName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">លេខកូដអង្គភាព</span>
                    <span className="text-[11.5px] text-slate-500 dark:text-zinc-400">{npdCase.orgUnit || "—"}</span>
                  </div>
                </div>
              </div>

              {npdCase.rawAttributes && npdCase.rawAttributes.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h4 className="text-[12px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                    គុណលក្ខណៈទាំងអស់ពីប្រព័ន្ធ NPD ({npdCase.rawAttributes.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-56 overflow-y-auto">
                    {npdCase.rawAttributes.map((attr, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 text-[12px]">
                        <span className="text-slate-500 dark:text-zinc-400">
                          {attr.displayName || attr.attribute}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 text-right max-w-[280px] truncate">
                          {attr.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── Clinical Tab (VCCT or ART) ─── */
            <>
              {/* Loading Skeleton */}
              {loading && (
                <div className="flex flex-col gap-3 py-6 animate-pulse">
                  <div className="h-6 w-52 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                  <div className="h-36 rounded-2xl bg-slate-100 dark:bg-zinc-900" />
                  <div className="h-36 rounded-2xl bg-slate-100 dark:bg-zinc-900" />
                </div>
              )}

              {/* Error Message */}
              {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-[12.5px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="h-4 w-4" />
                    <span>មិនអាចទាញទិន្នន័យពី MySQL បានទេ</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-rose-600/90 dark:text-rose-400">{error}</p>
                </div>
              )}

              {/* ── VCCT Content ── */}
              {!loading && !error && clinicalTab === "vcct" && (
                <div className="flex flex-col gap-5">
                  {vcctCount === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
                      <TestTube2 className="h-10 w-10 text-slate-300 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
                      <p className="text-[13.5px] font-semibold text-slate-700 dark:text-zinc-300">
                        មិនមានទិន្នន័យ VCCT
                      </p>
                      <p className="mt-1 text-[11.5px] text-slate-400 dark:text-zinc-500 max-w-sm">
                        មិនមានកំណត់ត្រាពិនិត្យឈាមរកមេរោគអេដស៍ក្នុងមូលដ្ឋានទិន្នន័យ VCCT សម្រាប់កូដនេះឡើយ
                      </p>
                    </div>
                  ) : (
                    profile?.vcct.map((v, idx) => (
                      <VcctProfileCard key={v.vcct_id || idx} record={v} index={idx} />
                    ))
                  )}
                </div>
              )}

              {/* ── ART Content ── */}
              {!loading && !error && clinicalTab === "art" && (
                <div className="flex flex-col gap-6">
                  {artCount === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
                      <Pill className="h-10 w-10 text-slate-300 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
                      <p className="text-[13.5px] font-semibold text-slate-700 dark:text-zinc-300">
                        មិនមានទិន្នន័យ ART
                      </p>
                      <p className="mt-1 text-[11.5px] text-slate-400 dark:text-zinc-500 max-w-sm">
                        មិនមានកំណត់ត្រាព្យាបាលដោយឱសថប្រឆាំងមេរោគអេដស៍ក្នុងប្រព័ន្ធទិន្នន័យ ART សម្រាប់កូដនេះឡើយ
                      </p>
                    </div>
                  ) : (
                    profile?.art.map((art, idx) => (
                      <ArtProfileCard
                        key={`${art.site_code}-${art.ClinicID}-${idx}`}
                        art={art}
                        index={idx}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Modal Footer ─── */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/40 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200/90 px-6 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            បិទព័ត៌មាន
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VCCT Profile Card Component
// ─────────────────────────────────────────────────────────────────────────────
function VcctProfileCard({ record, index }: { record: VcctRecord; index: number }) {
  const addressText = [record.commune_kh, record.district_kh, record.province_kh]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 font-bold text-[13px] shrink-0">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-slate-900 dark:text-zinc-100">
                {record.site_name}
              </span>
              {record.od_name && (
                <span className="text-[12px] text-slate-400 dark:text-zinc-500">
                  ({record.od_name})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-zinc-500 mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>កាលបរិច្ឆេទធ្វើតេស្ត: <strong className="text-slate-700 dark:text-zinc-300 font-uuic">{record.registration_date || "—"}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* HIV Result Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold shadow-2xs",
              record.hiv_result === 2
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/60"
                : record.hiv_result === 1
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60"
            )}
          >
            {record.hiv_result === 2 ? (
              <XCircle className="h-4 w-4" />
            ) : record.hiv_result === 1 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            {record.hiv_result_kh}
          </span>

          {/* RTRI Result Badge if present */}
          {record.rtri_result_kh && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60">
              {record.rtri_result_kh}
            </span>
          )}
        </div>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] bg-slate-50/70 p-3.5 rounded-2xl dark:bg-zinc-800/40">
        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ UUIC</span>
          <span className="font-bold text-violet-700 dark:text-violet-400 font-uuic text-[13px]">
            {record.uuic || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">លេខកូដ VCCT</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 font-uuic">
            #{record.vcct_id}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ PMRS</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
            {record.pmrs_code || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ HTS</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
            {record.hts_code || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ភេទ / អាយុ</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {record.sex_label || "—"} {record.age ? `(${record.age} ឆ្នាំ)` : ""}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">មុខរបរ</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {record.occupation_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ក្រុមគោលដៅ</span>
          <span className="font-semibold text-violet-700 dark:text-violet-400">
            {record.patient_type_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ប្រភពបញ្ជូនមក</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {record.refer_from_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">បញ្ជូនបន្តទៅ</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {record.refer_service_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ថ្ងៃប្រឹក្សាក្រោយធ្វើតេស្ត</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
            {record.post_counseling_date || "—"}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ទូរស័ព្ទ / ប័ណ្ណក្រីក្រ</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
            {record.phone_number || (record.idpoor ? `ក្រីក្រ: ${record.idpoor}` : "—")}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">អាសយដ្ឋាន</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate block" title={addressText}>
            {addressText || "—"}
          </span>
        </div>
      </div>

      {/* Risk Factors Section (1-18) */}
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <h5 className="text-[12px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>កត្តាហានិភ័យដែលបានកត់ត្រា (Risk Factors)</span>
        </h5>
        {record.risks && record.risks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {record.risks.map((risk, ridx) => (
              <span
                key={ridx}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-100/80 px-2.5 py-1 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {risk}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 italic">
            មិនមានកត់ត្រាកត្តាហានិភ័យពិសេស
          </p>
        )}
      </div>

      {/* Line Test Results (Cambo Ag/Ab / Line tests) */}
      {record.line_tests && (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-850/30">
          <h5 className="text-[11.5px] font-bold text-slate-600 dark:text-zinc-400 mb-2">
            លទ្ធផលតេស្តបន្ទាត់ & Cambo (Line Test & Antigen/Antibody Results)
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
            <div>
              <span className="text-[10.5px] text-slate-400 block">Line Control:</span>
              <span className="font-semibold font-uuic">{record.line_tests.line_control === 1 ? "Positive" : record.line_tests.line_control === 2 ? "Negative" : "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">Line Positive:</span>
              <span className="font-semibold font-uuic">{record.line_tests.line_positive === 1 ? "Positive" : record.line_tests.line_positive === 2 ? "Negative" : "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">Line Longterm:</span>
              <span className="font-semibold font-uuic">{record.line_tests.line_longterm === 1 ? "Long-term" : record.line_tests.line_longterm === 2 ? "Recent" : "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">Cambo Ag:</span>
              <span className="font-semibold font-uuic">{record.line_tests.cambo_ag === 1 ? "Reactive" : record.line_tests.cambo_ag === 2 ? "Non-reactive" : "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">Cambo Ab:</span>
              <span className="font-semibold font-uuic">{record.line_tests.cambo_ab === 1 ? "Reactive" : record.line_tests.cambo_ab === 2 ? "Non-reactive" : "—"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ART Profile Card Component
// ─────────────────────────────────────────────────────────────────────────────
function ArtProfileCard({ art, index }: { art: ArtPatientProfile; index: number }) {
  const [selectedDrugTab, setSelectedDrugTab] = useState<"arv" | "tpt" | "tb" | "oi">("arv")

  // Current drug list to display based on selected drug tab
  const activeDrugs: ArtPrescribedDrug[] =
    selectedDrugTab === "tpt"
      ? art.tptDrugs
      : selectedDrugTab === "tb"
      ? art.tbDrugs
      : selectedDrugTab === "oi"
      ? art.oiDrugs
      : art.drugs

  // Group ARV drugs by date to form combined regimens (e.g. TDF + 3TC + DTG or ABC + 3TC + DTG)
  const combinedArvGroups = React.useMemo(() => {
    if (!art.drugs || art.drugs.length === 0) return []
    const map = new Map<string, ArtPrescribedDrug[]>()
    for (const d of art.drugs) {
      const key = d.Da || "មិនបានកត់ត្រា"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries()).map(([date, items]) => {
      const names = items.map((i) => i.DrugName.trim()).filter(Boolean)
      const combinedName = names.join(" + ")
      const doseDetails = items
        .map((i) => `${i.DrugName} ${i.Dose}`.trim())
        .filter(Boolean)
        .join(" · ")
      const statusText = items[0]?.StatusText || "បន្តប្រើ"
      const freq = items[0]?.Freq || ""
      const totalQty = items.reduce((sum, i) => sum + (i.Quantity || 0), 0)
      return {
        date,
        combinedName,
        doseDetails,
        statusText,
        freq,
        totalQty,
        itemCount: items.length,
        items,
      }
    })
  }, [art.drugs])

  const fullAddress = [
    art.demographics?.village ? `ភូមិ ${art.demographics.village}` : null,
    art.demographics?.commune ? `ឃុំ/សង្កាត់ ${art.demographics.commune}` : null,
    art.demographics?.district ? `ស្រុក/ខណ្ឌ ${art.demographics.district}` : null,
    art.demographics?.province ? `ខេត្ត/ក្រុង ${art.demographics.province}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 space-y-4">
      {/* ── Header: Facility Name, ART Number, Clinic ID & Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold shrink-0">
            <Hospital className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[15.5px] font-bold text-slate-900 dark:text-zinc-100">
                {art.site_name}
              </h4>
              {art.patientTypeLabel && (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-bold",
                    art.isChild
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  )}
                >
                  {art.patientTypeLabel}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {art.od_name} · លេខកូដ ART:{" "}
              <span className="font-uuic font-bold text-emerald-700 dark:text-emerald-400">
                {art.Artnum || "—"}
              </span>{" "}
              · លេខកូដគ្លីនិក:{" "}
              <span className="font-bold text-slate-700 dark:text-zinc-300">#{art.ClinicID}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold shadow-2xs border",
              art.status?.badgeColor ||
                "bg-emerald-100 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current shrink-0" />
            {art.status?.statusText || "កំពុងទទួលការព្យាបាល ART"}
          </span>
          {art.status?.cause && (
            <span className="text-[11.5px] font-medium text-slate-500 dark:text-zinc-400">
              {art.status.cause} {art.status.date ? `(${art.status.date})` : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Section 1: Demographics & Registration Profile (ai / ci) ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-850/40 space-y-3">
        <h5 className="text-[12px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
          <User className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>ព័ត៌មានចុះឈ្មោះ</span>
        </h5>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ភេទ / អាយុ</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {art.SexLabel || "—"} {art.Age ? `(${art.Age} ឆ្នាំ)` : ""}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ថ្ងៃខែឆ្នាំកំណើត</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
              {art.DaBirth || "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">លេខទូរស័ព្ទ</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
              {art.demographics?.phone || "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ស្ថានភាពគ្រួសារ</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {art.demographics?.maritalLabel || "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">មុខរបរ</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {art.demographics?.occupation || "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កម្រិតវប្បធម៌</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {art.EducationLabel || "—"}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">អាសយដ្ឋានបច្ចុប្បន្ន</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate block" title={fullAddress}>
              {fullAddress || "—"}
            </span>
          </div>
        </div>

        {/* Key Clinical Dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60 dark:border-zinc-800 text-[12px]">
          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ចាប់ផ្តើម ART</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-uuic">
              {art.DaART || "—"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ដឹងថាមានមេរោគ</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
              {art.DaHIV || "—"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">មកពិនិត្យដំបូង</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
              {art.DafirstVisit || "—"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ប្រភពបញ្ជូនមក</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {art.ReferredLabel || "—"} {art.Orefferred ? `(${art.Orefferred})` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Regimens & TB/TPT Clinical History ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
        {/* Regimens Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 space-y-2">
          <h6 className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-emerald-600" />
            <span>រូបមន្តថ្នាំ ART</span>
          </h6>
          <div className="flex flex-wrap gap-2">
            {combinedArvGroups.length > 0 && (
              <div className="rounded-lg bg-emerald-100/90 px-2.5 py-1 text-[12px] border border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 font-uuic">
                  {combinedArvGroups[0].combinedName}
                </span>
                {combinedArvGroups[0].date && (
                  <span className="ml-1.5 text-[10.5px] text-emerald-700 dark:text-emerald-400 font-uuic">
                    ({combinedArvGroups[0].date})
                  </span>
                )}
              </div>
            )}
            {art.regimens &&
              art.regimens
                .filter((reg) => reg.ART !== art.Artnum && reg.ART !== combinedArvGroups[0]?.combinedName)
                .map((reg, ridx) => (
                  <div
                    key={ridx}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 font-uuic">
                      {reg.ART}
                    </span>
                    {reg.DaArt && (
                      <span className="ml-1.5 text-[10.5px] text-slate-500 dark:text-zinc-400 font-uuic">
                        ({reg.DaArt})
                      </span>
                    )}
                  </div>
                ))}
            {combinedArvGroups.length === 0 && (!art.regimens || art.regimens.length === 0) && (
              <p className="text-[11.5px] text-slate-400 italic">មិនមានកត់ត្រារូបមន្ត</p>
            )}
          </div>
        </div>

        {/* TB & TPT Care Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 space-y-2">
          <h6 className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            <span>ប្រវត្តិរបេង និង TPT</span>
          </h6>
          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
            <div>
              <span className="text-[10.5px] text-slate-400 block">ប្រវត្តិរបេង:</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">
                {art.TbPastLabel || "គ្មាន"}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block">ព្យាបាលរបេង:</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">
                {art.TbtreatLabel || "—"} {art.TypeTBLabel ? `(${art.TypeTBLabel})` : ""}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[10.5px] text-slate-400 block">ថ្នាំបង្ការ TPT:</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">
                {art.TPTLabel || "—"}{" "}
                {art.DaStartTPT ? `(ចាប់ផ្តើម: ${art.DaStartTPT} ដល់ ${art.DaEndTPT || "បច្ចុប្បន្ន"})` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Allergies & Clinical Treatment History (if present) ── */}
      {art.allergies && art.allergies.length > 0 && (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20">
          <h6 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-2 text-[12px]">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>អាឡែកហ្ស៊ីថ្នាំ</span>
          </h6>
          <div className="flex flex-wrap gap-2">
            {art.allergies.map((al, alidx) => (
              <span
                key={alidx}
                className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
              >
                <strong>{al.DrugName}</strong>: {al.AllergyLabel} {al.Da ? `(${al.Da})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pediatric Family Details if present */}
      {art.family && art.family.length > 0 && (
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <h6 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 mb-2 text-[12px]">
            <Users className="h-4 w-4 text-blue-600 shrink-0" />
            <span>ស្ថានភាពគ្រួសារ</span>
          </h6>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
            {art.family.map((f, fidx) => (
              <div key={fidx} className="bg-white/80 p-2 rounded-lg border border-blue-100 dark:bg-zinc-900/50 dark:border-zinc-800">
                <span className="font-bold">{f.Faminily}</span> (អាយុ: {f.Age} ឆ្នាំ) · ស្ថានភាព: {f.HIVstatus} · ចាប់ផ្តើម ART: {f.StartARV || "—"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Prescribed Drugs Table with Multi-Category Tabs ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h5 className="text-[12.5px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-emerald-600" />
            <span>ថ្នាំ</span>
          </h5>

          {/* Category Tabs: ARV, TPT, TB, OI */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl dark:bg-zinc-800 text-[11.5px] font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDrugTab("arv")}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all",
                selectedDrugTab === "arv"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400"
              )}
            >
              ARV ({art.drugs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDrugTab("tpt")}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all",
                selectedDrugTab === "tpt"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400"
              )}
            >
              TPT ({art.tptDrugs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDrugTab("tb")}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all",
                selectedDrugTab === "tb"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400"
              )}
            >
              TB ({art.tbDrugs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDrugTab("oi")}
              className={cn(
                "rounded-lg px-2.5 py-1 transition-all",
                selectedDrugTab === "oi"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-zinc-400"
              )}
            >
              OI ({art.oiDrugs.length})
            </button>
          </div>
        </div>

        {activeDrugs.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 shadow-2xs">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-slate-50 text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400 border-b border-slate-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4 font-medium">កាលបរិច្ឆេទ</th>
                  <th className="py-2.5 px-4 font-medium">ឈ្មោះថ្នាំ</th>
                  <th className="py-2.5 px-4 font-medium">ស្ថានភាព</th>
                  <th className="py-2.5 px-4 font-medium">កម្រិតថ្នាំ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-slate-800 dark:text-zinc-200">
                {activeDrugs.map((d, didx) => (
                  <tr key={didx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-uuic text-slate-700 dark:text-zinc-300">
                      {d.Da || "—"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100 font-uuic">
                      {d.DrugName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">
                      {d.StatusText || "បន្ត"}
                    </td>
                    <td className="py-3 px-4 font-uuic text-slate-800 dark:text-zinc-200">
                      {d.Dose || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-[12px] text-slate-400 dark:border-zinc-800 dark:bg-zinc-900/30">
            មិនមានទិន្នន័យថ្នាំក្នុងប្រភេទនេះឡើយ
          </div>
        )}
      </div>

      {/* ── Section 5: Lab Tests Table (CD4, Viral Load, HGB, Creatinine) ── */}
      {art.tests.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <h5 className="text-[12.5px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <TestTube2 className="h-4 w-4 text-violet-600" />
            <span>លទ្ធផលមន្ទីរពិសោធន៍ (Viral Load & CD4)</span>
          </h5>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-slate-600 dark:bg-zinc-800/70 dark:text-zinc-300 border-b border-slate-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">កាលបរិច្ឆេទ</th>
                  <th className="py-2.5 px-3.5 font-semibold">Viral Load (copies/mL)</th>
                  <th className="py-2.5 px-3.5 font-semibold">Log10</th>
                  <th className="py-2.5 px-3.5 font-semibold">CD4 (cells/mm³)</th>
                  <th className="py-2.5 px-3.5 font-semibold">HCV / HBsAg / ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                {art.tests.map((t, tidx) => (
                  <tr key={tidx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3.5 font-medium font-uuic">{t.Dat || "—"}</td>
                    <td className="py-2.5 px-3.5 font-bold font-uuic text-violet-700 dark:text-violet-400">
                      {t.HIVLoad !== null ? t.HIVLoad : "—"}
                    </td>
                    <td className="py-2.5 px-3.5 font-uuic">{t.HIVLog !== null ? t.HIVLog : "—"}</td>
                    <td className="py-2.5 px-3.5 font-uuic font-semibold">{t.CD4 !== null ? t.CD4 : "—"}</td>
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-zinc-400 text-[11.5px]">
                      {t.HCV ? `HCV: ${t.HCV}` : ""}
                      {t.HBsAg !== null && t.HBsAg !== undefined && t.HBsAg !== -1 ? ` | HBsAg: ${t.HBsAg}` : ""}
                      {t.Creatinine ? ` | Creatinine: ${t.Creatinine}` : ""}
                      {t.HGB ? ` | HGB: ${t.HGB}` : ""}
                      {!t.HCV && (t.HBsAg === null || t.HBsAg === undefined || t.HBsAg === -1) && !t.Creatinine && !t.HGB ? "—" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section 6: Clinical Visits Table (from av: tblavmain / cv: tblcvmain) ── */}
      {art.visits.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <h5 className="text-[12.5px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-emerald-600" />
            <span>ការមកពិនិត្យសុខភាព (Clinical Visits)</span>
          </h5>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-slate-600 dark:bg-zinc-800/70 dark:text-zinc-300 border-b border-slate-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">កាលបរិច្ឆេទ</th>
                  <th className="py-2.5 px-3.5 font-semibold">ប្រភេទការមក</th>
                  <th className="py-2.5 px-3.5 font-semibold">ទម្ងន់/កម្ពស់</th>
                  <th className="py-2.5 px-3.5 font-semibold">សម្ពាធឈាម</th>
                  <th className="py-2.5 px-3.5 font-semibold">ការលេបថ្នាំ</th>
                  <th className="py-2.5 px-3.5 font-semibold">WHO Staging</th>
                  <th className="py-2.5 px-3.5 font-semibold">ណាត់បន្ទាប់</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                {art.visits.map((v, vidx) => (
                  <tr key={vidx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3.5 font-medium font-uuic">{v.DatVisit || "—"}</td>
                    <td className="py-2.5 px-3.5 text-slate-700 dark:text-zinc-200 font-medium">
                      {v.TypeVisitText || "—"}
                    </td>
                    <td className="py-2.5 px-3.5 font-uuic">
                      {v.Weight ? `${v.Weight}kg` : "—"}
                      {v.Height && v.Height > 0 ? ` / ${v.Height}cm` : ""}
                    </td>
                    <td className="py-2.5 px-3.5 font-uuic">{v.Blood || "—"}</td>
                    <td className="py-2.5 px-3.5">
                      {v.ARTAdher ? (
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[11px] font-bold",
                            v.ARTAdher === "True"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          )}
                        >
                          {v.ARTAdher === "True" ? "ទៀងទាត់" : "មិនទៀងទាត់"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-600 dark:text-zinc-300">
                      {v.WHOLabel || (v.WHO ? `Stage ${v.WHO}` : "—")}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-zinc-400 font-medium font-uuic">
                      {v.DaApp || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
