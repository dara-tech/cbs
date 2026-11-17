"use client"

import { useConnection } from "@/lib/ConnectionContext"
import { NpdSurveillanceView } from "@/components/NpdSurveillanceView"
import { MySqlArtVcctView } from "@/components/MySqlArtVcctView"

export default function RecordsPage() {
  const { connection } = useConnection()

  // NPD is a DHIS2 Instance for Case Base Surveillance & Tracking
  if (connection?.kind === "DHIS2" || connection?.program === "NPD") {
    return <NpdSurveillanceView />
  }

  // ART & VCCT (Shared MySQL Database view)
  return <MySqlArtVcctView />
}
