"use client"

import { useState } from "react"
import { AppSidebar, type NavSection } from "@/components/AppSidebar"
import { TopNav } from "@/components/TopNav"
import { cn } from "@/lib/utils"
import { type DbConnection, clearActiveConnection } from "@/lib/database"
import { LinkageHubView } from "@/components/linkage/LinkageHubView"

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  records: { title: "Patient Records", subtitle: "Search and manage client records" },
  linkage: { title: "ID Linkage Hub", subtitle: "National MPI Linkage, deduplication & retention tracker" },
  dashboard: { title: "Dashboard", subtitle: "Analytics and program indicators" },
}

interface AppShellProps {
  children: React.ReactNode
  connection: DbConnection | null
}

export function AppShell({ children, connection }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [activeSection, setActiveSection] = useState<NavSection>("records")

  const { title, subtitle } = SECTION_TITLES[activeSection]

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--app-canvas)] dark:bg-black">
      <TopNav
        title={title}
        subtitle={subtitle}
        connection={connection}
        onDisconnect={() => {
          clearActiveConnection()
          window.location.reload()
        }}
      />

      <div className={cn("flex min-h-0 min-w-0 flex-1 overflow-hidden gap-1.5 p-1.5 md:gap-2 md:p-2")}>
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isAdmin={true}
        />

        <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0")}>
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
            {activeSection === "linkage" ? <LinkageHubView /> : children}
          </div>
        </main>
      </div>
    </div>
  )
}
