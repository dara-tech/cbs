export const THEME_STORAGE_KEY = "cbs-theme"

export type ThemePreference = "light" | "dark" | "system"

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "system") return stored
  return "system"
}

export function setStoredTheme(preference: ThemePreference) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(THEME_STORAGE_KEY, preference)
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

export function initThemeListener() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const onChange = () => {
    if (getStoredTheme() === "system") applyTheme(resolveTheme("system"))
  }
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }
  return () => {}
}

export function initTheme() {
  applyTheme(resolveTheme(getStoredTheme()))
  initThemeListener()
}
