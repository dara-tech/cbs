"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Building2,
  ChevronRight,
  Search,
  X,
  Check,
  Folder,
  MapPin,
  Hospital,
  Globe,
  ChevronsUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface DhisOrgUnit {
  id: string
  displayName: string
  name?: string
  level: number
  path?: string
  parent?: { id: string; displayName?: string }
}

export interface OrgTreeNode extends DhisOrgUnit {
  children: OrgTreeNode[]
}

interface OrgUnitModalProps {
  isOpen: boolean
  onClose: () => void
  orgUnits: DhisOrgUnit[]
  selectedId: string
  onApply: (orgUnitId: string, orgUnitName: string) => void
  programName?: string
}

const INDENT_PX = 18

/** Label helper prioritizing displayName */
function getOrgLabel(ou?: DhisOrgUnit | OrgTreeNode | null): string {
  if (!ou) return ""
  return (ou.displayName && String(ou.displayName).trim()) || ou.name || ou.id
}

/** Builds hierarchical tree from flat orgUnits array */
function buildOrgTree(units: DhisOrgUnit[]): OrgTreeNode[] {
  const map = new Map<string, OrgTreeNode>()
  for (const u of units) {
    map.set(u.id, { ...u, children: [] })
  }

  const roots: OrgTreeNode[] = []
  for (const u of units) {
    const node = map.get(u.id)!
    const parentId = u.parent?.id
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: OrgTreeNode[]) => {
    nodes.sort((a, b) => getOrgLabel(a).localeCompare(getOrgLabel(b), "km"))
    for (const n of nodes) {
      if (n.children.length > 0) {
        sortNodes(n.children)
      }
    }
  }

  sortNodes(roots)
  return roots
}

/** Recursively filters tree by search query */
function filterOrgTree(nodes: OrgTreeNode[], query: string): OrgTreeNode[] {
  if (!query.trim()) return nodes
  const lower = query.toLowerCase()
  const result: OrgTreeNode[] = []

  for (const node of nodes) {
    const childMatches = filterOrgTree(node.children, query)
    const labelMatches = getOrgLabel(node).toLowerCase().includes(lower)
    if (labelMatches || childMatches.length > 0) {
      result.push({
        ...node,
        children: childMatches,
      })
    }
  }

  return result
}

/** Returns all ancestor IDs for a target node */
function getAncestorIds(units: DhisOrgUnit[], targetId: string): string[] {
  if (!targetId) return []
  const byId = new Map(units.map((u) => [u.id, u]))
  const ancestors: string[] = []
  let curr = byId.get(targetId)
  while (curr?.parent?.id && byId.has(curr.parent.id)) {
    ancestors.push(curr.parent.id)
    curr = byId.get(curr.parent.id)
  }
  return ancestors
}

/** Formats breadcrumb path for selected OU */
function getOrgBreadcrumb(units: DhisOrgUnit[], targetId?: string): string {
  if (!targetId) return ""
  const byId = new Map(units.map((u) => [u.id, u]))
  const target = byId.get(targetId)
  if (!target) return ""

  if (target.path) {
    const segments = target.path.split("/").filter(Boolean)
    return segments
      .map((id) => getOrgLabel(byId.get(id)))
      .filter(Boolean)
      .join(" / ")
  }

  return getOrgLabel(target)
}

/** Single recursive Tree Node */
interface TreeNodeProps {
  node: OrgTreeNode
  selectedId: string
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  depth?: number
}

function OrgUnitTreeNode({
  node,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  depth = 0,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const isSelected = selectedId === node.id

  const getLevelIcon = () => {
    switch (node.level) {
      case 1:
        return <Globe className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
      case 2:
        return <Building2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
      case 3:
        return <Folder className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
      default:
        return <Hospital className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
    }
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex h-8.5 cursor-pointer items-center justify-between rounded-lg px-2 text-[12.5px] transition-colors",
          isSelected
            ? "bg-violet-100/90 font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
            : "text-slate-700 hover:bg-slate-100/90 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
        )}
        style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(node.id)
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200/80 hover:text-slate-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  isExpanded && "rotate-90 text-slate-700 dark:text-zinc-200"
                )}
              />
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          {getLevelIcon()}

          <span className="truncate">{getOrgLabel(node)}</span>

          {hasChildren && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
              ({node.children.length})
            </span>
          )}
        </div>

        {isSelected && (
          <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <OrgUnitTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgUnitModal({
  isOpen,
  onClose,
  orgUnits,
  selectedId,
  onApply,
  programName,
}: OrgUnitModalProps) {
  const [search, setSearch] = useState("")
  const [draftId, setDraftId] = useState(selectedId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Synchronize draftId with prop on open
  useEffect(() => {
    if (isOpen) {
      setDraftId(selectedId)
      // Expand path to the selected org unit
      const ancestors = getAncestorIds(orgUnits, selectedId)
      const root = orgUnits.find((u) => u.level === 1)
      const initialExpanded = new Set(ancestors)
      if (root) initialExpanded.add(root.id)
      setExpanded(initialExpanded)
    }
  }, [isOpen, selectedId, orgUnits])

  // Build tree
  const treeRoots = useMemo(() => buildOrgTree(orgUnits), [orgUnits])

  // Filtered tree
  const filteredRoots = useMemo(() => filterOrgTree(treeRoots, search), [treeRoots, search])

  // Auto-expand all when searching
  useEffect(() => {
    if (search.trim()) {
      const allIds = new Set<string>()
      const collect = (nodes: OrgTreeNode[]) => {
        for (const n of nodes) {
          if (n.children.length > 0) {
            allIds.add(n.id)
            collect(n.children)
          }
        }
      }
      collect(filteredRoots)
      setExpanded(allIds)
    }
  }, [search, filteredRoots])

  if (!isOpen) return null

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExpandAll = () => {
    const all = new Set<string>()
    const collect = (nodes: OrgTreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          all.add(n.id)
          collect(n.children)
        }
      }
    }
    collect(treeRoots)
    setExpanded(all)
  }

  const handleCollapseAll = () => {
    setExpanded(new Set())
  }

  const rootNode = orgUnits.find((u) => u.level === 1)

  const handleApply = () => {
    if (!draftId) return
    const unit = orgUnits.find((o) => o.id === draftId)
    onApply(draftId, getOrgLabel(unit) || "កម្ពុជា")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-zinc-100">
                ជ្រើសរើសអង្គភាពស្ថាប័ន
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                {programName
                  ? `ទីតាំងត្រូវបានចាត់តាំងសម្រាប់៖ ${programName}`
                  : "ជ្រើសរើសអង្គភាពស្ថាប័ន ឬទីតាំងគោលដៅ"}
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

        {/* Search Bar & Controls */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-zinc-800/80 bg-white dark:bg-zinc-950">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកអង្គភាព ខេត្ត ឬកន្លែងផ្តល់សេវា..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-slate-200/90 bg-slate-50 pl-9 pr-8 text-[12px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleExpandAll}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              title="ពង្រីកទាំងអស់"
            >
              ពង្រីកទាំងអស់
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              title="បង្រួមទាំងអស់"
            >
              បង្រួមទាំងអស់
            </button>
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-3 max-h-[50vh]">
          {filteredRoots.length > 0 ? (
            <div className="space-y-0.5">
              {filteredRoots.map((root) => (
                <OrgUnitTreeNode
                  key={root.id}
                  node={root}
                  selectedId={draftId}
                  expanded={expanded}
                  onToggle={handleToggle}
                  onSelect={setDraftId}
                  depth={0}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
              <p className="mt-2 text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
                រកមិនឃើញអង្គភាពស្ថាប័នត្រូវគ្នាទេ
              </p>
              <p className="text-[11.5px] text-slate-400 dark:text-zinc-500">
                សូមពិនិត្យមើលពាក្យគន្លឹះស្វែងរក ឬកម្មវិធីដែលបានជ្រើសរើស
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div>
            {rootNode && (
              <button
                type="button"
                onClick={() => {
                  setDraftId(rootNode.id)
                  onApply(rootNode.id, getOrgLabel(rootNode) || "កម្ពុជា")
                  onClose()
                }}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:text-zinc-300 transition-colors"
              >
                ទូទាំងប្រទេស
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:text-zinc-300 transition-colors"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!draftId}
              className="rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
