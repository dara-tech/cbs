"use client"

import React, { useEffect, useState, useTransition, useRef, useMemo } from "react"
import {
  Search,
  RefreshCw,
  ChevronRight,
  User,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronDown,
  Building2,
  Folder,
  Calendar,
  ShieldAlert,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgUnitModal, type DhisOrgUnit } from "@/components/OrgUnitModal"
import { PeriodModal } from "@/components/PeriodModal"
import { SearchModal } from "@/components/SearchModal"
import { ClientProfileModal } from "@/components/ClientProfileModal"

export interface DhisProgramAttribute {
  displayInList?: boolean
  sortOrder?: number
  mandatory?: boolean
  trackedEntityAttribute: {
    id: string
    name: string
    displayName: string
    valueType: string
  }
}

export interface DhisProgram {
  id: string
  displayName: string
  programType: "WITH_REGISTRATION" | "WITHOUT_REGISTRATION"
  trackedEntityType?: { id: string; displayName: string }
  selectEnrollmentDatesInFuture?: boolean
  selectIncidentDatesInFuture?: boolean
  programTrackedEntityAttributes?: DhisProgramAttribute[]
}

export interface TableColumn {
  id: string
  label: string
  valueType?: string
  widthClass?: string
  isUuic?: boolean
  isName?: boolean
  isGender?: boolean
  isDate?: boolean
  isTag?: boolean
}

export interface CbsCase {
  id: string
  uuic: string
  fullName: string
  lastName: string
  firstName: string
  gender: string
  dob: string
  age: number | null
  kpType: string
  riskLevel: string
  hotspotName: string
  province: string
  district: string
  commune: string
  orgUnit: string
  created: string
  lastUpdated: string
  rawAttributes: Array<{
    attribute: string
    displayName?: string
    value: string
    code?: string
  }>
}

export function NpdSurveillanceView() {
  // ── Context: Org -> Program -> Period ──────────────────────────────────────
  const [orgUnits, setOrgUnits] = useState<DhisOrgUnit[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>("vUs2cBkPn50") // Cambodia Root
  const [selectedOrgName, setSelectedOrgName] = useState<string>("កម្ពុជា")

  const [programs, setPrograms] = useState<DhisProgram[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>("gmO3xUubvMb") // ១.កម្មវិធីបង្ការសហគមន៍

  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL")
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>("គ្រប់កាលបរិច្ឆេទ")

  // Modal Open States
  const [isOrgModalOpen, setIsOrgModalOpen] = useState<boolean>(false)
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false)
  const [openProgMenu, setOpenProgMenu] = useState<boolean>(false)

  // ── Data & Filters ──────────────────────────────────────────────────────────
  const [cases, setCases] = useState<CbsCase[]>([])
  const [totalCases, setTotalCases] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize] = useState<number>(35)

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedKp, setSelectedKp] = useState<string>("ALL")

  // Loading & UI states
  const [loadingContext, setLoadingContext] = useState<boolean>(true)
  const [loadingCases, setLoadingCases] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [activeCase, setActiveCase] = useState<CbsCase | null>(null)
  const [copiedUuic, setCopiedUuic] = useState<string | null>(null)
  const [sheetTab, setSheetTab] = useState<"clinical" | "surveillance">("clinical")

  const activeCasePmrs = useMemo(() => {
    if (!activeCase) return ""
    const attr = activeCase.rawAttributes.find(
      (a) =>
        a.displayName?.toLowerCase().includes("pmrs") ||
        a.attribute?.toLowerCase().includes("pmrs") ||
        a.displayName?.includes("PMRS")
    )
    return attr?.value || ""
  }, [activeCase])

  const [, startTransition] = useTransition()

  // Program menu ref for click outside
  const progMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (progMenuRef.current && !progMenuRef.current.contains(event.target as Node)) {
        setOpenProgMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Fetch Org Units & Programs on mount
  useEffect(() => {
    const initContext = async () => {
      setLoadingContext(true)
      try {
        const [orgRes, progRes] = await Promise.all([
          fetch("/api/dhis2/orgUnits?level=1,2"),
          fetch("/api/dhis2/programs"),
        ])

        const orgData = await orgRes.json()
        const progData = await progRes.json()

        if (orgData.ok && Array.isArray(orgData.organisationUnits)) {
          setOrgUnits(orgData.organisationUnits)
          const root = orgData.organisationUnits.find((o: DhisOrgUnit) => o.level === 1)
          if (root) {
            setSelectedOrgId(root.id)
            setSelectedOrgName(root.displayName || root.name || "កម្ពុជា")
          }
        }

        if (progData.ok && Array.isArray(progData.programs)) {
          setPrograms(progData.programs)
          const withReg = progData.programs.filter((p: DhisProgram) => p.programType === "WITH_REGISTRATION")
          if (withReg.length > 0 && !progData.programs.find((p: DhisProgram) => p.id === selectedProgram)) {
            setSelectedProgram(withReg[0].id)
          }
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "កំហុសក្នុងការទាញយកទិន្នន័យពីម៉ាស៊ីនបម្រើ")
      } finally {
        setLoadingContext(false)
      }
    }

    initContext()
  }, [])

  // 2. Fetch Cases when Org or Program changes
  const loadCases = async (orgId = selectedOrgId, progId = selectedProgram, page = 1, query = "") => {
    setLoadingCases(true)
    setErrorMsg("")
    try {
      const params = new URLSearchParams({
        ou: orgId,
        program: progId,
        page: String(page),
        pageSize: String(pageSize),
      })
      if (query.trim()) {
        params.set("query", query.trim())
      }

      const res = await fetch(`/api/dhis2/cases?${params.toString()}`)
      const data = await res.json()

      if (data.ok && Array.isArray(data.cases)) {
        setCases(data.cases)
        setTotalCases(data.total || data.cases.length)
        setCurrentPage(data.page || page)
      } else {
        setErrorMsg(data.error || "មិនអាចទាញយកទិន្នន័យករណីតាមដានបានទេ")
        setCases([])
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "កំហុសក្នុងការតភ្ជាប់ទៅប្រព័ន្ធទិន្នន័យ")
      setCases([])
    } finally {
      setLoadingCases(false)
    }
  }

  useEffect(() => {
    if (selectedProgram && selectedOrgId) {
      loadCases(selectedOrgId, selectedProgram, 1, searchQuery)
    }
  }, [selectedOrgId, selectedProgram])

  // Sync with global TopNav search events
  useEffect(() => {
    const handleCbsSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === "string") {
        setSearchQuery(detail)
        setCurrentPage(1)
        if (selectedProgram && selectedOrgId) {
          loadCases(selectedOrgId, selectedProgram, 1, detail)
        }
      }
    }
    window.addEventListener("cbs:search", handleCbsSearch)
    return () => window.removeEventListener("cbs:search", handleCbsSearch)
  }, [selectedProgram, selectedOrgId])

  const handleCopyUuic = (uuic: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(uuic)
    setCopiedUuic(uuic)
    setTimeout(() => setCopiedUuic(null), 2000)
  }

  const currentProgramObj = programs.find((p) => p.id === selectedProgram)
  const registeredPrograms = programs.filter((p) => p.programType === "WITH_REGISTRATION")

  // Filter cases client-side by KP if selected
  const filteredCases = cases.filter((c) => {
    if (selectedKp === "ALL") return true
    return c.kpType?.toUpperCase() === selectedKp.toUpperCase()
  })

  // Dynamic columns driven by Program (matching Capture app)
  const dynamicColumns = useMemo<TableColumn[]>(() => {
    const pteas = currentProgramObj?.programTrackedEntityAttributes || []
    const inList = pteas.filter((p) => p.displayInList)
    const listToUse = inList.length > 0 ? inList : pteas.slice(0, 8)

    // Fallback if metadata not loaded yet
    if (!listToUse.length) {
      return [
        { id: "uuic", label: "កូដ UUIC", isUuic: true },
        { id: "fullName", label: "ឈ្មោះពេញអតិថិជន", isName: true },
        { id: "gender", label: "ភេទ", isGender: true },
        { id: "dob", label: "ថ្ងៃខែឆ្នាំកំណើត", isDate: true },
        { id: "kpType", label: "ក្រុមគោលដៅ", isTag: true },
        { id: "hotspotName", label: "ទីតាំង / ហតស្ប៉ត" },
      ]
    }

    // Sort attributes prioritizing identifiers and names (like Capture)
    const sorted = [...listToUse].sort((a, b) => {
      const getRank = (p: DhisProgramAttribute) => {
        const text = `${p.trackedEntityAttribute?.displayName || ""} ${p.trackedEntityAttribute?.name || ""}`.toLowerCase()
        if (text.includes("uuic")) return 10
        if (text.includes("smh") || text.includes("pmrs") || text.includes("prep") || text.includes("ប្រីព")) return 20
        if (text.includes("last name") || text.includes("ត្រកូល")) return 30
        if (text.includes("first name") || text.includes("ខ្លួន")) return 35
        if (text.includes("sex") || text.includes("ភេទ")) return 40
        if (text.includes("birth") || text.includes("កំណើត") || text.includes("age")) return 50
        if (text.includes("kp") || text.includes("ក្រុមគោលដៅ") || text.includes("patient") || text.includes("អ្នកជំងឺ")) return 60
        if (text.includes("id poor") || text.includes("nssf") || text.includes("ក្រីក្រ") || text.includes("បសស")) return 100
        return 70
      }
      const rankDiff = getRank(a) - getRank(b)
      if (rankDiff !== 0) return rankDiff
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })

    // Take top 7 columns so the table fits comfortably on desktop
    const top = sorted.slice(0, 7)

    return top.map((item, idx) => {
      const attr = item.trackedEntityAttribute
      const text = `${attr.displayName || ""} ${attr.name || ""}`.toLowerCase()
      const isUuic = text.includes("uuic")
      const isGender = text.includes("sex") || text.includes("ភេទ")
      const isDate = attr.valueType === "DATE" || text.includes("birth") || text.includes("កំណើត") || text.includes("date")
      const isName = text.includes("last name") || text.includes("first name") || text.includes("ត្រកូល") || text.includes("ខ្លួន")
      const isTag = text.includes("kp") || text.includes("ក្រុមគោលដៅ") || text.includes("patient") || text.includes("អ្នកជំងឺ") || text.includes("risk") || text.includes("status")

      return {
        id: attr.id,
        label: attr.displayName || attr.name || attr.id,
        valueType: attr.valueType,
        widthClass: idx === 0 ? "w-[16%] min-w-[130px]" : "w-[12%] min-w-[100px]",
        isUuic,
        isGender,
        isDate,
        isName,
        isTag,
      }
    })
  }, [currentProgramObj])

  const getCellValue = (c: CbsCase, col: TableColumn) => {
    // Check raw attributes first by attribute ID
    const found = c.rawAttributes?.find((a) => a.attribute === col.id)
    if (found?.value) {
      if (col.isDate) {
        return found.value.split("T")[0]
      }
      return found.value
    }

    // Fallbacks if mapped in CbsCase
    if (col.isUuic) return c.uuic
    if (col.isGender) return c.gender
    if (col.isDate && c.dob) return c.dob
    if (col.isName && c.fullName !== "Unknown") return c.fullName

    return "—"
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
              title="ចុចដើម្បីជ្រើសរើសទីតាំងពីរចនាសម្ព័ន្ធ"
            >
              <div className="flex items-center gap-2 truncate max-w-[200px]">
                <Building2 className="h-3.5 w-3.5 text-[var(--app-primary)] dark:text-sky-400 shrink-0" />
                <span className="truncate">{selectedOrgName}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </button>

            {/* Separator Arrow */}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />

            {/* ── 2. PROGRAM SELECTOR ── */}
            <div ref={progMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenProgMenu(!openProgMenu)}
                disabled={loadingContext}
                className={cn(
                  "flex h-8.5 items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-[12.5px] font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
                  openProgMenu && "border-[var(--app-primary)] ring-2 ring-[var(--app-primary)]/10"
                )}
                title="ជ្រើសរើសកម្មវិធី"
              >
                <div className="flex items-center gap-2 truncate max-w-[280px]">
                  <Folder className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="truncate">
                    {currentProgramObj?.displayName || (loadingContext ? "កំពុងទាញយកកម្មវិធី..." : "ជ្រើសរើសកម្មវិធី")}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </button>

              {/* Programs Dropdown */}
              {openProgMenu && (
                <div className="absolute left-0 top-full z-40 mt-1.5 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-100">
                  <span className="block px-2.5 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500">
                    កម្មវិធីតាមដាន
                  </span>
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {registeredPrograms.map((prog) => (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => {
                          setSelectedProgram(prog.id)
                          setOpenProgMenu(false)
                          setCurrentPage(1)
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors",
                          selectedProgram === prog.id
                            ? "bg-violet-50 font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{prog.displayName}</p>
                          {prog.trackedEntityType && (
                            <p className="text-[10.5px] text-slate-400 dark:text-zinc-500">
                              {prog.trackedEntityType.displayName}
                            </p>
                          )}
                        </div>
                        {selectedProgram === prog.id && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
                      </button>
                    ))}
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
                  onClick={() => {
                    setSearchQuery("")
                    loadCases(selectedOrgId, selectedProgram, 1, "")
                  }}
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
              onClick={() => loadCases(selectedOrgId, selectedProgram, currentPage, searchQuery)}
              disabled={loadingCases}
              title="ទាញយកទិន្នន័យជាថ្មី"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-800 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-all"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingCases && "animate-spin text-violet-600")} />
            </button>
          </div>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMsg && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            className="text-[11px] font-semibold text-red-700 underline dark:text-red-300"
          >
            បិទ
          </button>
        </div>
      )}

      {/* ─── Surveillance Linelist Table ─── */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadingCases && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden bg-violet-100/80 dark:bg-violet-950/40 pointer-events-none">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-violet-600 to-transparent animate-pulse" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <colgroup>
              {dynamicColumns.map((col: TableColumn, idx: number) => (
                <col
                  key={col.id}
                  className={idx === 0 ? "w-[18%] min-w-[140px]" : "w-[12%] min-w-[100px]"}
                />
              ))}
              <col className="w-[88px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
              <tr className="text-[11.5px] font-bold text-slate-600 dark:text-zinc-300">
                {dynamicColumns.map((col: TableColumn, idx: number) => (
                  <th
                    key={col.id}
                    className={cn("py-2.5 px-3", idx === 0 && "pl-4 pr-3")}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="py-2.5 pr-4 pl-3 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-950">
              {loadingCases ? (
                // Dynamic full screen skeletons
                Array.from({ length: 18 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {dynamicColumns.map((col: TableColumn, idx: number) => (
                      <td
                        key={col.id}
                        className={cn("py-3 px-3", idx === 0 && "pl-4 pr-3")}
                      >
                        <div
                          className="h-4 rounded-md bg-slate-200/80 dark:bg-zinc-800"
                          style={{ width: `${55 + ((i + idx * 3) % 5) * 8}%` }}
                        />
                      </td>
                    ))}
                    <td className="py-3 pr-4 pl-3 text-right">
                      <div className="ml-auto h-6 w-16 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
                    </td>
                  </tr>
                ))
              ) : filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setActiveCase(c)}
                    className="group cursor-pointer transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/20"
                  >
                    {dynamicColumns.map((col: TableColumn, idx: number) => {
                      const val = getCellValue(c, col)
                      const isFirst = idx === 0

                      return (
                        <td
                          key={col.id}
                          className={cn("py-2.5 px-3", isFirst && "pl-4 pr-3")}
                        >
                          {col.isUuic ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold tracking-wide text-violet-700 dark:text-violet-400 font-uuic group-hover:underline">
                                {val !== "—" ? val : c.uuic}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyUuic(val !== "—" ? val : c.uuic, e)}
                                title="ចម្លងកូដ UUIC"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-opacity"
                              >
                                {copiedUuic === (val !== "—" ? val : c.uuic) ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : col.isGender ? (
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10.5px] font-bold",
                                val?.toLowerCase() === "female" || val === "ស្រី"
                                  ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300"
                                  : val?.toLowerCase() === "male" || val === "ប្រុស"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                              )}
                            >
                              {val}
                            </span>
                          ) : col.isName ? (
                            <span className="font-medium text-slate-900 dark:text-zinc-100">
                              {val}
                            </span>
                          ) : col.isTag ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-zinc-300">
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}

                    {/* Action */}
                    <td className="py-2.5 pr-4 pl-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveCase(c)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-700"
                      >
                        <span>ព័ត៌មានលម្អិត</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={dynamicColumns.length + 1} className="py-24 text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                        <FolderOpen className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-slate-800 dark:text-zinc-200">
                          រកមិនឃើញករណីតាមដានទេ
                        </p>
                        <p className="text-[12px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          {searchQuery
                            ? `រកមិនឃើញករណីត្រូវនឹងកូដ UUIC "${searchQuery}" ទេ។ សូមសាកល្បងពាក្យគន្លឹះផ្សេង។`
                            : `មិនមានករណីកំពុងតាមដានក្នុង ${currentProgramObj?.displayName || "កម្មវិធីនេះ"} សម្រាប់ទីតាំង ${selectedOrgName} ឡើយ។`}
                        </p>
                      </div>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("")
                            loadCases(selectedOrgId, selectedProgram, 1, "")
                          }}
                          className="mt-1 rounded-xl bg-violet-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-xs hover:bg-violet-700"
                        >
                          សម្អាតការស្វែងរក
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-[12px] text-slate-500 dark:text-zinc-400">
            បង្ហាញ <span className="font-semibold text-slate-800 dark:text-zinc-200">{filteredCases.length}</span> នៃ{" "}
            <span className="font-semibold text-slate-800 dark:text-zinc-200">{totalCases.toLocaleString()}</span> ករណី
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loadingCases}
              onClick={() => loadCases(selectedOrgId, selectedProgram, currentPage - 1, searchQuery)}
              className="flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <ChevronLeft className="h-3 w-3" />
              ថយក្រោយ
            </button>
            <span className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300">
              ទំព័រ {currentPage}
            </span>
            <button
              type="button"
              disabled={filteredCases.length < pageSize || loadingCases}
              onClick={() => loadCases(selectedOrgId, selectedProgram, currentPage + 1, searchQuery)}
              className="flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              បន្ទាប់
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Org Unit Hierarchy Modal (like Capture) ─── */}
      <OrgUnitModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        orgUnits={orgUnits}
        selectedId={selectedOrgId}
        onApply={(id, name) => {
          setSelectedOrgId(id)
          setSelectedOrgName(name)
        }}
      />

      {/* ─── Period Selection Modal (like Capture) ─── */}
      <PeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        selectedPeriod={selectedPeriod}
        onApply={(key, label) => {
          setSelectedPeriod(key)
          setSelectedPeriodLabel(label)
        }}
      />

      {/* ─── Search Modal (like Capture) ─── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        currentQuery={searchQuery}
        orgUnitName={selectedOrgName}
        programName={currentProgramObj?.displayName}
        onSearch={(queryStr, isGlobal) => {
          setSearchQuery(queryStr)
          const targetOrg = isGlobal ? "vUs2cBkPn50" : selectedOrgId
          if (isGlobal) {
            setSelectedOrgId("vUs2cBkPn50")
            setSelectedOrgName("កម្ពុជា")
          }
          loadCases(targetOrg, selectedProgram, 1, queryStr)
        }}
      />

      {/* ─── Client Profile Modal (Center Dialog like Capture) ─── */}
      <ClientProfileModal
        isOpen={!!activeCase}
        onClose={() => setActiveCase(null)}
        uuic={activeCase?.uuic}
        pmrs={activeCasePmrs}
        clientName={activeCase?.fullName}
        npdCase={
          activeCase
            ? {
                fullName: activeCase.fullName,
                gender: activeCase.gender,
                dob: activeCase.dob,
                age: activeCase.age,
                kpType: activeCase.kpType,
                riskLevel: activeCase.riskLevel,
                province: activeCase.province,
                district: activeCase.district,
                hotspotName: activeCase.hotspotName,
                orgUnit: activeCase.orgUnit,
                rawAttributes: activeCase.rawAttributes,
              }
            : undefined
        }
      />
    </div>
  )
}
