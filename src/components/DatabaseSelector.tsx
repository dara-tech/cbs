"use client"

import React, { useState, useId, useEffect } from "react"
import Image from "next/image"
import {
  AlertCircle,
  Check,
  Globe,
  HardDrive,
  Loader2,
  Server,
  Settings2,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type DbConnection,
  type ConnectionKind,
  getSavedConnections,
  saveConnection,
  deleteConnection,
  testDhis2Connection,
  testMySqlConnection,
  setActiveConnection,
} from "@/lib/database"

// ─── Connection Configuration Modal ──────────────────────────────────────────

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  kind: ConnectionKind
  onSaveAndConnect: (conn: DbConnection) => void
}

function ConnectionModal({
  isOpen,
  onClose,
  kind,
  onSaveAndConnect,
}: ConnectionModalProps) {
  const uid = useId()
  const isMySQL = kind === "MYSQL"

  // MySQL form state
  const [mysqlForm, setMysqlForm] = useState({
    name: "មូលដ្ឋានទិន្នន័យ ART & VCCT (NCHADS MPI)",
    host: "mpi.nchads.gov.kh",
    port: 3306,
    dbName: "main_dbs",
    username: "root_dmu",
    password: "",
  })

  // DHIS2 form state
  const [dhis2Form, setDhis2Form] = useState({
    name: "National Prevention Database",
    serverUrl: "https://npd.nchads.gov.kh",
    username: "",
    password: "",
  })

  const [showPass, setShowPass] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  if (!isOpen) return null

  const handleMysqlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    const res = await testMySqlConnection(
      mysqlForm.host,
      mysqlForm.port,
      mysqlForm.dbName,
      mysqlForm.username,
      mysqlForm.password
    )

    if (!res.ok) {
      setStatus("error")
      setErrorMsg(res.error ?? "MySQL connection error")
      return
    }

    const conn: DbConnection = {
      id: "art-vcct-mysql",
      name: mysqlForm.name,
      kind: "MYSQL",
      program: "ART_VCCT",
      programs: ["ART", "VCCT"],
      host: mysqlForm.host,
      port: Number(mysqlForm.port),
      dbName: mysqlForm.dbName,
      username: mysqlForm.username,
      createdAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      color: "#2c6693",
    }

    saveConnection(conn)
    setActiveConnection(conn)
    setStatus("success")
    setTimeout(() => {
      onSaveAndConnect(conn)
      onClose()
    }, 400)
  }

  const handleDhis2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    const res = await testDhis2Connection(
      dhis2Form.serverUrl,
      dhis2Form.username,
      dhis2Form.password
    )

    if (!res.ok) {
      setStatus("error")
      setErrorMsg(res.error ?? "Cannot connect to DHIS2 instance")
      return
    }

    const conn: DbConnection = {
      id: `npd-dhis2-${Date.now()}`,
      name: dhis2Form.name,
      kind: "DHIS2",
      program: "NPD",
      programs: ["NPD"],
      serverUrl: dhis2Form.serverUrl.replace(/\/$/, ""),
      username: dhis2Form.username,
      createdAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      color: "#7c3aed",
    }

    saveConnection(conn)
    setActiveConnection(conn)
    setStatus("success")
    setTimeout(() => {
      onSaveAndConnect(conn)
      onClose()
    }, 400)
  }

  // Bypass for offline demo
  const handleBypassDhis2 = () => {
    const conn: DbConnection = {
      id: `npd-dhis2-${Date.now()}`,
      name: dhis2Form.name || "National Prevention Database",
      kind: "DHIS2",
      program: "NPD",
      programs: ["NPD"],
      serverUrl: dhis2Form.serverUrl.replace(/\/$/, ""),
      username: dhis2Form.username || "admin",
      createdAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      color: "#7c3aed",
    }
    saveConnection(conn)
    setActiveConnection(conn)
    onSaveAndConnect(conn)
    onClose()
  }

  const inputCls = cn(
    "h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none transition-all",
    "placeholder:text-slate-400",
    "focus:border-[var(--app-primary)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--app-primary)]/10",
    "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
    "dark:focus:border-sky-500/50 dark:focus:bg-zinc-800"
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            {isMySQL ? (
              <div className="flex -space-x-1.5 items-center">
                <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-white z-10">
                  <Image src="/logo-art.jpg" alt="ART" fill className="object-contain p-0.5" />
                </div>
                <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-white z-20">
                  <Image src="/logo-vcct.jpg" alt="VCCT" fill className="object-contain p-0.5" />
                </div>
              </div>
            ) : (
              <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Image src="/logo-nchads.png" alt="NPD" fill className="object-contain p-0.5" />
              </div>
            )}
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-50">
                {isMySQL ? "Configure MySQL (ART & VCCT)" : "Configure DHIS2 Instance (NPD)"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {isMySQL ? "Shared MySQL Database" : "National Prevention Database"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── MySQL Form (ART & VCCT) ─── */}
        {isMySQL ? (
          <form onSubmit={handleMysqlSubmit} className="flex flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-name`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Database Label
              </label>
              <input
                id={`${uid}-name`}
                className={inputCls}
                value={mysqlForm.name}
                onChange={(e) => setMysqlForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor={`${uid}-host`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Host
                </label>
                <div className="relative">
                  <Server className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    id={`${uid}-host`}
                    className={cn(inputCls, "pl-8")}
                    value={mysqlForm.host}
                    onChange={(e) => setMysqlForm((f) => ({ ...f, host: e.target.value }))}
                    placeholder="localhost"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-port`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Port
                </label>
                <input
                  id={`${uid}-port`}
                  type="number"
                  className={inputCls}
                  value={mysqlForm.port}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, port: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-db`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                MySQL Database Name
              </label>
              <div className="relative">
                <HardDrive className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id={`${uid}-db`}
                  className={cn(inputCls, "pl-8")}
                  value={mysqlForm.dbName}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, dbName: e.target.value }))}
                  placeholder="cbs_art_vcct"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-user`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Username
                </label>
                <input
                  id={`${uid}-user`}
                  className={inputCls}
                  value={mysqlForm.username}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="root"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-pwd`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id={`${uid}-pwd`}
                    className={cn(inputCls, "pr-8")}
                    value={mysqlForm.password}
                    onChange={(e) => setMysqlForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    type={showPass ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-400"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--app-primary)] text-[12px] font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-70 transition-all"
              >
                {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {status === "success" && <Check className="h-3.5 w-3.5" />}
                {status === "loading" ? "Connecting..." : status === "success" ? "Connected!" : "Save & Connect"}
              </button>
            </div>
          </form>
        ) : (
          /* ─── DHIS2 Instance Form (NPD) ─── */
          <form onSubmit={handleDhis2Submit} className="flex flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-dhis2-name`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Instance Name
              </label>
              <input
                id={`${uid}-dhis2-name`}
                className={inputCls}
                value={dhis2Form.name}
                onChange={(e) => setDhis2Form((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-dhis2-url`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                DHIS2 Server URL
              </label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id={`${uid}-dhis2-url`}
                  className={cn(inputCls, "pl-8")}
                  value={dhis2Form.serverUrl}
                  onChange={(e) => setDhis2Form((f) => ({ ...f, serverUrl: e.target.value }))}
                  placeholder="https://npd.nchads.gov.kh or http://localhost:8080"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-dhis2-user`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  DHIS2 Username
                </label>
                <input
                  id={`${uid}-dhis2-user`}
                  className={inputCls}
                  value={dhis2Form.username}
                  onChange={(e) => setDhis2Form((f) => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-dhis2-pwd`} className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  DHIS2 Password
                </label>
                <div className="relative">
                  <input
                    id={`${uid}-dhis2-pwd`}
                    className={cn(inputCls, "pr-8")}
                    value={dhis2Form.password}
                    onChange={(e) => setDhis2Form((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    type={showPass ? "text" : "password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-400"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {status === "error" && (
              <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-900/40 dark:bg-red-950/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-[11.5px] text-red-700 dark:text-red-400">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={handleBypassDhis2}
                  className="text-[10.5px] font-semibold text-red-700 underline dark:text-red-300 ml-2"
                >
                  Save anyway
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-[12px] font-semibold text-white shadow-xs hover:bg-violet-700 disabled:opacity-70 transition-all"
              >
                {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {status === "success" && <Check className="h-3.5 w-3.5" />}
                {status === "loading" ? "Verifying..." : status === "success" ? "Connected!" : "Connect Instance"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main DatabaseSelector Component ──────────────────────────────────────────

interface DatabaseSelectorProps {
  onConnected: (conn: DbConnection) => void
}

export function DatabaseSelector({ onConnected }: DatabaseSelectorProps) {
  const [connections, setConnections] = useState<DbConnection[]>([])
  const [modalKind, setModalKind] = useState<ConnectionKind | null>(null)

  useEffect(() => {
    setConnections(getSavedConnections())
  }, [])

  const handleDirectConnectSaved = (conn: DbConnection) => {
    const updated = { ...conn, lastConnected: new Date().toISOString() }
    saveConnection(updated)
    setActiveConnection(updated)
    onConnected(updated)
  }

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConnection(id)
    setConnections(getSavedConnections())
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-canvas)] px-4 py-8 dark:bg-black">
      <div className="w-full max-w-2xl">
        {/* Minimal Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200/80 dark:border-zinc-800">
            <Image
              src="/logo-nchads.png"
              alt="NCHADS Logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Case Base Surveillance (CBS)
          </h1>
          <p className="text-[12.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
            National Center for HIV/AIDS, Dermatology and STD (NCHADS)
          </p>
        </div>

        {/* Database & Instance Cards (Side-by-Side Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── CARD 1: ART & VCCT (MySQL Database) ── */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-blue-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700">
            <div>
              {/* Top row: Logos */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center -space-x-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-700 z-10">
                    <Image src="/logo-art.jpg" alt="ART" fill className="object-contain p-0.5" priority />
                  </div>
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-700 z-20">
                    <Image src="/logo-vcct.jpg" alt="VCCT" fill className="object-contain p-0.5" priority />
                  </div>
                </div>

                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">
                  MySQL Database
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-zinc-50 mb-1">
                ART & VCCT
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-4">
                Unified MySQL database shared by Antiretroviral Therapy (ART) and VCCT programs.
              </p>
            </div>

            {/* Bottom Config / Connect Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between">
              <span className="font-mono text-[10.5px] text-slate-400 dark:text-zinc-500">
                localhost:3306
              </span>
              <button
                type="button"
                onClick={() => setModalKind("MYSQL")}
                className="flex h-8.5 items-center gap-1.5 rounded-xl bg-[var(--app-primary)] px-3.5 text-[12px] font-semibold text-white shadow-xs transition-all hover:opacity-90"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configure & Connect
              </button>
            </div>
          </div>

          {/* ── CARD 2: NPD: National Prevention Database (DHIS2 Instance) ── */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-violet-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700">
            <div>
              {/* Top row: NCHADS Logo */}
              <div className="flex items-center justify-between mb-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs dark:border-zinc-700">
                  <Image src="/logo-nchads.png" alt="NPD" fill className="object-contain p-0.5" priority />
                </div>

                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200/80 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50">
                  DHIS2 Instance
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-zinc-50 mb-1">
                National Prevention Database
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-4">
                Configured as a dedicated DHIS2 Web API instance with server credentials.
              </p>
            </div>

            {/* Bottom Config / Connect Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400 dark:text-zinc-500">
                DHIS2 Server URL
              </span>
              <button
                type="button"
                onClick={() => setModalKind("DHIS2")}
                className="flex h-8.5 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-xs transition-all hover:bg-violet-700"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configure & Connect
              </button>
            </div>
          </div>
        </div>

        {/* Saved Connections (Compact List if exists) */}
        {connections.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950 shadow-2xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 mb-2 block">
              Saved Connections ({connections.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {connections.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleDirectConnectSaved(c)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-left transition-all hover:border-slate-300 hover:bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-zinc-200">
                      {c.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-400 dark:text-zinc-500">
                      {c.kind === "DHIS2" ? c.serverUrl : `${c.host || "localhost"}:${c.port || 3306}`} · {c.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSaved(c.id, e)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-red-950/40"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configurable Connection Modal */}
      {modalKind && (
        <ConnectionModal
          isOpen={Boolean(modalKind)}
          kind={modalKind}
          onClose={() => setModalKind(null)}
          onSaveAndConnect={onConnected}
        />
      )}
    </div>
  )
}
