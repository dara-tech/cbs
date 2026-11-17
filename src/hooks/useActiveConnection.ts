"use client"

import { useEffect, useState } from "react"
import { type DbConnection, getActiveConnection } from "@/lib/database"

export function useActiveConnection() {
  const [connection, setConnection] = useState<DbConnection | null>(null)

  useEffect(() => {
    setConnection(getActiveConnection())
  }, [])

  return connection
}
