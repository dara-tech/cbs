"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export type ProgramId = "ART" | "VCCT" | "NPD" | "ART_VCCT"

interface ProgramLogoProps {
  program: ProgramId | string
  size?: number
  className?: string
}

const LOGO_MAP: Record<string, { src: string; alt: string; objectFit?: "contain" | "cover" }> = {
  ART: { src: "/logo-art.jpg", alt: "ART Program", objectFit: "contain" },
  VCCT: { src: "/logo-vcct.jpg", alt: "VCCT Program", objectFit: "contain" },
  NPD: { src: "/logo-nchads.png", alt: "NCHADS / NPD", objectFit: "contain" },
}

export function ProgramLogo({ program, size = 40, className }: ProgramLogoProps) {
  if (program === "CBS_DUAL" || program === "DUAL") {
    const halfSize = Math.round(size * 0.7)
    return (
      <div
        className={cn("relative shrink-0 flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute -top-0.5 -left-0.5 overflow-hidden rounded-lg bg-white border border-slate-200/80 shadow-xs dark:border-zinc-700 z-10"
          style={{ width: halfSize, height: halfSize }}
        >
          <Image
            src={LOGO_MAP.NPD.src}
            alt="NPD"
            fill
            className="object-contain p-0.5"
            sizes={`${halfSize}px`}
            priority
          />
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 overflow-hidden rounded-lg bg-white border border-slate-200/80 shadow-xs dark:border-zinc-700 z-20"
          style={{ width: halfSize, height: halfSize }}
        >
          <Image
            src={LOGO_MAP.ART.src}
            alt="ART & VCCT"
            fill
            className="object-contain p-0.5"
            sizes={`${halfSize}px`}
            priority
          />
        </div>
      </div>
    )
  }

  if (program === "ART_VCCT") {
    const halfSize = Math.round(size * 0.72)
    return (
      <div
        className={cn("relative shrink-0 flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute -top-0.5 -left-0.5 overflow-hidden rounded-lg bg-white border border-slate-200/80 shadow-xs dark:border-zinc-700 z-10"
          style={{ width: halfSize, height: halfSize }}
        >
          <Image
            src={LOGO_MAP.ART.src}
            alt={LOGO_MAP.ART.alt}
            fill
            className="object-contain p-0.5"
            sizes={`${halfSize}px`}
            priority
          />
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 overflow-hidden rounded-lg bg-white border border-slate-200/80 shadow-xs dark:border-zinc-700 z-20"
          style={{ width: halfSize, height: halfSize }}
        >
          <Image
            src={LOGO_MAP.VCCT.src}
            alt={LOGO_MAP.VCCT.alt}
            fill
            className="object-contain p-0.5"
            sizes={`${halfSize}px`}
            priority
          />
        </div>
      </div>
    )
  }

  const logo = LOGO_MAP[program]

  if (!logo) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {program.slice(0, 2)}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200/60 dark:border-zinc-700",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        fill
        className={cn(
          logo.objectFit === "contain" ? "object-contain" : "object-cover",
          "p-0.5"
        )}
        sizes={`${size}px`}
        priority
      />
    </div>
  )
}
