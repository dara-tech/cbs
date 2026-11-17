"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import {
  getStoredTheme,
  resolveTheme,
  applyTheme,
  setStoredTheme,
  type ThemePreference,
} from "@/lib/theme"

type ThemeContextValue = {
  resolved: "light" | "dark"
  preference: ThemePreference
  toggleTheme: () => void
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  resolved: "light",
  preference: "system",
  toggleTheme: () => {},
  setPreference: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    const stored = getStoredTheme()
    setPreferenceState(stored)
    const r = resolveTheme(stored)
    setResolved(r)
    applyTheme(r)
  }, [])

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p)
    setStoredTheme(p)
    const r = resolveTheme(p)
    setResolved(r)
    applyTheme(r)
  }

  const toggleTheme = () => {
    setPreference(resolved === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ resolved, preference, toggleTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}
