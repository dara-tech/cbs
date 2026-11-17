"use client"

import React, { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PeriodKind = "quarter" | "month" | "year" | "custom"

interface PeriodModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPeriod: string
  onApply: (periodKey: string, periodLabel: string) => void
}

const MONTHS_KM = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
]

export function PeriodModal({
  isOpen,
  onClose,
  selectedPeriod,
  onApply,
}: PeriodModalProps) {
  const currentYear = new Date().getFullYear()
  const [browseYear, setBrowseYear] = useState<number>(currentYear)
  const [periodKind, setPeriodKind] = useState<PeriodKind>("quarter")
  const [draftKey, setDraftKey] = useState<string>(selectedPeriod || "ALL")
  const [draftLabel, setDraftLabel] = useState<string>("គ្រប់កាលបរិច្ឆេទ")

  // Custom date range
  const [customStart, setCustomStart] = useState<string>("")
  const [customEnd, setCustomEnd] = useState<string>("")

  if (!isOpen) return null

  const kindTabs = [
    { id: "quarter", label: "ត្រីមាស" },
    { id: "month", label: "ខែ" },
    { id: "year", label: "ឆ្នាំ" },
    { id: "custom", label: "កំណត់ផ្ទាល់ខ្លួន" },
  ] as const

  const quarters = [
    { key: `${browseYear}Q1`, label: `ត្រីមាសទី១ (មករា - មីនា)` },
    { key: `${browseYear}Q2`, label: `ត្រីមាសទី២ (មេសា - មិថុនា)` },
    { key: `${browseYear}Q3`, label: `ត្រីមាសទី៣ (កក្កដា - កញ្ញា)` },
    { key: `${browseYear}Q4`, label: `ត្រីមាសទី៤ (តុលា - ធ្នូ)` },
  ]

  const months = MONTHS_KM.map((name, idx) => {
    const mm = String(idx + 1).padStart(2, "0")
    return {
      key: `${browseYear}${mm}`,
      label: `ខែ${name} ${browseYear}`,
    }
  })

  const years = Array.from({ length: 6 }).map((_, i) => {
    const y = currentYear - i
    return {
      key: String(y),
      label: `ឆ្នាំ ${y}`,
    }
  })

  const handleSelectPeriod = (key: string, label: string) => {
    setDraftKey(key)
    setDraftLabel(label)
  }

  const handleApply = () => {
    if (periodKind === "custom") {
      if (customStart && customEnd) {
        onApply(`CUSTOM:${customStart}:${customEnd}`, `${customStart} ដល់ ${customEnd}`)
      } else {
        onApply("ALL", "គ្រប់កាលបរិច្ឆេទ")
      }
    } else {
      onApply(draftKey, draftLabel)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-primary)] text-white shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                ជ្រើសរើសកាលបរិច្ឆេទ
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                ជ្រើសរើសតាមត្រីមាស ខែ ឆ្នាំ ឬកំណត់ចន្លោះថ្ងៃ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Period Kind Tabs */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {kindTabs.map((tab) => {
              const active = periodKind === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriodKind(tab.id)}
                  className={cn(
                    "inline-flex h-8.5 items-center justify-center rounded-xl border px-3.5 text-[13px] font-semibold transition-all",
                    active
                      ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Year Navigator (for Quarters & Months) */}
          {(periodKind === "quarter" || periodKind === "month") && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setBrowseYear((y) => y - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <span className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  ឆ្នាំ {browseYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBrowseYear((y) => y + 1)}
                disabled={browseYear >= currentYear + 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quarters Grid */}
          {periodKind === "quarter" && (
            <div className="grid grid-cols-2 gap-2">
              {quarters.map((q) => {
                const active = draftKey === q.key
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => handleSelectPeriod(q.key, `${q.label} ${browseYear}`)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left transition-all",
                      active
                        ? "border-[var(--app-primary)] bg-[var(--app-primary)]/10 font-bold text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white"
                          : "border-slate-300 dark:border-zinc-700"
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-[12.5px]">{q.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Months Grid */}
          {periodKind === "month" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {months.map((m) => {
                const active = draftKey === m.key
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleSelectPeriod(m.key, m.label)}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-xl border px-2.5 text-left transition-all",
                      active
                        ? "border-[var(--app-primary)] bg-[var(--app-primary)]/10 font-bold text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white"
                          : "border-slate-300 dark:border-zinc-700"
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-[12px]">{m.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Years Grid */}
          {periodKind === "year" && (
            <div className="grid grid-cols-2 gap-2">
              {years.map((y) => {
                const active = draftKey === y.key
                return (
                  <button
                    key={y.key}
                    type="button"
                    onClick={() => handleSelectPeriod(y.key, y.label)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left transition-all",
                      active
                        ? "border-[var(--app-primary)] bg-[var(--app-primary)]/10 font-bold text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white"
                          : "border-slate-300 dark:border-zinc-700"
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-[12.5px]">{y.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Custom Date Range */}
          {periodKind === "custom" && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <span className="mb-3 block text-xs font-bold text-slate-700 dark:text-zinc-300">
                ជ្រើសរើសចន្លោះកាលបរិច្ឆេទ
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    ថ្ងៃចាប់ផ្តើម
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    ថ្ងៃបញ្ចប់
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="min-w-0 flex-1 pr-3">
            <span className="text-[11.5px] text-slate-400 dark:text-zinc-500">បានជ្រើសរើស: </span>
            <span className="font-bold text-[12.5px] text-[var(--app-primary)] dark:text-sky-300 truncate">
              {periodKind === "custom" && customStart
                ? `${customStart} ដល់ ${customEnd || "បច្ចុប្បន្ន"}`
                : draftLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDraftKey("ALL")
                setDraftLabel("គ្រប់កាលបរិច្ឆេទ")
                onApply("ALL", "គ្រប់កាលបរិច្ឆេទ")
                onClose()
              }}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300"
            >
              គ្រប់កាលបរិច្ឆេទ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-[var(--app-primary)] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
