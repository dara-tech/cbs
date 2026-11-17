"use client"

import React, { useState, useEffect } from "react"
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  Hospital,
  Info,
  Loader2,
  Phone,
  Pill,
  ShieldAlert,
  TestTube2,
  User,
  XCircle,
} from "lucide-react"
import type { CombinedClientProfile, VcctRecord, ArtPatientProfile } from "@/lib/mysqlClient"

interface ClientClinicalProfileProps {
  uuic?: string
  pmrs?: string
  hts?: string
  artnum?: string
  vcctId?: string | number
  clientName?: string
  defaultTab?: "vcct" | "art"
  onClose?: () => void
}

export function ClientClinicalProfile({
  uuic,
  pmrs,
  hts,
  artnum,
  vcctId,
  clientName,
  defaultTab,
}: ClientClinicalProfileProps) {
  const [activeTab, setActiveTab] = useState<"vcct" | "art">(defaultTab || (artnum ? "art" : "vcct"))
  const [profile, setProfile] = useState<CombinedClientProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function fetchProfile() {
      if (!uuic && !pmrs && !hts && !artnum && !vcctId) {
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

        const res = await fetch(`/api/mysql/profile?${queryParams.toString()}`)
        const json = await res.json()

        if (!isMounted) return

        if (json.ok && json.data) {
          setProfile(json.data)
          if (defaultTab) {
            setActiveTab(defaultTab)
          } else if (artnum && json.data.art?.length > 0) {
            setActiveTab("art")
          } else if (json.data.vcct?.length > 0) {
            setActiveTab("vcct")
          } else if (json.data.art?.length > 0) {
            setActiveTab("art")
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
  }, [uuic, pmrs, hts, artnum, vcctId, defaultTab])

  const vcctCount = profile?.vcct?.length || 0
  const artCount = profile?.art?.length || 0

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("vcct")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
            activeTab === "vcct"
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          <TestTube2 className="h-4 w-4" />
          <span>VCCT</span>
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "vcct"
                  ? "bg-white/20 text-white"
                  : vcctCount > 0
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  : "bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {vcctCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("art")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
            activeTab === "art"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>ART</span>
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "art"
                  ? "bg-white/20 text-white"
                  : artCount > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {artCount}
            </span>
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex flex-col gap-3 py-6 animate-pulse">
          <div className="h-4 w-48 rounded-lg bg-slate-200 dark:bg-zinc-800" />
          <div className="h-28 rounded-2xl bg-slate-100 dark:bg-zinc-900" />
          <div className="h-28 rounded-2xl bg-slate-100 dark:bg-zinc-900" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-[12.5px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>មិនអាចទាញទិន្នន័យគ្លីនិកបានទេ</span>
          </div>
          <p className="mt-1 text-[11.5px] text-rose-600/90 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* VCCT Tab Content */}
      {!loading && !error && activeTab === "vcct" && (
        <div className="flex flex-col gap-3">
          {vcctCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
              <TestTube2 className="h-8 w-8 text-slate-300 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
              <p className="text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
                មិនមានទិន្នន័យពិនិត្យឈាម VCCT
              </p>
              <p className="mt-1 text-[11.5px] text-slate-400 dark:text-zinc-500 max-w-sm">
                មិនមានកំណត់ត្រាពិនិត្យឈាមរកមេរោគអេដស៍ក្នុងមូលដ្ឋានទិន្នន័យ VCCT សម្រាប់កូដនេះឡើយ
              </p>
            </div>
          ) : (
            profile?.vcct.map((v, idx) => (
              <div
                key={v.vcct_id || idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 font-bold text-[12px]">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-zinc-100">
                          {v.site_name}
                        </span>
                        {v.od_name && (
                          <span className="text-[11.5px] text-slate-400 dark:text-zinc-500">
                            ({v.od_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>កាលបរិច្ឆេទធ្វើតេស្ត: {v.registration_date || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* HIV Result Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-bold ${
                      v.hiv_result === 2
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : v.hiv_result === 1
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {v.hiv_result === 2 ? (
                      <XCircle className="h-3 w-3" />
                    ) : v.hiv_result === 1 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Info className="h-3 w-3" />
                    )}
                    {v.hiv_result_kh}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 text-[12px]">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ UUIC</span>
                    <span className="font-semibold text-violet-700 dark:text-violet-400 font-mono">
                      {v.uuic || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">លេខកូដ VCCT</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                      #{v.vcct_id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ PMRS</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                      {v.pmrs_code || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កូដ HTS</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
                      {v.hts_code || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ក្រុមគោលដៅ</span>
                    <span className="font-semibold text-violet-700 dark:text-violet-400">
                      {v.patient_type_name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">បញ្ជូនបន្តទៅ</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {v.refer_service_name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">កាលបរិច្ឆេទប្រឹក្សា</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {v.post_counseling_date || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">បន្ទុកវីរុស (VL Result)</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {v.vl_result === 1 ? "Detectable" : v.vl_result === 2 ? "Undetectable" : "មិនបានធ្វើ"}
                    </span>
                  </div>

                  {v.phone_number && (
                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">លេខទូរស័ព្ទ</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {v.phone_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ART Tab Content */}
      {!loading && !error && activeTab === "art" && (
        <div className="flex flex-col gap-4">
          {artCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
              <Pill className="h-8 w-8 text-slate-300 dark:text-zinc-600 mb-2" strokeWidth={1.5} />
              <p className="text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
                មិនមានទិន្នន័យព្យាបាល ART
              </p>
              <p className="mt-1 text-[11.5px] text-slate-400 dark:text-zinc-500 max-w-sm">
                មិនមានកំណត់ត្រាព្យាបាលដោយឱសថប្រឆាំងមេរោគអេដស៍ក្នុងប្រព័ន្ធទិន្នន័យ ART សម្រាប់កូដនេះឡើយ
              </p>
            </div>
          ) : (
            profile?.art.map((art, idx) => (
              <div
                key={`${art.site_code}-${art.ClinicID}-${idx}`}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 flex flex-col gap-3"
              >
                {/* Header Facility & Clinic ID */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                      <Hospital className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-zinc-100">
                        {art.site_name}
                      </h4>
                      <p className="text-[11.5px] text-slate-400 dark:text-zinc-500">
                        {art.od_name} · លេខកូដ ART:{" "}
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {art.Artnum || "—"}
                        </span>{" "}
                        · លេខកូដគ្លីនិក: #{art.ClinicID}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    កំពុងទទួលការព្យាបាល ART
                  </span>
                </div>

                {/* Key Dates Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-[12px] bg-slate-50/70 p-3 rounded-xl dark:bg-zinc-800/40">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ចាប់ផ្តើម ART</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {art.DaART || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ដឹងថាមានមេរោគ</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {art.DaHIV || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">មកពិនិត្យដំបូង</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {art.DafirstVisit || "—"}
                    </span>
                  </div>
                </div>

                {/* Lab Tests Table (CD4, Viral Load) */}
                {art.tests.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <h5 className="text-[11.5px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <TestTube2 className="h-3.5 w-3.5 text-violet-600" />
                      <span>លទ្ធផលមន្ទីរពិសោធន៍ (Viral Load & CD4)</span>
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">កាលបរិច្ឆេទ</th>
                            <th className="py-2 px-3">Viral Load (copies/mL)</th>
                            <th className="py-2 px-3">Log10</th>
                            <th className="py-2 px-3">CD4</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                          {art.tests.slice(0, 5).map((t, tidx) => (
                            <tr key={tidx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                              <td className="py-2 px-3 font-medium">{t.Dat || "—"}</td>
                              <td className="py-2 px-3 font-mono font-bold text-violet-700 dark:text-violet-400">
                                {t.HIVLoad !== null ? t.HIVLoad : "—"}
                              </td>
                              <td className="py-2 px-3 font-mono">{t.HIVLog !== null ? t.HIVLog : "—"}</td>
                              <td className="py-2 px-3 font-mono font-semibold">{t.CD4 !== null ? t.CD4 : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Clinical Visits Table */}
                {art.visits.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <h5 className="text-[11.5px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ការមកពិនិត្យសុខភាពចុងក្រោយ (Clinical Visits)</span>
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">កាលបរិច្ឆេទ</th>
                            <th className="py-2 px-3">ទម្ងន់/កម្ពស់</th>
                            <th className="py-2 px-3">សម្ពាធឈាម</th>
                            <th className="py-2 px-3">ការលេបថ្នាំ</th>
                            <th className="py-2 px-3">ណាត់បន្ទាប់</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                          {art.visits.slice(0, 5).map((v, vidx) => (
                            <tr key={vidx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                              <td className="py-2 px-3 font-medium">{v.DatVisit || "—"}</td>
                              <td className="py-2 px-3">
                                {v.Weight ? `${v.Weight}kg` : "—"}
                                {v.Height ? ` / ${v.Height}cm` : ""}
                              </td>
                              <td className="py-2 px-3 font-mono">{v.Blood || "—"}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                                    v.ARTAdher === "True"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  }`}
                                >
                                  {v.ARTAdher === "True" ? "ទៀងទាត់" : "មិនទៀងទាត់"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 font-medium">
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
            ))
          )}
        </div>
      )}
    </div>
  )
}
