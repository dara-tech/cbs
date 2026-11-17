"use client"

import React, { useState, useEffect } from "react"
import { Search, X, Globe, Building2, TestTube2, Pill, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  currentQuery: string
  orgUnitName: string
  programName?: string
  currentProgram?: string
  onSearch: (query: string, globalSearch: boolean, programScope?: string) => void
}

export function SearchModal({
  isOpen,
  onClose,
  currentQuery,
  orgUnitName,
  programName,
  currentProgram = "all",
  onSearch,
}: SearchModalProps) {
  const [query, setQuery] = useState(currentQuery)
  const [isGlobal, setIsGlobal] = useState(false)
  const [programScope, setProgramScope] = useState<string>("all")

  useEffect(() => {
    if (isOpen) {
      setQuery(currentQuery)
      setProgramScope(currentProgram || "all")
    }
  }, [isOpen, currentQuery, currentProgram])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query.trim(), isGlobal, programScope)
    onClose()
  }

  const handleClear = () => {
    setQuery("")
    onSearch("", isGlobal, programScope)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Search className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-zinc-100">
                ស្វែងរកឆ្លងកម្មវិធី (Cross-Program Search)
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                ស្វែងរកទិន្នន័យអតិថិជន និងអ្នកជំងឺក្នុងប្រព័ន្ធ CBS
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              លេខកូដសម្គាល់ (UUIC, ART, VCCT, PMRS, ទូរស័ព្ទ)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ឧ. UUIC (ពរដក...), លេខ ART (17020...), លេខ VCCT (#42118)..."
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50 pl-9 pr-9 text-[13px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
              ប្រព័ន្ធនឹងស្វែងរកស្វ័យប្រវត្តិកាត់តាមគ្រប់ប្រព័ន្ធទិន្នន័យ (VCCT, ART, Lab)
            </p>
          </div>

          {/* Program Scope Selection */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              កម្មវិធីដែលត្រូវស្វែងរក៖
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setProgramScope("all")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold border transition-all",
                  programScope === "all"
                    ? "bg-violet-600 text-white border-violet-600 shadow-2xs font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>គ្រប់កម្មវិធី</span>
              </button>

              <button
                type="button"
                onClick={() => setProgramScope("vcct")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold border transition-all",
                  programScope === "vcct"
                    ? "bg-violet-600 text-white border-violet-600 shadow-2xs font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                )}
              >
                <TestTube2 className="h-3.5 w-3.5" />
                <span>VCCT</span>
              </button>

              <button
                type="button"
                onClick={() => setProgramScope("art")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold border transition-all",
                  programScope === "art"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                )}
              >
                <Pill className="h-3.5 w-3.5" />
                <span>ART</span>
              </button>
            </div>
          </div>

          {/* Location Scope Options */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              វិសាលភាពទីតាំងភូមិសាស្ត្រ៖
            </span>
            <label className="flex items-center gap-2.5 text-[12.5px] cursor-pointer text-slate-700 dark:text-zinc-300">
              <input
                type="radio"
                name="searchScope"
                checked={!isGlobal}
                onChange={() => setIsGlobal(false)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <span>ក្នុងទីតាំងបច្ចុប្បន្ន ({orgUnitName})</span>
            </label>

            <label className="flex items-center gap-2.5 text-[12.5px] cursor-pointer text-slate-700 dark:text-zinc-300">
              <input
                type="radio"
                name="searchScope"
                checked={isGlobal}
                onChange={() => setIsGlobal(true)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <Globe className="h-4 w-4 text-violet-500 shrink-0" />
              <span className="font-medium text-violet-700 dark:text-violet-300">
                ស្វែងរកទូទាំងប្រទេស (គ្រប់ទីតាំងទាំងអស់)
              </span>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <div>
              {currentQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                >
                  សម្អាតការស្វែងរក
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 transition-colors"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition-colors"
              >
                ស្វែងរក
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
