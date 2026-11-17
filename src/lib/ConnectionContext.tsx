"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { type DbConnection, getActiveConnection } from "@/lib/database"

interface ConnectionContextType {
  connection: DbConnection | null
  setConnection: (conn: DbConnection | null) => void
}

const ConnectionContext = createContext<ConnectionContextType>({
  connection: null,
  setConnection: () => {},
})

export function ConnectionProvider({
  children,
  initialConnection = null,
}: {
  children: React.ReactNode
  initialConnection?: DbConnection | null
}) {
  const [connection, setConnection] = useState<DbConnection | null>(initialConnection)

  useEffect(() => {
    if (!connection) {
      const active = getActiveConnection()
      if (active) setConnection(active)
    }
  }, [connection])

  return (
    <ConnectionContext.Provider value={{ connection, setConnection }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  return useContext(ConnectionContext)
}
