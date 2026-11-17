"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  collapsed?: boolean
  className?: string
}

export function ThemeToggle({ collapsed = false, className }: ThemeToggleProps) {
  const { resolved, toggleTheme } = useTheme()
  const isDark = resolved === "dark"
  const Icon = isDark ? Moon : Sun
  const label = isDark ? "Dark mode" : "Light mode"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "group flex items-center text-slate-500 transition-colors hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100",
        collapsed
          ? "w-full justify-center py-1"
          : "w-full gap-2.5 px-2.5 py-1.5 rounded-xl",
        className
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl transition-all duration-150 group-hover:bg-slate-100/70 dark:group-hover:bg-zinc-800",
          collapsed ? "h-10 w-10" : "h-8 w-8 rounded-lg"
        )}
      >
        <Icon className={cn(collapsed ? "h-5 w-5" : "h-4 w-4")} strokeWidth={1.8} aria-hidden />
      </span>
      {!collapsed && (
        <span className="truncate text-[13px] font-medium">{label}</span>
      )}
    </button>
  )
}
