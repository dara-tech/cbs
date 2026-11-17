"use client"

import { createContext, useContext } from "react"

export type ThemeContextValue = {
  resolved: "light" | "dark"
  preference: "light" | "dark" | "system"
  toggleTheme: () => void
  setPreference: (p: "light" | "dark" | "system") => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  resolved: "light",
  preference: "system",
  toggleTheme: () => {},
  setPreference: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
