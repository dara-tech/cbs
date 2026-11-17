export const PROGRAM_COLORS = {
  ART: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/80 dark:border-blue-800/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    dot: "bg-blue-500",
  },
  VCCT: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200/80 dark:border-red-800/50",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    dot: "bg-red-500",
  },
  // Combined ART + VCCT shared DB
  ART_VCCT: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/80 dark:border-blue-800/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    dot: "bg-blue-500",
  },
  NPD: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200/80 dark:border-violet-800/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    dot: "bg-violet-500",
  },
} as const

type ColorKey = keyof typeof PROGRAM_COLORS

export function getProgramColor(program: string) {
  return (
    PROGRAM_COLORS[program as ColorKey] ?? {
      bg: "bg-slate-50 dark:bg-zinc-900/40",
      text: "text-slate-700 dark:text-zinc-300",
      border: "border-slate-200/80 dark:border-zinc-700/50",
      iconBg: "bg-slate-100 dark:bg-zinc-800/60",
      dot: "bg-slate-400",
    }
  )
}
