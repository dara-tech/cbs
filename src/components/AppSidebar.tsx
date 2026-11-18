"use client"

import {
  Contact2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

export type NavSection =
  | "records"
  | "dashboard"

interface NavItemDef {
  id: NavSection
  label: string
  title: string
  Icon: React.ElementType
  group: "clinical"
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  {
    id: "records",
    label: "Records",
    title: "Patient Records",
    Icon: Contact2,
    group: "clinical",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Dashboard",
    Icon: LayoutDashboard,
    group: "clinical",
  },
]

interface NavItemProps {
  item: NavItemDef
  active: boolean
  collapsed: boolean
  onClick: () => void
}

function NavItem({ item, active, collapsed, onClick }: NavItemProps) {
  const { label, title, Icon } = item

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center transition-all duration-150 select-none",
        collapsed
          ? "w-10 h-10 justify-center rounded-xl my-0.5"
          : "w-full gap-2.5 px-2.5 py-2 rounded-xl text-left",
        active
          ? "bg-[var(--app-primary)]/10 text-[var(--app-primary)] font-semibold shadow-xs dark:bg-sky-500/15 dark:text-sky-300"
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100"
      )}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center transition-transform duration-150 group-active:scale-95",
          collapsed ? "h-full w-full" : "h-5 w-5"
        )}
      >
        <Icon
          className={cn(collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")}
          strokeWidth={active ? 2.2 : 1.8}
          aria-hidden
        />
      </span>

      {!collapsed && (
        <span className="flex-1 truncate text-[13px] tracking-tight">{label}</span>
      )}

      {/* Left accent indicator when active in expanded mode */}
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[var(--app-primary)] dark:bg-sky-400"
        />
      )}
    </button>
  )
}

interface NavItemMobileProps {
  item: NavItemDef
  active: boolean
  onClick: () => void
}

function NavItemMobile({ item, active, onClick }: NavItemMobileProps) {
  const { label, Icon } = item

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 transition-all duration-150",
        active
          ? "text-[var(--app-primary)] font-semibold dark:text-sky-400"
          : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
          active
            ? "bg-[var(--app-primary)]/12 text-[var(--app-primary)] dark:bg-sky-500/20 dark:text-sky-300"
            : "bg-transparent text-slate-500 dark:text-zinc-400"
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.9} aria-hidden />
      </span>
      <span className="max-w-full truncate text-[10.5px] font-medium leading-none tracking-tight">
        {label}
      </span>
    </button>
  )
}

interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  activeSection: NavSection
  onSectionChange: (section: NavSection) => void
  isAdmin?: boolean
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  activeSection,
  onSectionChange,
}: AppSidebarProps) {
  const navItems = ALL_NAV_ITEMS

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col self-stretch rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-[width] duration-200 ease-out dark:border-zinc-800/80 dark:bg-zinc-950 md:flex",
          collapsed ? "w-14 py-3 px-1.5" : "w-44 p-2.5"
        )}
      >
        <nav
          className="flex flex-1 flex-col items-center gap-1"
          aria-label="Navigation"
        >
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeSection === item.id}
              collapsed={collapsed}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1 pt-2">
          <div
            className={cn(
              "border-t border-slate-200/80 dark:border-zinc-800 my-0.5",
              collapsed ? "w-6" : "w-full"
            )}
          />
          <ThemeToggle collapsed={collapsed} />
          <div
            className={cn(
              "border-t border-slate-200/80 dark:border-zinc-800 my-0.5",
              collapsed ? "w-6" : "w-full"
            )}
          />
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "group flex items-center text-slate-500 transition-colors hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 select-none",
              collapsed
                ? "w-10 h-10 justify-center rounded-xl hover:bg-slate-100/70 dark:hover:bg-zinc-900"
                : "w-full gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-zinc-900"
            )}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center transition-all duration-150",
                collapsed ? "h-full w-full" : "h-5 w-5"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
              )}
            </span>
            {!collapsed && (
              <span className="truncate text-xs font-medium text-slate-500">Collapse</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200/60 bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] dark:border-zinc-800/60 dark:bg-zinc-950/95 md:hidden"
        style={{ boxShadow: "0 -1px 0 0 rgba(0,0,0,0.05), 0 -4px 16px rgba(0,0,0,0.04)" }}
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => (
          <NavItemMobile
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          />
        ))}
      </nav>
    </>
  )
}
