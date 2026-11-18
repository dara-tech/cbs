"use client"

import React, { useState, useEffect } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen,
  GitMerge,
  Layers,
  Link2,
  Loader2,
  Phone,
  Pill,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Unlink,
  User,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LinkStatusBadge } from "./LinkStatusBadge"
import { MatchReviewModal } from "./MatchReviewModal"
import { ManualLinkModal } from "./ManualLinkModal"
import type {
  UnifiedClientRecord,
  CandidateMatchResult,
  LinkageStatsSummary,
  LinkageStatus,
} from "./types"

export function LinkageHubView() {
  // Active Tab Queue
  const [activeQueue, setActiveQueue] = useState<
    "pending" | "cascade_art" | "unlinked_npd" | "conflicts"
  >("pending")

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false)
  const [manualLinkOpen, setManualLinkOpen] = useState<boolean>(false)
  const [activeSourceRecord, setActiveSourceRecord] = useState<UnifiedClientRecord | null>(null)
  const [activeCandidate, setActiveCandidate] = useState<CandidateMatchResult | null>(null)

  // Batch Selection
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([])
  const [batchActionRunning, setBatchActionRunning] = useState<boolean>(false)
  const [autoEngineRunning, setAutoEngineRunning] = useState<boolean>(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Search & Filter
  const [filterText, setFilterText] = useState<string>("")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [loading, setLoading] = useState<boolean>(false)

  // Linkage Statistics
  const [stats, setStats] = useState<LinkageStatsSummary>({
    totalPatients: 18450,
    verifiedCount: 15940,
    proposedCount: 382,
    conflictedCount: 28,
    unlinkedCount: 2100,
    overallLinkageRate: 86.4,
    threeWayLinkedRate: 64.8,
    cascadeGaps: {
      vcctPositiveNotLinkedToArt: 86,
      npdPositiveNotLinkedToVcct: 142,
    },
    lastUpdated: new Date().toLocaleTimeString("km-KH"),
  })

  // Mock Queue Items
  const [pendingQueue, setPendingQueue] = useState<
    Array<{
      id: string
      source: UnifiedClientRecord
      candidate: CandidateMatchResult
    }>
  >([
    {
      id: "pair-1",
      source: {
        system: "NPD",
        recordKey: "npd-tei-99120",
        identifiers: { uuic: "BTM-1990-00124", dhis2TeiId: "tei-99120" },
        demographics: {
          nameKh: "ចាន់ សុភ័ក្រ",
          sex: "M",
          dob: "1990-04-10",
          age: 34,
          phone: "012334455",
          province: "បាត់ដំបង",
          siteName: "មន្ទីរពេទ្យបង្អែកខេត្តបាត់ដំបង",
        },
        clinical: { hivResult: "reactive", hivResultLabel: "វិជ្ជមាន (Reactive)", testDate: "2024-01-15" },
        linkStatus: "proposed",
      },
      candidate: {
        candidateId: "cand-vcct-881",
        confidenceScore: 92,
        classification: "HIGH",
        matchTier: "TIER_1_AUTO",
        candidateRecord: {
          system: "VCCT",
          recordKey: "vcct-44812",
          identifiers: { uuic: "BTM-1990-00124", pmrs: "PMRS-8810", vcctId: 44812 },
          demographics: {
            nameKh: "ចាន់ សុភ័ក្ត្រ",
            sex: "M",
            dob: "1990-04-10",
            age: 34,
            phone: "012334455",
            province: "បាត់ដំបង",
            siteName: "មន្ទីរពេទ្យបង្អែកខេត្តបាត់ដំបង",
          },
          clinical: { hivResult: 2, hivResultLabel: "វិជ្ជមាន (Reactive)", testDate: "2024-01-16" },
        },
        criteria: {
          exactUuic: true,
          exactDob: true,
          phoneMatch: true,
          facilityProximity: true,
          reasons: [
            { labelKh: "កូដ UUIC ដូចគ្នាទាំងស្រុង", labelEn: "Exact UUIC Match", points: 45, type: "positive" },
            { labelKh: "ថ្ងៃខែឆ្នាំកំណើត និងអាយុដូចគ្នា", labelEn: "Exact DOB & Age", points: 20, type: "positive" },
            { labelKh: "លេខទូរស័ព្ទដូចគ្នា", labelEn: "Exact Phone Match", points: 15, type: "positive" },
            { labelKh: "ទីតាំងមន្ទីរពេទ្យដូចគ្នា", labelEn: "Same Facility", points: 12, type: "positive" },
          ],
        },
      },
    },
    {
      id: "pair-2",
      source: {
        system: "VCCT",
        recordKey: "vcct-10928",
        identifiers: { uuic: "SR-1985-00941", pmrs: "PMRS-5519", vcctId: 10928 },
        demographics: {
          nameKh: "លី ស្រីមុំ",
          sex: "F",
          dob: "1985-11-22",
          age: 39,
          phone: "0977881122",
          province: "សៀមរាប",
          siteName: "មន្ទីរពេទ្យបង្អែកសៀមរាប",
        },
        clinical: { hivResult: 2, hivResultLabel: "វិជ្ជមាន (Reactive)", testDate: "2023-10-12" },
        linkStatus: "proposed",
      },
      candidate: {
        candidateId: "cand-art-991",
        confidenceScore: 84,
        classification: "MEDIUM",
        matchTier: "TIER_2_MANUAL",
        candidateRecord: {
          system: "ART",
          recordKey: "art-1194",
          identifiers: { artnum: "14/2023", clinicId: 302, pmrs: "PMRS-5519" },
          demographics: {
            nameKh: "លី ស្រីម៉ុម",
            sex: "F",
            dob: "1985-11-20", // 2 days diff
            age: 39,
            phone: "0977881122",
            province: "សៀមរាប",
            siteName: "មន្ទីរពេទ្យបង្អែកសៀមរាប",
          },
          clinical: {
            hivResult: 2,
            artInitiationDate: "2023-10-25",
            regimen: "TLD",
          },
        },
        criteria: {
          exactUuic: false,
          phoneMatch: true,
          exactPrms: true,
          reasons: [
            { labelKh: "កូដ PMRS ដូចគ្នាទាំងស្រុង", labelEn: "Exact PMRS", points: 30, type: "positive" },
            { labelKh: "លេខទូរស័ព្ទដូចគ្នា", labelEn: "Phone Match", points: 25, type: "positive" },
            { labelKh: "ថ្ងៃខែឆ្នាំកំណើតខុសគ្នា ២ ថ្ងៃ", labelEn: "DOB Diff 2 Days", points: 15, type: "positive" },
            { labelKh: "ឈ្មោះស្រដៀង ៩១%", labelEn: "Name Fuzzy Match", points: 14, type: "positive" },
          ],
        },
      },
    },
  ])

  // HIV+ VCCT without ART link queue
  const [cascadeQueue, setCascadeQueue] = useState<UnifiedClientRecord[]>([
    {
      system: "VCCT",
      recordKey: "vcct-99014",
      identifiers: { uuic: "KPC-1994-00192", pmrs: "PMRS-1102", hts: "HTS-0091", vcctId: 99014 },
      demographics: {
        nameKh: "កែវ វិបុល",
        sex: "M",
        dob: "1994-07-04",
        age: 30,
        phone: "0889922114",
        province: "កំពង់ចាម",
        siteName: "មន្ទីរពេទ្យខេត្តកំពង់ចាម",
      },
      clinical: { hivResult: 2, hivResultLabel: "វិជ្ជមាន (Reactive)", testDate: "2024-02-10" },
      linkStatus: "unlinked",
    },
    {
      system: "VCCT",
      recordKey: "vcct-99182",
      identifiers: { uuic: "TK-1989-00411", pmrs: "PMRS-8812", hts: "HTS-0044", vcctId: 99182 },
      demographics: {
        nameKh: "សេង ធីតា",
        sex: "F",
        dob: "1989-02-18",
        age: 35,
        phone: "012998877",
        province: "តាកែវ",
        siteName: "មន្ទីរពេទ្យបង្អែកដូនកែវ",
      },
      clinical: { hivResult: 2, hivResultLabel: "វិជ្ជមាន (Reactive)", testDate: "2024-02-05" },
      linkStatus: "unlinked",
    },
  ])

  const handleOpenReview = (source: UnifiedClientRecord, candidate: CandidateMatchResult) => {
    setActiveSourceRecord(source)
    setActiveCandidate(candidate)
    setReviewModalOpen(true)
  }

  const handleOpenManual = (source: UnifiedClientRecord) => {
    setActiveSourceRecord(source)
    setManualLinkOpen(true)
  }

  const handleConfirmLink = async (sourceKey: string, candidateKey: string, note?: string) => {
    // API call POST /api/linkage/link
    await new Promise((res) => setTimeout(res, 600))
    setPendingQueue((prev) => prev.filter((p) => p.source.recordKey !== sourceKey))
    setFeedbackMessage({ text: "បានចងភ្ជាប់កំណត់ត្រាដោយជោគជ័យ!", type: "success" })
    setTimeout(() => setFeedbackMessage(null), 3000)
  }

  const handleRejectMatch = async (candidateId: string, reason: string) => {
    // API call POST /api/linkage/reject or DELETE /api/linkage/unlink
    await new Promise((res) => setTimeout(res, 500))
    setPendingQueue((prev) => prev.filter((p) => p.candidate.candidateId !== candidateId))
    setFeedbackMessage({ text: "បានបដិសេធការផ្គូផ្គង និងបញ្ចូលក្នុងបញ្ជីបដិសេធ។", type: "success" })
    setTimeout(() => setFeedbackMessage(null), 3000)
  }

  const handleRunAutoEngine = async () => {
    setAutoEngineRunning(true)
    try {
      await new Promise((res) => setTimeout(res, 1200))
      setFeedbackMessage({
        text: "ម៉ាស៊ីនផ្គូផ្គងស្វ័យប្រវត្តបានផ្ទៀងផ្ទាត់ និងចងភ្ជាប់បេក្ខជន Tier 1 (>= 95%) ចំនួន ១៤ កំណត់ត្រា!",
        type: "success",
      })
      setTimeout(() => setFeedbackMessage(null), 4000)
    } finally {
      setAutoEngineRunning(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--app-canvas)] dark:bg-black">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-primary)]/10 text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300 font-bold shadow-2xs">
            <GitMerge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
                មជ្ឈមណ្ឌលភ្ជាប់ទិន្នន័យអត្តសញ្ញាណ (ID Linkage & Deduplication Hub)
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                MPI Active
              </span>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-zinc-400">
              ប្រព័ន្ធផ្ទៀងផ្ទាត់ និងតភ្ជាប់អត្តសញ្ញាណអ្នកជំងឺឆ្លងប្រព័ន្ធ NPD (DHIS2) ⇄ VCCT ⇄ ART
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunAutoEngine}
            disabled={autoEngineRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-[var(--app-primary-hover)] active:scale-95 transition-all disabled:opacity-50"
          >
            {autoEngineRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>កំពុងដំណើរការម៉ាស៊ីន...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>ដំណើរការ Auto-Link Engine (Tier 1)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Feedback Toast Banner ─── */}
      {feedbackMessage && (
        <div
          className={cn(
            "flex items-center justify-between px-6 py-2.5 text-[12.5px] font-medium border-b animate-in fade-in duration-150 shrink-0",
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── KPI Stats Overview Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:px-6 shrink-0">
        {/* Card 1: Verified Links */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[12px] font-bold">អតិថិជនបានភ្ជាប់សរុប (Verified)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Link2 className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-black tracking-tight text-slate-900 dark:text-zinc-50">
              {stats.verifiedCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
              {stats.overallLinkageRate}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
            ភ្ជាប់ ៣ ប្រព័ន្ធពេញលេញ: <strong className="text-slate-700 dark:text-zinc-300">{stats.threeWayLinkedRate}%</strong>
          </div>
        </div>

        {/* Card 2: Pending Matches */}
        <div
          onClick={() => setActiveQueue("pending")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all",
            activeQueue === "pending"
              ? "border-amber-400 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20"
              : "border-slate-200/90 bg-white hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-950"
          )}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[12px] font-bold">រង់ចាំការផ្ទៀងផ្ទាត់ (Pending)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-black tracking-tight text-amber-700 dark:text-amber-400">
              {stats.proposedCount.toLocaleString()}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              ៧០-៩៤% ពិន្ទុ
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
            ត្រូវការការសម្រេចដោយមន្ត្រីតាមដាន
          </div>
        </div>

        {/* Card 3: HIV+ VCCT without ART (Retention Cascade Gap) */}
        <div
          onClick={() => setActiveQueue("cascade_art")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all relative overflow-hidden",
            activeQueue === "cascade_art"
              ? "border-rose-400 bg-rose-50/40 dark:border-rose-700 dark:bg-rose-950/20"
              : "border-slate-200/90 bg-white hover:border-rose-300 dark:border-zinc-800 dark:bg-zinc-950"
          )}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[12px] font-bold text-rose-700 dark:text-rose-400">
              VCCT+ ខ្វះ ART (Cascade Gap)
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-black tracking-tight text-rose-700 dark:text-rose-400">
              {stats.cascadeGaps.vcctPositiveNotLinkedToArt}
            </span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
              បន្ទាន់បំផុត
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
            អតិថិជនវិជ្ជមានមិនទាន់ឃើញកំណត់ត្រា ART
          </div>
        </div>

        {/* Card 4: Data Conflicts */}
        <div
          onClick={() => setActiveQueue("conflicts")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 shadow-2xs transition-all",
            activeQueue === "conflicts"
              ? "border-violet-400 bg-violet-50/40 dark:border-violet-700 dark:bg-violet-950/20"
              : "border-slate-200/90 bg-white hover:border-violet-300 dark:border-zinc-800 dark:bg-zinc-950"
          )}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[12px] font-bold">ទំនាស់ទិន្នន័យ (Conflicts)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-black tracking-tight text-slate-800 dark:text-zinc-200">
              {stats.conflictedCount}
            </span>
            <span className="text-[11px] text-slate-400">ករណីកូដស្ទួន</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
            កូដ UUIC ជាន់គ្នាលើបុគ្គលច្រើននាក់
          </div>
        </div>
      </div>

      {/* ─── Tab Queue Selector & Filters ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-6 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[12.5px]">
          {[
            {
              id: "pending",
              label: "បេក្ខជនរង់ចាំការផ្ទៀងផ្ទាត់ (Pending Matches)",
              count: pendingQueue.length,
              icon: Sparkles,
            },
            {
              id: "cascade_art",
              label: "VCCT+ មិនទាន់ភ្ជាប់ ART (Retention Queue)",
              count: cascadeQueue.length,
              icon: ShieldAlert,
              highlight: true,
            },
            {
              id: "unlinked_npd",
              label: "ករណី NPD មិនទាន់ភ្ជាប់ (Unlinked NPD)",
              count: stats.cascadeGaps.npdPositiveNotLinkedToVcct,
              icon: Unlink,
            },
            {
              id: "conflicts",
              label: "ទំនាស់ទិន្នន័យ (Conflicts & Duplicates)",
              count: stats.conflictedCount,
              icon: AlertTriangle,
            },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeQueue === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveQueue(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition-all shrink-0",
                  active
                    ? "bg-white text-[var(--app-primary)] shadow-2xs dark:bg-zinc-900 dark:text-sky-300"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.2 text-[10.5px] font-extrabold",
                    tab.highlight
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : active
                      ? "bg-[var(--app-primary)]/10 text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300"
                      : "bg-slate-200/70 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter Input */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="ត្រងតាមកូដ UUIC ឬឈ្មោះ..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-8.5 pr-3 py-1 text-[12px] text-slate-800 shadow-2xs focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>
      </div>

      {/* ─── Queue Linelist Content ─── */}
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {activeQueue === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[12.5px] font-bold text-slate-600 dark:text-zinc-400">
              <span>បញ្ជីបេក្ខជនមានពិន្ទុភាពត្រូវគ្នាក្នុងចន្លោះ ៧០% ដល់ ៩៤%:</span>
              <span>ចុច &quot;ផ្ទៀងផ្ទាត់ការផ្គូផ្គង&quot; ដើម្បីពិនិត្យលម្អិត</span>
            </div>

            {pendingQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all dark:border-zinc-800 dark:bg-zinc-950"
              >
                {/* Comparison Card: Source vs Candidate */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1">
                  {/* Left: Source Record */}
                  <div className="flex-1 rounded-xl bg-slate-50/90 p-3 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-violet-700 dark:text-violet-400 mb-1">
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 dark:bg-violet-950">
                        {item.source.system}
                      </span>
                      <span>កំណត់ត្រាបច្ចុប្បន្ន</span>
                    </div>
                    <div className="font-mono font-bold text-[13.5px] text-slate-900 dark:text-zinc-100">
                      {item.source.identifiers.uuic}
                    </div>
                    <div className="text-[12px] text-slate-600 dark:text-zinc-300">
                      {item.source.demographics.nameKh} ({item.source.demographics.sex === "F" ? "ស្រី" : "ប្រុស"},{" "}
                      {item.source.demographics.age} ឆ្នាំ)
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {item.source.demographics.siteName}
                    </div>
                  </div>

                  {/* Center: Match Badge */}
                  <div className="flex lg:flex-col items-center justify-center gap-1 py-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-black text-[12px] shadow-2xs dark:bg-amber-950 dark:text-amber-300">
                      {item.candidate.confidenceScore}%
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">ត្រូវគ្នា</span>
                  </div>

                  {/* Right: Candidate Record */}
                  <div className="flex-1 rounded-xl bg-emerald-50/40 p-3 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mb-1">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 dark:bg-emerald-950">
                        {item.candidate.candidateRecord.system}
                      </span>
                      <span>បេក្ខជនផ្គូផ្គង</span>
                    </div>
                    <div className="font-mono font-bold text-[13.5px] text-slate-900 dark:text-zinc-100">
                      {item.candidate.candidateRecord.identifiers.uuic ||
                        `ART: ${item.candidate.candidateRecord.identifiers.artnum}`}
                    </div>
                    <div className="text-[12px] text-slate-600 dark:text-zinc-300">
                      {item.candidate.candidateRecord.demographics.nameKh} (
                      {item.candidate.candidateRecord.demographics.sex === "F" ? "ស្រី" : "ប្រុស"},{" "}
                      {item.candidate.candidateRecord.demographics.age} ឆ្នាំ)
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {item.candidate.candidateRecord.demographics.siteName}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end">
                  <button
                    type="button"
                    onClick={() => handleOpenReview(item.source, item.candidate)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all"
                  >
                    <span>ផ្ទៀងផ្ទាត់ការផ្គូផ្គង</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cascade ART Gap Queue */}
        {activeQueue === "cascade_art" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300 text-[13.5px]">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <span>បញ្ជីតាមដានការភ្ជាប់អ្នកជំងឺវិជ្ជមាន HIV ពី VCCT ទៅ ART (Retention Cascade)</span>
              </div>
              <p className="text-[12px] text-rose-700/80 dark:text-rose-300/80 mt-1">
                អតិថិជនទាំងនេះមានលទ្ធផលតេស្តវិជ្ជមាន (Reactive) នៅកន្លែងផ្តល់ប្រឹក្សា និងធ្វើតេស្ត VCCT
                ប៉ុន្តែមិនទាន់មានកំណត់ត្រាចុះឈ្មោះទទួលការព្យាបាល ART នៅក្នុងប្រព័ន្ធឡើយ។
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
              {cascadeQueue.map((client) => (
                <div
                  key={client.recordKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50/60 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[14px] text-violet-700 dark:text-violet-400">
                        {client.identifiers.uuic}
                      </span>
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        VCCT: #{client.identifiers.vcctId}
                      </span>
                      <span className="rounded-full bg-rose-600 text-white px-2 py-0.2 text-[10.5px] font-extrabold">
                        វិជ្ជមាន HIV
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600 dark:text-zinc-300">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        {client.demographics.nameKh}
                      </span>
                      <span>ភេទ: {client.demographics.sex === "F" ? "ស្រី" : "ប្រុស"}</span>
                      <span>អាយុ: {client.demographics.age} ឆ្នាំ</span>
                      {client.demographics.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-zinc-200">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {client.demographics.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
                      <Building2 className="h-3 w-3" />
                      <span>{client.demographics.siteName}</span>
                      <span>•</span>
                      <span>កាលបរិច្ឆេទតេស្ត: {client.clinical.testDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenManual(client)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition-all"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>ស្វែងរកដើម្បីភ្ជាប់ ART</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts Queue Placeholder */}
        {activeQueue === "conflicts" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-bold text-slate-800 dark:text-zinc-200">
              ការដោះស្រាយទំនាស់ទិន្នន័យ និងកូដស្ទួន (Disambiguation Resolver)
            </p>
            <p className="text-[12px] text-slate-500 max-w-md">
              ករណីដែលកូដ UUIC ដូចគ្នាប៉ុន្តែត្រូវបានប្រើប្រាស់ដោយបុគ្គលពីររូបផ្សេងគ្នា (ឧទាហរណ៍:
              កំហុសវាយលេខទូរស័ព្ទ ឬកាលបរិច្ឆេទកំណើត)។
            </p>
          </div>
        )}

        {/* Unlinked NPD Queue Placeholder */}
        {activeQueue === "unlinked_npd" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-zinc-800">
              <Unlink className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-bold text-slate-800 dark:text-zinc-200">
              ករណីតាមដាន NPD Surveillance មិនទាន់ភ្ជាប់
            </p>
            <p className="text-[12px] text-slate-500 max-w-md">
              ករណីថ្មីៗដែលត្រូវបានកត់ត្រាក្នុង DHIS2 Tracker ប៉ុន្តែមិនទាន់ត្រូវបានបញ្ជាក់ការទទួលបានសេវា VCCT ឬ ART។
            </p>
          </div>
        )}
      </div>

      {/* ─── Integrated Modals ─── */}
      {reviewModalOpen && activeSourceRecord && activeCandidate && (
        <MatchReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          sourceRecord={activeSourceRecord}
          candidateMatch={activeCandidate}
          onConfirmLink={handleConfirmLink}
          onRejectMatch={handleRejectMatch}
          onOpenManualSearch={() => {
            setReviewModalOpen(false)
            setManualLinkOpen(true)
          }}
        />
      )}

      {manualLinkOpen && activeSourceRecord && (
        <ManualLinkModal
          isOpen={manualLinkOpen}
          onClose={() => setManualLinkOpen(false)}
          sourceRecord={activeSourceRecord}
          onCandidateSelected={(cand) => {
            setActiveCandidate(cand)
            setReviewModalOpen(true)
          }}
        />
      )}
    </div>
  )
}
