"use client"

import React, { useState, useEffect, useRef } from "react"
import { Bell, ChevronDown, LogOut, Search, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { type DbConnection } from "@/lib/database"
import { getProgramColor } from "@/lib/programColors"
import { ProgramLogo } from "@/components/ProgramLogo"
import { useConnection } from "@/lib/ConnectionContext"

interface TopNavProps {
  title?: string
  subtitle?: string
  connection?: DbConnection | null
  onDisconnect?: () => void
  className?: string
}

export function TopNav({
  title = "Case Base Surveillance (CBS)",
  subtitle,
  connection,
  onDisconnect,
  className,
}: TopNavProps) {
  const progColor = connection ? getProgramColor(connection.program) : null
  const { isDual, activeView, setActiveView } = useConnection()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    window.dispatchEvent(new CustomEvent("cbs:search", { detail: searchValue.trim() }))
  }

  const handleClear = () => {
    setSearchValue("")
    window.dispatchEvent(new CustomEvent("cbs:search", { detail: "" }))
    setIsSearchOpen(false)
  }

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-3 border-b border-slate-200/60 bg-white/90 px-4 backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-950/90",
        className
      )}
    >
      {/* Page title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-col justify-center hidden sm:flex">
          <h1 className="truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[11px] leading-tight text-slate-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Active DB pill with switch database action */}
        {connection && progColor && (
          <button
            type="button"
            onClick={onDisconnect}
            title="Click to switch database connection"
            className={cn(
              "hidden md:flex items-center gap-2 rounded-full border pl-1.5 pr-2.5 py-0.5 cursor-pointer transition-all hover:opacity-80 active:scale-95",
              progColor.bg, progColor.border
            )}
          >
            <ProgramLogo program={connection.program} size={20} className="rounded-full" />
            <span className={cn("text-[11px] font-semibold", progColor.text)}>
              {connection.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
              (Switch)
            </span>
          </button>
        )}

        {/* Dual Mode View Switcher (NPD Surveillance vs ART/VCCT MySQL) */}
        {isDual && (
          <div className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100/90 p-0.5 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveView("NPD")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer",
                activeView === "NPD"
                  ? "bg-white text-violet-700 shadow-xs dark:bg-zinc-800 dark:text-violet-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              NPD Surveillance (DHIS2)
            </button>
            <button
              type="button"
              onClick={() => setActiveView("CLINICAL")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer",
                activeView === "CLINICAL"
                  ? "bg-white text-blue-700 shadow-xs dark:bg-zinc-800 dark:text-blue-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              ART & VCCT (MySQL)
            </button>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        {isSearchOpen ? (
          <form
            onSubmit={handleSearchSubmit}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-1.5 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100"
          >
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (!searchValue) setIsSearchOpen(false)
                  else handleClear()
                }
              }}
              placeholder="Search records, UUIC..."
              className="w-36 sm:w-56 bg-transparent text-[12px] text-slate-800 placeholder-slate-400 outline-none dark:text-zinc-200"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Search"
            title="Search (⌘K)"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--app-primary)]" />
        </button>

        {/* Settings */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* User + disconnect */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-lg px-2 py-1 text-slate-700 transition-colors hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="User menu"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-primary)]/12 text-[11px] font-bold text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300">
              {connection?.username?.[0]?.toUpperCase() ?? "A"}
            </span>
            <span className="hidden text-[12px] font-medium sm:inline">
              {connection?.username ?? "Admin"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
          </button>

          {onDisconnect && (
            <button
              type="button"
              onClick={onDisconnect}
              title="Disconnect / switch database"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
