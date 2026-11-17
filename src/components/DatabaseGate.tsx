"use client"

import { useEffect, useState } from "react"
import { type DbConnection, getActiveConnection } from "@/lib/database"
import { DatabaseSelector } from "@/components/DatabaseSelector"
import { AppShell } from "@/components/AppShell"

import { ConnectionProvider } from "@/lib/ConnectionContext"

type GateState = "loading" | "needs-connection" | "connected"

export function DatabaseGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading")
  const [connection, setConnection] = useState<DbConnection | null>(null)

  useEffect(() => {
    const active = getActiveConnection()
    if (active) {
      setConnection(active)
      setState("connected")
    } else {
      setState("needs-connection")
    }
  }, [])

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-canvas)] dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--app-primary)] dark:border-zinc-800 dark:border-t-sky-400" />
          <p className="text-[12px] text-slate-500 dark:text-zinc-400">Loading…</p>
        </div>
      </div>
    )
  }

  if (state === "needs-connection") {
    return (
      <DatabaseSelector
        onConnected={(conn) => {
          setConnection(conn)
          setState("connected")
        }}
      />
    )
  }

  return (
    <ConnectionProvider initialConnection={connection}>
      <AppShell connection={connection}>{children}</AppShell>
    </ConnectionProvider>
  )
}
