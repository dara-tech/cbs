"use client"

import { useConnection } from "@/lib/ConnectionContext"
import { NpdSurveillanceView } from "@/components/NpdSurveillanceView"
import { MySqlArtVcctView } from "@/components/MySqlArtVcctView"

export default function RecordsPage() {
  const { connection, isDual, activeView } = useConnection()

  // Dual Connection: Toggle between NPD Surveillance & MySQL ART/VCCT
  if (isDual) {
    return activeView === "CLINICAL" ? <MySqlArtVcctView /> : <NpdSurveillanceView />
  }

  // Single NPD (DHIS2 Instance)
  if (connection?.kind === "DHIS2" || connection?.program === "NPD") {
    return <NpdSurveillanceView />
  }

  // Single ART & VCCT (Shared MySQL Database view)
  return <MySqlArtVcctView />
}
