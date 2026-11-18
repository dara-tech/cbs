"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { type DbConnection, getActiveConnection, setActiveConnection as persistActiveConnection } from "@/lib/database"

interface ConnectionContextType {
  connection: DbConnection | null
  setConnection: (conn: DbConnection | null) => void
  isDual: boolean
  activeView: "NPD" | "CLINICAL"
  setActiveView: (view: "NPD" | "CLINICAL") => void
}

const ConnectionContext = createContext<ConnectionContextType>({
  connection: null,
  setConnection: () => { },
  isDual: false,
  activeView: "NPD",
  setActiveView: () => { },
})

export function ConnectionProvider({
  children,
  initialConnection = null,
}: {
  children: React.ReactNode
  initialConnection?: DbConnection | null
}) {
  const [connection, setConnectionState] = useState<DbConnection | null>(initialConnection)
  const [activeView, setActiveViewState] = useState<"NPD" | "CLINICAL">(
    initialConnection?.activeView || "NPD"
  )

  useEffect(() => {
    if (!connection) {
      const active = getActiveConnection()
      if (active) {
        setConnectionState(active)
        if (active.activeView) setActiveViewState(active.activeView)
      }
    }
  }, [connection])

  const setConnection = useCallback((conn: DbConnection | null) => {
    setConnectionState(conn)
    if (conn) {
      persistActiveConnection(conn)
      if (conn.activeView) setActiveViewState(conn.activeView)
    }
  }, [])

  const setActiveView = useCallback(
    (view: "NPD" | "CLINICAL") => {
      setActiveViewState(view)
      if (connection) {
        const updated = { ...connection, activeView: view }
        setConnectionState(updated)
        persistActiveConnection(updated)
      }
    },
    [connection]
  )

  const isDual = connection?.kind === "DUAL" || connection?.program === "CBS_DUAL"

  return (
    <ConnectionContext.Provider
      value={{
        connection,
        setConnection,
        isDual,
        activeView,
        setActiveView,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  return useContext(ConnectionContext)
}
