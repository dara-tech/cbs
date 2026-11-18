"use client"

import React from "react"
import {
  CheckCircle2,
  GitMerge,
  AlertTriangle,
  Unlink,
  XCircle,
  Sparkles,
  Link2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LinkageStatus } from "./types"

export interface LinkStatusBadgeProps {
  status: LinkageStatus
  confidenceScore?: number // e.g. 92
  mpiId?: string | null
  linkedSystems?: Array<"NPD" | "VCCT" | "ART">
  isHivPositiveUnlinked?: boolean
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  onReviewClick?: () => void
  onManualLinkClick?: () => void
  className?: string
}

export function LinkStatusBadge({
  status,
  confidenceScore,
  mpiId,
  linkedSystems,
  isHivPositiveUnlinked = false,
  size = "sm",
  showLabel = true,
  onReviewClick,
  onManualLinkClick,
  className,
}: LinkStatusBadgeProps) {
  const isClickable = Boolean(
    (status === "proposed" && onReviewClick) ||
    (status === "unlinked" && onManualLinkClick) ||
    (status === "conflicted" && onReviewClick)
  )

  const handleClick = (e: React.MouseEvent) => {
    if (!isClickable) return
    e.stopPropagation()
    if (status === "proposed" && onReviewClick) {
      onReviewClick()
    } else if (status === "unlinked" && onManualLinkClick) {
      onManualLinkClick()
    } else if (status === "conflicted" && onReviewClick) {
      onReviewClick()
    }
  }

  // Large header variant for ClientProfileModal
  if (size === "lg") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5 rounded-xl border p-2.5 sm:px-3.5 sm:py-2 text-[12px]",
          status === "verified" &&
            "bg-emerald-50/90 border-emerald-200/80 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300",
          status === "proposed" &&
            "bg-amber-50/90 border-amber-300/80 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300",
          status === "conflicted" &&
            "bg-rose-50/90 border-rose-300/80 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300",
          status === "unlinked" &&
            "bg-slate-50 border-slate-200 text-slate-700 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-300",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {status === "verified" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <Link2 className="h-4 w-4" />
            </span>
          )}
          {status === "proposed" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </span>
          )}
          {status === "conflicted" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          {status === "unlinked" && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Unlink className="h-4 w-4" />
            </span>
          )}

          <div>
            <div className="flex items-center gap-1.5 font-bold">
              <span>
                {status === "verified" && "បានភ្ជាប់ប្រព័ន្ធរួច (Linked Master Index)"}
                {status === "proposed" && "មានបេក្ខជនផ្គូផ្គងសក្តានុពល (Suggested Match)"}
                {status === "conflicted" && "មានទំនាស់ទិន្នន័យ (Data Conflict)"}
                {status === "unlinked" && "មិនទាន់បានភ្ជាប់ប្រព័ន្ធ (Unlinked)"}
              </span>
              {confidenceScore !== undefined && status === "proposed" && (
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                  {confidenceScore}% ភាពត្រូវគ្នា
                </span>
              )}
            </div>
            {mpiId && (
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                កូដសម្គាល់ MPI: <strong className="font-mono">{mpiId}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Linked systems chain */}
        {linkedSystems && linkedSystems.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400 mr-1">ប្រព័ន្ធភ្ជាប់:</span>
            {linkedSystems.map((sys) => (
              <span
                key={sys}
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-bold tracking-tight",
                  sys === "NPD" && "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
                  sys === "VCCT" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                  sys === "ART" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                )}
              >
                {sys}
              </span>
            ))}
          </div>
        )}

        {/* Action Button inside banner */}
        {status === "proposed" && onReviewClick && (
          <button
            type="button"
            onClick={onReviewClick}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all"
          >
            <span>ផ្ទៀងផ្ទាត់ការផ្គូផ្គង</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {status === "unlinked" && onManualLinkClick && (
          <button
            type="button"
            onClick={onManualLinkClick}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <span>ស្វែងរកភ្ជាប់</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  // Table cell badge (compact and responsive)
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={!isClickable}
        onClick={handleClick}
        title={
          status === "proposed"
            ? `បេក្ខជនសក្តានុពល (${confidenceScore}% ភាពត្រូវគ្នា) - ចុចដើម្បីផ្ទៀងផ្ទាត់`
            : status === "verified"
            ? "កំណត់ត្រាបានភ្ជាប់រួច"
            : status === "conflicted"
            ? "មានទំនាស់ទិន្នន័យ - ចុចដើម្បីដោះស្រាយ"
            : "មិនទាន់ភ្ជាប់ - ចុចដើម្បីស្វែងរកការភ្ជាប់"
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all select-none",
          isClickable && "cursor-pointer hover:shadow-xs active:scale-95",
          !isClickable && "cursor-default",

          // Verified
          status === "verified" &&
            "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",

          // Proposed / Potential Match
          status === "proposed" &&
            "bg-amber-50 text-amber-800 border-amber-300/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80 hover:bg-amber-100",

          // Conflicted
          status === "conflicted" &&
            "bg-rose-50 text-rose-700 border-rose-300/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100",

          // Unlinked
          status === "unlinked" &&
            "bg-slate-100/90 text-slate-600 border-slate-200 dark:bg-zinc-800/70 dark:text-zinc-400 dark:border-zinc-700 hover:border-slate-300",

          // Rejected
          status === "rejected" &&
            "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-500 dark:border-zinc-700"
        )}
      >
        {status === "verified" && <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />}
        {status === "proposed" && <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />}
        {status === "conflicted" && <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />}
        {status === "unlinked" && <Unlink className="h-3 w-3 text-slate-400 dark:text-zinc-500 shrink-0" />}
        {status === "rejected" && <XCircle className="h-3 w-3 text-zinc-400 shrink-0" />}

        {showLabel && (
          <span>
            {status === "verified" && "បានភ្ជាប់"}
            {status === "proposed" && "បេក្ខជនត្រូវគ្នា"}
            {status === "conflicted" && "មានទំនាស់"}
            {status === "unlinked" && "មិនទាន់ភ្ជាប់"}
            {status === "rejected" && "បានបដិសេធ"}
          </span>
        )}

        {confidenceScore !== undefined && status === "proposed" && (
          <span className="rounded-full bg-amber-200/90 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-900 dark:bg-amber-900/90 dark:text-amber-200">
            {confidenceScore}%
          </span>
        )}

        {isClickable && (
          <ChevronRight className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
        )}
      </button>

      {/* High-priority cascade gap alert: HIV+ VCCT without ART link */}
      {isHivPositiveUnlinked && status === "unlinked" && (
        <span
          title="ករណីវិជ្ជមាន HIV មិនទាន់មានកំណត់ត្រា ART - អាទិភាពខ្ពស់"
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse border border-rose-300"
        >
          <ShieldAlert className="h-2.5 w-2.5" />
          <span>ខ្វះ ART</span>
        </span>
      )}
    </div>
  )
}
