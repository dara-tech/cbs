"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  RefreshCw,
  Search,
  User,
  X,
  Copy,
  CheckCircle2,
  XCircle,
  Info,
  UserCheck,
  Pill,
  TestTube2,
  Globe,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgUnitModal, type DhisOrgUnit } from "@/components/OrgUnitModal"
import { PeriodModal } from "@/components/PeriodModal"
import { SearchModal } from "@/components/SearchModal"
import { ClientProfileModal } from "@/components/ClientProfileModal"

interface VcctRow {
  vcct_id: number
  uuic: string
  pmrs_code: string
  hts_code: string
  registration_date: string | null
  post_counseling_date: string | null
  site_code: string
  site_name: string
  od_name: string
  combo_result: number
  hiv_result: number
  vl_result: number
  hiv_result_kh: string
  refer_service_name: string
  patient_type_name: string
  phone_number: string
  sex: string
  dob: string | null
}

interface ArtRow {
  ClinicID: number
  site_code: string
  site_name: string
  od_name: string
  Artnum: string
  Codes: string
  Typecode: string
  DaART: string | null
  DaHIV: string | null
  DafirstVisit: string | null
  Sex: string
  DaBirth: string | null
}

export interface UnifiedRow {
  program: "vcct" | "art"
  uniqueKey: string
  vcct_id?: number
  ClinicID?: number
  Artnum?: string
  uuic?: string
  pmrs_code?: string
  hts_code?: string
  registration_date?: string | null
  site_code: string
  site_name: string
  od_name?: string
  combo_result?: number | null
  hiv_result?: number | null
  vl_result?: number | null
  hiv_result_kh?: string
  patient_type_name?: string
  phone_number?: string
  sex: string
  dob?: string | null
  Codes?: string
  Typecode?: string
  DaART?: string | null
  DaHIV?: string | null
  DafirstVisit?: string | null
}

const MYSQL_PROGRAMS = [
  {
    id: "all",
    code: "ALL",
    displayName: "គ្រប់កម្មវិធី (All)",
    icon: Globe,
  },
  {
    id: "vcct",
    code: "VCCT",
    displayName: "VCCT",
    icon: TestTube2,
  },
  {
    id: "art",
    code: "ART",
    displayName: "ART",
    icon: Pill,
  },
]

export function MySqlArtVcctView() {
  // Navigation Bar Selection States
  const [selectedProgram, setSelectedProgram] = useState<string>("vcct")
  const [openProgMenu, setOpenProgMenu] = useState<boolean>(false)
  const progMenuRef = useRef<HTMLDivElement>(null)

  const [selectedOrgId, setSelectedOrgId] = useState<string>("cambodia_root")
  const [selectedOrgName, setSelectedOrgName] = useState<string>("កម្ពុជា (Cambodia)")
  const [orgUnits, setOrgUnits] = useState<DhisOrgUnit[]>([])

  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL")
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>("គ្រប់កាលបរិច្ឆេទ")

  const [selectedKp, setSelectedKp] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 20

  // Modal Open States (Same as Capture)
  const [isOrgModalOpen, setIsOrgModalOpen] = useState<boolean>(false)
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false)

  // Data & Loading States
  const [loadingContext, setLoadingContext] = useState<boolean>(true)
  const [loadingCases, setLoadingCases] = useState<boolean>(true)
  const [vcctRows, setVcctRows] = useState<VcctRow[]>([])
  const [artRows, setArtRows] = useState<ArtRow[]>([])
  const [allRows, setAllRows] = useState<UnifiedRow[]>([])
  const [totalCases, setTotalCases] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  // Drawer Profile State
  const [selectedClient, setSelectedClient] = useState<{
    uuic?: string
    vcctId?: number
    siteCode?: string
    pmrs?: string
    hts?: string
    artnum?: string
    clinicId?: number
    program?: "vcct" | "art"
    name?: string
  } | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Close program menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (progMenuRef.current && !progMenuRef.current.contains(event.target as Node)) {
        setOpenProgMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Fetch OrgUnits tree from MySQL according to current program
  const loadOrgUnits = useCallback(async (programCode: string) => {
    try {
      setLoadingContext(true)
      const res = await fetch(`/api/mysql/orgUnits?program=${programCode.toUpperCase()}`)
      const data = await res.json()
      if (data.ok && Array.isArray(data.orgUnits)) {
        setOrgUnits(data.orgUnits)
      }
    } catch (err) {
      console.error("Failed to load MySQL org units:", err)
    } finally {
      setLoadingContext(false)
    }
  }, [])

  useEffect(() => {
    loadOrgUnits(selectedProgram)
  }, [selectedProgram, loadOrgUnits])

  // 2. Fetch Records from MySQL with all filters applied
  const loadRecords = useCallback(
    async (
      prog: string,
      orgId: string,
      periodKey: string,
      kpType: string,
      page: number,
      search: string
    ) => {
      setLoadingCases(true)
      try {
        const params = new URLSearchParams({
          type: prog,
          page: String(page),
          pageSize: String(pageSize),
        })

        if (orgId && orgId !== "cambodia_root") {
          params.set("orgUnitId", orgId)
        }
        if (periodKey && periodKey !== "ALL") {
          params.set("period", periodKey)
        }
        if (kpType && kpType !== "ALL") {
          params.set("kp", kpType)
        }
        if (search) {
          params.set("search", search)
        }

        const res = await fetch(`/api/mysql/records?${params.toString()}`)
        const data = await res.json()

        if (data.ok) {
          if (prog === "vcct") {
            setVcctRows(data.data || [])
          } else if (prog === "art") {
            setArtRows(data.data || [])
          } else {
            setAllRows(data.data || [])
          }
          setTotalCases(data.total || 0)
          setTotalPages(data.totalPages || 1)
        }
      } catch (err) {
        console.error("Failed to load records from MySQL:", err)
      } finally {
        setLoadingCases(false)
      }
    },
    [pageSize]
  )

  useEffect(() => {
    loadRecords(selectedProgram, selectedOrgId, selectedPeriod, selectedKp, currentPage, searchQuery)
  }, [selectedProgram, selectedOrgId, selectedPeriod, selectedKp, currentPage, searchQuery, loadRecords])

  // Sync with global TopNav search events (defaults to cross-program search)
  useEffect(() => {
    const handleCbsSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === "string") {
        setSelectedProgram("all")
        setSearchQuery(detail)
        setCurrentPage(1)
      }
    }
    window.addEventListener("cbs:search", handleCbsSearch)
    return () => window.removeEventListener("cbs:search", handleCbsSearch)
  }, [])

  const currentProgramObj = MYSQL_PROGRAMS.find((p) => p.id === selectedProgram) || MYSQL_PROGRAMS[0]

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 1500)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 dark:bg-zinc-950 font-sans">
      {/* ─── Capture Navigation Toolbar: Org Modal -> Program -> Period Modal ─── */}
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-slate-200/90 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* ── 1. ORG UNIT BUTTON (OPENS MODAL LIKE CAPTURE) ── */}
            <button
              type="button"
              onClick={() => setIsOrgModalOpen(true)}
              disabled={loadingContext}
              className="flex h-8.5 items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-[12.5px] font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              title="ចុចដើម្បីជ្រើសរើសទីតាំងពីរចនាសម្ព័ន្ធ MySQL"
            >
              <div className="flex items-center gap-2 truncate max-w-[200px]">
                <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="truncate">{selectedOrgName}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </button>

            {/* Separator Arrow */}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />

            {/* ── 2. PROGRAM SELECTOR (Short VCCT, ART with Icon) ── */}
            <div ref={progMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenProgMenu(!openProgMenu)}
                className={cn(
                  "flex h-8.5 items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-[12.5px] font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
                  openProgMenu &&
                    (selectedProgram === "art"
                      ? "border-emerald-600 ring-2 ring-emerald-600/10"
                      : selectedProgram === "all"
                      ? "border-indigo-600 ring-2 ring-indigo-600/10"
                      : "border-violet-600 ring-2 ring-violet-600/10")
                )}
                title="ជ្រើសរើសកម្មវិធី"
              >
                <div className="flex items-center gap-2">
                  {selectedProgram === "art" ? (
                    <Pill className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : selectedProgram === "all" ? (
                    <Globe className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  ) : (
                    <TestTube2 className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  )}
                  <span className="font-bold">{currentProgramObj.code}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </button>

              {/* Programs Dropdown */}
              {openProgMenu && (
                <div className="absolute left-0 top-full z-40 mt-1.5 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-100">
                  <span className="block px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
                    កម្មវិធី
                  </span>
                  <div className="space-y-0.5">
                    {MYSQL_PROGRAMS.map((prog) => {
                      const IconComp = prog.icon
                      const isSelected = selectedProgram === prog.id
                      const isArt = prog.id === "art"
                      const isAll = prog.id === "all"
                      return (
                        <button
                          key={prog.id}
                          type="button"
                          onClick={() => {
                            setSelectedProgram(prog.id)
                            setOpenProgMenu(false)
                            setCurrentPage(1)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] transition-colors",
                            isSelected
                              ? isArt
                                ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : isAll
                                ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                : "bg-violet-50 font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                              : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <IconComp
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isArt ? "text-emerald-600" : isAll ? "text-indigo-600" : "text-violet-600"
                              )}
                            />
                            <span className="font-bold">{prog.code}</span>
                          </div>
                          {isSelected && (
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isArt ? "text-emerald-600" : isAll ? "text-indigo-600" : "text-violet-600"
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Separator Arrow */}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />

            {/* ── 3. PERIOD BUTTON (OPENS MODAL LIKE CAPTURE) ── */}
            <button
              type="button"
              onClick={() => setIsPeriodModalOpen(true)}
              className="flex h-8.5 items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-[12.5px] font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              title="ចុចដើម្បីជ្រើសរើសកាលបរិច្ឆេទ"
            >
              <div className="flex items-center gap-2 truncate max-w-[200px]">
                <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{selectedPeriodLabel}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </button>

            {/* ── 4. SEARCH BUTTON (OPENS SEARCH MODAL LIKE CAPTURE) ── */}
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className={cn(
                "flex h-8.5 w-8.5 items-center justify-center rounded-xl border shadow-2xs transition-all active:scale-95 ml-0.5",
                searchQuery
                  ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
                  : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              )}
              title="ស្វែងរកករណី (Search)"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Active Search Filter Badge */}
            {searchQuery && (
              <div className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50/90 py-1 pl-2.5 pr-1.5 text-[12px] font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200 animate-in fade-in zoom-in-95 duration-100">
                <Search className="h-3 w-3 text-violet-500 shrink-0" />
                <span className="truncate max-w-[160px]">&ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex h-5 w-5 items-center justify-center rounded-lg text-violet-500 hover:bg-violet-200/70 hover:text-violet-900 dark:text-violet-400 dark:hover:bg-violet-800 transition-colors"
                  title="សម្អាតការស្វែងរក"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Actions: Total Cases & Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-zinc-300">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">ករណីតាមដាន:</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-800 dark:bg-zinc-800 dark:text-zinc-200">
                {totalCases.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                loadRecords(
                  selectedProgram,
                  selectedOrgId,
                  selectedPeriod,
                  selectedKp,
                  currentPage,
                  searchQuery
                )
              }
              disabled={loadingCases}
              title="ទាញយកទិន្នន័យជាថ្មី"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-800 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-all"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loadingCases && "animate-spin text-violet-600")}
              />
            </button>
          </div>
        </div>

        {/* ── Second Row: KP Filters (if VCCT or ART) ── */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[12px]">
          <span className="text-slate-400 dark:text-zinc-500 font-semibold text-[11px] mr-1">
            ក្រុមគោលដៅ:
          </span>
          {[
            { id: "ALL", label: "ទាំងអស់" },
            { id: "FEW", label: "FEW" },
            { id: "MSM", label: "MSM" },
            { id: "TG", label: "TG" },
            { id: "PWID", label: "PWID" },
            { id: "GP", label: "GP" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedKp(item.id)
                setCurrentPage(1)
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all text-[11.5px]",
                selectedKp === item.id
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table Content ─── */}
      <div className="flex-1 overflow-auto">
        {loadingCases ? (
          <div className="p-6">
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-10 rounded-xl bg-slate-200 dark:bg-zinc-800" />
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-900/60" />
              ))}
            </div>
          </div>
        ) : totalCases === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 mb-3">
              <Folder className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-[14.5px] font-bold text-slate-800 dark:text-zinc-100">
              រកមិនឃើញករណីតាមដានទេ
            </h3>
            <p className="mt-1 text-[12px] text-slate-400 dark:text-zinc-500 max-w-sm">
              មិនមានទិន្នន័យសម្រាប់លក្ខខណ្ឌទីតាំង និងកាលបរិច្ឆេទដែលបានជ្រើសរើសឡើយ
            </p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 z-10 border-b border-slate-200/80 bg-white text-[11.5px] font-bold text-slate-500 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                {selectedProgram === "all" ? (
                  <tr>
                    <th className="py-3 px-4">កម្មវិធី</th>
                    <th className="py-3 px-4">លេខកូដសម្គាល់ (UUIC / ART)</th>
                    <th className="py-3 px-4">លេខសម្គាល់គ្លីនិក</th>
                    <th className="py-3 px-4">លេខសម្គាល់ (PMRS)</th>
                    <th className="py-3 px-4">មូលដ្ឋានសុខាភិបាល</th>
                    <th className="py-3 px-4">ក្រុមគោលដៅ</th>
                    <th className="py-3 px-4">លទ្ធផល / ស្ថានភាព</th>
                    <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                    <th className="py-3 px-4 text-right">សកម្មភាព</th>
                  </tr>
                ) : selectedProgram === "vcct" ? (
                  <tr>
                    <th className="py-3 px-4">កូដ UUIC</th>
                    <th className="py-3 px-4">លេខកូដ VCCT</th>
                    <th className="py-3 px-4">កូដ PMRS</th>
                    <th className="py-3 px-4">មូលដ្ឋានសុខាភិបាល</th>
                    <th className="py-3 px-4">ក្រុមគោលដៅ</th>
                    <th className="py-3 px-4">លទ្ធផល HIV</th>
                    <th className="py-3 px-4">កាលបរិច្ឆេទធ្វើតេស្ត</th>
                    <th className="py-3 px-4 text-right">សកម្មភាព</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="py-3 px-4">លេខកូដ ART</th>
                    <th className="py-3 px-4">លេខកូដគ្លីនិក</th>
                    <th className="py-3 px-4">លេខកូដសម្គាល់ (PMRS)</th>
                    <th className="py-3 px-4">មន្ទីរពេទ្យព្យាបាល</th>
                    <th className="py-3 px-4">ភេទ</th>
                    <th className="py-3 px-4">ចាប់ផ្តើម ART</th>
                    <th className="py-3 px-4">មកពិនិត្យដំបូង</th>
                    <th className="py-3 px-4 text-right">សកម្មភាព</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-zinc-800/80 dark:bg-zinc-950">
                {selectedProgram === "all"
                  ? allRows.map((row) => (
                      <tr
                        key={row.uniqueKey}
                        onClick={() =>
                          setSelectedClient({
                            uuic: row.uuic,
                            vcctId: row.vcct_id,
                            clinicId: row.ClinicID,
                            artnum: row.Artnum,
                            siteCode: row.site_code,
                            pmrs: row.pmrs_code || row.Codes,
                            hts: row.hts_code,
                            program: row.program,
                          })
                        }
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                      >
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
                              row.program === "art"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                : "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300"
                            )}
                          >
                            {row.program === "art" ? (
                              <Pill className="h-3 w-3" />
                            ) : (
                              <TestTube2 className="h-3 w-3" />
                            )}
                            {row.program.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-uuic font-bold text-[13.5px]">
                          {row.program === "art" ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {row.Artnum || row.uuic || "—"}
                            </span>
                          ) : (
                            <span className="text-violet-700 dark:text-violet-400">
                              {row.uuic || "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                          #{row.program === "art" ? row.ClinicID : row.vcct_id}
                        </td>
                        <td className="py-3 px-4 font-uuic text-slate-600 dark:text-zinc-400">
                          {row.pmrs_code || row.Codes || "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                          <div>{row.site_name}</div>
                          {row.od_name && (
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                              {row.od_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-300">
                          {row.patient_type_name || "—"}
                        </td>
                        <td className="py-3 px-4">
                          {row.program === "art" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              ព្យាបាល ART
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                                row.hiv_result === 2
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : row.hiv_result === 1
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              )}
                            >
                              {row.hiv_result_kh || "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">
                          {row.registration_date || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11.5px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                          >
                            មើលប្រវត្តិ
                          </button>
                        </td>
                      </tr>
                    ))
                  : selectedProgram === "vcct"
                  ? vcctRows.map((row) => (
                      <tr
                        key={`${row.site_code}-${row.vcct_id}`}
                        onClick={() =>
                          setSelectedClient({
                            uuic: row.uuic,
                            vcctId: row.vcct_id,
                            siteCode: row.site_code,
                            pmrs: row.pmrs_code,
                            hts: row.hts_code,
                            program: "vcct",
                          })
                        }
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                      >
                        <td className="py-3 px-4 font-uuic font-bold text-[13.5px] text-violet-700 dark:text-violet-400">
                          {row.uuic || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                          #{row.vcct_id}
                        </td>
                        <td className="py-3 px-4 font-uuic text-slate-600 dark:text-zinc-400">
                          {row.pmrs_code || "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                          <div>{row.site_name}</div>
                          {row.od_name && (
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                              {row.od_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-300">
                          {row.patient_type_name || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              row.hiv_result === 2
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : row.hiv_result === 1
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {row.hiv_result_kh}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">
                          {row.registration_date || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg bg-violet-50 px-2.5 py-1 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300"
                          >
                            មើលប្រវត្តិ
                          </button>
                        </td>
                      </tr>
                    ))
                  : artRows.map((row) => (
                      <tr
                        key={`${row.site_code}-${row.ClinicID}`}
                        onClick={() =>
                          setSelectedClient({
                            artnum: row.Artnum,
                            clinicId: row.ClinicID,
                            siteCode: row.site_code,
                            pmrs: row.Codes,
                            program: "art",
                          })
                        }
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                      >
                        <td className="py-3 px-4 font-uuic font-bold text-[13.5px] text-emerald-700 dark:text-emerald-400">
                          {row.Artnum || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                          #{row.ClinicID}
                        </td>
                        <td className="py-3 px-4 font-uuic text-slate-700 dark:text-zinc-300">
                          {row.Codes ? (
                            <span>
                              {row.Codes}{" "}
                              <span className="text-[10px] text-slate-400">({row.Typecode})</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-zinc-200">
                          <div>{row.site_name}</div>
                          {row.od_name && (
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                              {row.od_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-zinc-300">{row.Sex}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">
                          {row.DaART || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">
                          {row.DafirstVisit || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                          >
                            មើលប្រវត្តិ
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Pagination Footer ─── */}
      <div className="flex items-center justify-between border-t border-slate-200/80 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          បង្ហាញ{" "}
          <strong>
            {selectedProgram === "all"
              ? allRows.length
              : selectedProgram === "vcct"
              ? vcctRows.length
              : artRows.length}
          </strong>{" "}
          នៃ <strong>{totalCases.toLocaleString()}</strong> ករណី
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1 || loadingCases}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-600 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>ថយក្រោយ</span>
          </button>
          <span className="px-2 text-[12px] font-bold text-slate-700 dark:text-zinc-300">
            ទំព័រ {currentPage} / {totalPages.toLocaleString()}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loadingCases}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-600 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300"
          >
            <span>បន្ទាប់</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Org Unit Hierarchy Modal (Reused like Capture) ─── */}
      <OrgUnitModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        orgUnits={orgUnits}
        selectedId={selectedOrgId}
        programName={currentProgramObj.displayName}
        onApply={(orgId, orgName) => {
          setSelectedOrgId(orgId)
          setSelectedOrgName(orgName)
          setCurrentPage(1)
        }}
      />

      {/* ─── Period Selection Modal (Reused like Capture) ─── */}
      <PeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        selectedPeriod={selectedPeriod}
        onApply={(periodKey, periodLabel) => {
          setSelectedPeriod(periodKey)
          setSelectedPeriodLabel(periodLabel)
          setCurrentPage(1)
        }}
      />

      {/* ─── Search Modal (Reused like Capture) ─── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        currentQuery={searchQuery}
        orgUnitName={selectedOrgName}
        programName={currentProgramObj.displayName}
        currentProgram={selectedProgram}
        onSearch={(query, isGlobal, progScope) => {
          if (progScope) {
            setSelectedProgram(progScope)
          }
          setSearchQuery(query)
          if (isGlobal) {
            setSelectedOrgId("cambodia_root")
            setSelectedOrgName("កម្ពុជា (Cambodia)")
          }
          setCurrentPage(1)
        }}
      />

      {/* ─── Client Profile Modal (Center Dialog like Capture) ─── */}
      <ClientProfileModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        uuic={selectedClient?.uuic}
        vcctId={selectedClient?.vcctId}
        siteCode={selectedClient?.siteCode}
        pmrs={selectedClient?.pmrs}
        hts={selectedClient?.hts}
        artnum={selectedClient?.artnum}
        clinicId={selectedClient?.clinicId}
        program={selectedClient?.program}
      />
    </div>
  )
}
