"use client"

import React, { useState, useId, useEffect } from "react"
import Image from "next/image"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Globe,
  HardDrive,
  Link2,
  Loader2,
  Lock,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  Eye,
  EyeOff,
  Database,
  ArrowRight,
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
  testDualConnection,
  setActiveConnection,
} from "@/lib/database"

// ─── Dual Connection Configuration Modal ──────────────────────────────────────

interface DualConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveAndConnect: (conn: DbConnection) => void
}

function DualConnectionModal({ isOpen, onClose, onSaveAndConnect }: DualConnectionModalProps) {
  const uid = useId()

  const [mysqlForm, setMysqlForm] = useState({
    name: "Local test DB",
    host: "localhost",
    port: 3306,
    dbName: "simple",
    username: "root",
    password: "",
  })

  const [dhis2Form, setDhis2Form] = useState({
    name: "National Prevention Database",
    serverUrl: "https://npd.nchads.gov.kh",
    username: "admin",
    password: "",
  })

  const [showMysqlPass, setShowMysqlPass] = useState(false)
  const [showDhis2Pass, setShowDhis2Pass] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [mysqlResult, setMysqlResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [dhis2Result, setDhis2Result] = useState<{ ok: boolean; error?: string } | null>(null)
  const [generalError, setGeneralError] = useState<string>("")

  if (!isOpen) return null

  const handleDualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setGeneralError("")
    setMysqlResult(null)
    setDhis2Result(null)

    const res = await testDualConnection({
      mysql: {
        host: mysqlForm.host,
        port: Number(mysqlForm.port),
        dbName: mysqlForm.dbName,
        username: mysqlForm.username,
        password: mysqlForm.password,
      },
      dhis2: {
        serverUrl: dhis2Form.serverUrl,
        username: dhis2Form.username,
        password: dhis2Form.password,
      },
    })

    setMysqlResult({ ok: res.mysqlOk, error: res.mysqlError })
    setDhis2Result({ ok: res.dhis2Ok, error: res.dhis2Error })

    // Strict validation: BOTH must succeed to login
    if (!res.ok) {
      setStatus("error")
      if (!res.mysqlOk && !res.dhis2Ok) {
        setGeneralError("មិនអាចចូលប្រព័ន្ធបានទេ៖ ទាំង MySQL និង DHIS2 NPD សុទ្ធតែភ្ជាប់មិនបានជោគជ័យ។ (Both MySQL and DHIS2 connections failed).")
      } else if (!res.mysqlOk) {
        setGeneralError("មិនអាចចូលប្រព័ន្ធបានទេ៖ MySQL (ART & VCCT) ភ្ជាប់មិនបានជោគជ័យ។ តម្រូវឱ្យភ្ជាប់បានជោគជ័យទាំងពីរ។ (MySQL connection failed. Both are required).")
      } else if (!res.dhis2Ok) {
        setGeneralError("មិនអាចចូលប្រព័ន្ធបានទេ៖ DHIS2 (NPD) ភ្ជាប់មិនបានជោគជ័យ។ តម្រូវឱ្យភ្ជាប់បានជោគជ័យទាំងពីរ។ (DHIS2 NPD connection failed. Both are required).")
      }
      return
    }

    // Both succeeded!
    setStatus("success")
    const conn: DbConnection = {
      id: "cbs-dual-connected",
      name: "CBS Unified (MySQL + NPD)",
      kind: "DUAL",
      program: "CBS_DUAL",
      programs: ["ART", "VCCT", "NPD"],
      host: mysqlForm.host,
      port: Number(mysqlForm.port),
      dbName: mysqlForm.dbName,
      username: mysqlForm.username,
      mysqlUsername: mysqlForm.username,
      serverUrl: dhis2Form.serverUrl.replace(/\/$/, ""),
      dhis2Username: dhis2Form.username,
      dhis2User: res.dhis2User,
      createdAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      color: "#059669",
      activeView: "NPD",
      mysqlStatus: "connected",
      dhis2Status: "connected",
    }

    saveConnection(conn)
    setActiveConnection(conn)

    setTimeout(() => {
      onSaveAndConnect(conn)
      onClose()
    }, 600)
  }

  const inputCls = cn(
    "h-8.5 w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 text-[12px] text-slate-800 outline-none transition-all",
    "placeholder:text-slate-400",
    "focus:border-emerald-500/60 focus:bg-white focus:ring-2 focus:ring-emerald-500/10",
    "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
    "dark:focus:border-emerald-500/60 dark:focus:bg-zinc-800"
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative z-10 w-full max-w-2xl my-auto overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-1">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-700 z-10">
                <Image src="/logo-art.jpg" alt="ART" fill className="object-contain p-0.5" />
              </div>
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-700 z-20">
                <Image src="/logo-vcct.jpg" alt="VCCT" fill className="object-contain p-0.5" />
              </div>
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-violet-200 bg-white shadow-xs dark:border-violet-700 z-30">
                <Image src="/logo-nchads.png" alt="NPD" fill className="object-contain p-0.5" />
              </div>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-zinc-50 leading-tight">
                ភ្ជាប់ប្រព័ន្ធទាំងពីរ (Connect Both MySQL + NPD)
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                តម្រូវឱ្យភ្ជាប់ជោគជ័យទាំងពីរ (Strict Dual-Login: Both systems must connect to log in)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* General Error Banner */}
        {status === "error" && generalError && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 animate-in fade-in">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">{generalError}</span>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                សូមពិនិត្យមើលផ្ទាំងពណ៌ក្រហមខាងក្រោម ដើម្បីកែសម្រួលព័ត៌មានសម្ងាត់ ឬ Server ដែលភ្ជាប់មិនបាន។
              </p>
            </div>
          </div>
        )}

        {/* Dual Form */}
        <form onSubmit={handleDualSubmit} className="flex flex-col gap-4 pt-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* ─── SYSTEM 1: MySQL (ART & VCCT) ─── */}
            <div
              className={cn(
                "flex flex-col gap-2.5 rounded-2xl border p-3.5 transition-all",
                mysqlResult?.ok === false
                  ? "border-rose-300 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
                  : mysqlResult?.ok === true
                    ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-slate-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-zinc-200">
                    1. MySQL (ART & VCCT)
                  </span>
                </div>
                {mysqlResult ? (
                  mysqlResult.ok ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ជោគជ័យ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5" /> បរាជ័យ
                    </span>
                  )
                ) : (
                  <span className="text-[10.5px] font-medium text-slate-400">ចាំការតភ្ជាប់</span>
                )}
              </div>

              {mysqlResult?.ok === false && (
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400 bg-rose-100/70 p-2 rounded-xl dark:bg-rose-950/50">
                  {mysqlResult.error}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    MySQL Host
                  </label>
                  <input
                    className={inputCls}
                    value={mysqlForm.host}
                    onChange={(e) => setMysqlForm((f) => ({ ...f, host: e.target.value }))}
                    placeholder="mpi.nchads.gov.kh"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    Port
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    value={mysqlForm.port}
                    onChange={(e) => setMysqlForm((f) => ({ ...f, port: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                  Database
                </label>
                <input
                  className={inputCls}
                  value={mysqlForm.dbName}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, dbName: e.target.value }))}
                  placeholder="main_dbs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    Username
                  </label>
                  <input
                    className={inputCls}
                    value={mysqlForm.username}
                    onChange={(e) => setMysqlForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="root_dmu"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className={cn(inputCls, "pr-7 font-mono")}
                      value={mysqlForm.password}
                      onChange={(e) => setMysqlForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      type={showMysqlPass ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMysqlPass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showMysqlPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SYSTEM 2: DHIS2 (NPD Surveillance Tracker) ─── */}
            <div
              className={cn(
                "flex flex-col gap-2.5 rounded-2xl border p-3.5 transition-all",
                dhis2Result?.ok === false
                  ? "border-rose-300 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
                  : dhis2Result?.ok === true
                    ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-slate-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-zinc-200">
                    2. DHIS2 NPD (Surveillance)
                  </span>
                </div>
                {dhis2Result ? (
                  dhis2Result.ok ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ជោគជ័យ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5" /> បរាជ័យ
                    </span>
                  )
                ) : (
                  <span className="text-[10.5px] font-medium text-slate-400">ចាំការតភ្ជាប់</span>
                )}
              </div>

              {dhis2Result?.ok === false && (
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400 bg-rose-100/70 p-2 rounded-xl dark:bg-rose-950/50">
                  {dhis2Result.error}
                </p>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                  DHIS2 Server URL
                </label>
                <input
                  className={inputCls}
                  value={dhis2Form.serverUrl}
                  onChange={(e) => setDhis2Form((f) => ({ ...f, serverUrl: e.target.value }))}
                  placeholder="https://npd.nchads.gov.kh"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    DHIS2 Username
                  </label>
                  <input
                    className={inputCls}
                    value={dhis2Form.username}
                    onChange={(e) => setDhis2Form((f) => ({ ...f, username: e.target.value }))}
                    placeholder="admin"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400">
                    DHIS2 Password
                  </label>
                  <div className="relative">
                    <input
                      className={cn(inputCls, "pr-7 font-mono")}
                      value={dhis2Form.password}
                      onChange={(e) => setDhis2Form((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      type={showDhis2Pass ? "text" : "password"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowDhis2Pass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showDhis2Pass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:inline">
              * ការចូលប្រព័ន្ធទាមទារការផ្ទៀងផ្ទាត់ជោគជ័យទាំងសងខាង
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[12.5px] font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-70 transition-all cursor-pointer"
              >
                {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {status === "success" && <Check className="h-3.5 w-3.5" />}
                {status === "loading"
                  ? "កំពុងផ្ទៀងផ្ទាត់ប្រព័ន្ធទាំងពីរ..."
                  : status === "success"
                    ? "ភ្ជាប់ជោគជ័យទាំងពីរ!"
                    : "Connect Both & Login"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Single Connection Modal (Legacy support for single DB) ───────────────────

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  kind: ConnectionKind
  onSaveAndConnect: (conn: DbConnection) => void
}

function SingleConnectionModal({
  isOpen,
  onClose,
  kind,
  onSaveAndConnect,
}: ConnectionModalProps) {
  const uid = useId()
  const isMySQL = kind === "MYSQL"

  const [mysqlForm, setMysqlForm] = useState({
    name: "មូលដ្ឋានទិន្នន័យ ART & VCCT (NCHADS MPI)",
    host: "mpi.nchads.gov.kh",
    port: 3306,
    dbName: "main_dbs",
    username: "root_dmu",
    password: "",
  })

  const [dhis2Form, setDhis2Form] = useState({
    name: "National Prevention Database",
    serverUrl: "https://npd.nchads.gov.kh",
    username: "admin",
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

  const inputCls = cn(
    "h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none transition-all",
    "placeholder:text-slate-400",
    "focus:border-[var(--app-primary)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--app-primary)]/10",
    "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-50">
              {isMySQL ? "Configure MySQL (ART & VCCT)" : "Configure DHIS2 Instance (NPD)"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isMySQL ? (
          <form onSubmit={handleMysqlSubmit} className="flex flex-col gap-3.5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Host</label>
                <input
                  className={inputCls}
                  value={mysqlForm.host}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, host: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Port</label>
                <input
                  type="number"
                  className={inputCls}
                  value={mysqlForm.port}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, port: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Database</label>
              <input
                className={inputCls}
                value={mysqlForm.dbName}
                onChange={(e) => setMysqlForm((f) => ({ ...f, dbName: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Username</label>
                <input
                  className={inputCls}
                  value={mysqlForm.username}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={mysqlForm.password}
                  onChange={(e) => setMysqlForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-[11px] font-medium text-red-600">{errorMsg}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[12px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex h-9 flex-1 items-center justify-center rounded-xl bg-blue-600 text-[12px] font-semibold text-white"
              >
                {status === "loading" ? "Connecting..." : "Connect MySQL"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDhis2Submit} className="flex flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Server URL</label>
              <input
                className={inputCls}
                value={dhis2Form.serverUrl}
                onChange={(e) => setDhis2Form((f) => ({ ...f, serverUrl: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Username</label>
                <input
                  className={inputCls}
                  value={dhis2Form.username}
                  onChange={(e) => setDhis2Form((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={dhis2Form.password}
                  onChange={(e) => setDhis2Form((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-[11px] font-medium text-red-600">{errorMsg}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[12px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex h-9 flex-1 items-center justify-center rounded-xl bg-violet-600 text-[12px] font-semibold text-white"
              >
                {status === "loading" ? "Connecting..." : "Connect DHIS2"}
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
  const [isDualModalOpen, setIsDualModalOpen] = useState(false)
  const [singleModalKind, setSingleModalKind] = useState<ConnectionKind | null>(null)

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-canvas)] px-4 py-8 dark:bg-black font-sans">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200/80 dark:border-zinc-800">
            <Image
              src="/logo-nchads.png"
              alt="NCHADS Logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <h1 className="text-[21px] font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Case Base Surveillance (CBS)
          </h1>
          <p className="text-[12.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
            National Center for HIV/AIDS, Dermatology and STD (NCHADS) · Ministry of Health
          </p>
        </div>

        {/* ─── HERO CARD: Unified Dual Connection (MySQL + NPD) ─── */}
        <div className="relative mb-5 overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-6 shadow-md transition-all hover:border-emerald-500 hover:shadow-lg dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 dark:border-emerald-600/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center -space-x-2">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm dark:border-zinc-800 z-10">
                  <Image src="/logo-art.jpg" alt="ART" fill className="object-contain p-0.5" priority />
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm dark:border-zinc-800 z-20">
                  <Image src="/logo-vcct.jpg" alt="VCCT" fill className="object-contain p-0.5" priority />
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm dark:border-zinc-800 z-30">
                  <Image src="/logo-nchads.png" alt="NPD" fill className="object-contain p-0.5" priority />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-zinc-50">
                    ភ្ជាប់ប្រព័ន្ធទាំងពីរ (MySQL + NPD Tracker)
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
                    Recommended
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                  ភ្ជាប់ MySQL (ART & VCCT) និង DHIS2 NPD ដំណាលគ្នា ដើម្បីគ្រប់គ្រងទិន្នន័យ និងតភ្ជាប់អត្តសញ្ញាណ (ID Linkage)។
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDualModalOpen(true)}
              className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-[13px] font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98 shrink-0 cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
              Connect Both Systems
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Strict Dual-Auth: ត្រូវតែភ្ជាប់ជោគជ័យទាំងពីរទើបអាច Login បាន
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            ឬ ភ្ជាប់តែមួយប្រព័ន្ធ (Single System Mode)
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />
        </div>

        {/* Individual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: ART & VCCT */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center -space-x-1.5">
                  <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200 bg-white z-10">
                    <Image src="/logo-art.jpg" alt="ART" fill className="object-contain p-0.5" />
                  </div>
                  <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200 bg-white z-20">
                    <Image src="/logo-vcct.jpg" alt="VCCT" fill className="object-contain p-0.5" />
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  MySQL Only
                </span>
              </div>
              <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-zinc-200">
                ART & VCCT Database
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                ចូលប្រើតែមូលដ្ឋានទិន្នន័យគ្លីនិក MySQL (main_dbs)
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => setSingleModalKind("MYSQL")}
                className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Connect MySQL
              </button>
            </div>
          </div>

          {/* Card 2: NPD */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200 bg-white p-0.5">
                  <Image src="/logo-nchads.png" alt="NPD" fill className="object-contain p-0.5" />
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  DHIS2 Only
                </span>
              </div>
              <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-zinc-200">
                National Prevention (NPD)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                ចូលប្រើតែប្រព័ន្ធ DHIS2 Case-Based Surveillance Tracker
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => setSingleModalKind("DHIS2")}
                className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Connect DHIS2
              </button>
            </div>
          </div>
        </div>

        {/* Saved Connections */}
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
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-zinc-200">
                        {c.name}
                      </p>
                      {c.kind === "DUAL" && (
                        <span className="rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          DUAL
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {c.kind === "DUAL"
                        ? "MySQL (main_dbs) + DHIS2 (NPD)"
                        : c.kind === "DHIS2"
                          ? c.serverUrl
                          : `${c.host || "localhost"}:${c.port || 3306}`}
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

      {/* Dual Connection Modal */}
      <DualConnectionModal
        isOpen={isDualModalOpen}
        onClose={() => setIsDualModalOpen(false)}
        onSaveAndConnect={onConnected}
      />

      {/* Single Connection Modal */}
      {singleModalKind && (
        <SingleConnectionModal
          isOpen={Boolean(singleModalKind)}
          kind={singleModalKind}
          onClose={() => setSingleModalKind(null)}
          onSaveAndConnect={onConnected}
        />
      )}
    </div>
  )
}
