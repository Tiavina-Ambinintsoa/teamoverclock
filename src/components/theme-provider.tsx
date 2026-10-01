import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { ThemeContext, type Mode, type ThemeState } from "@/components/theme-context"
import { isPresetId, type PresetId } from "@/lib/presets"
import { SITE } from "@/lib/site"
import { safeStorage } from "@/lib/storage"

const MODE_KEY = "webcup:mode"
const PRESET_KEY = "webcup:preset"

function readMode(): Mode {
  const stored = safeStorage.get(MODE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : SITE.defaultMode
}

function readPreset(): PresetId {
  const stored = safeStorage.get(PRESET_KEY)
  return isPresetId(stored) ? stored : SITE.defaultPreset
}

const DARK_QUERY = "(prefers-color-scheme: dark)"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readMode)
  const [preset, setPresetState] = useState<PresetId>(readPreset)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const resolvedMode: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode

  // Le script inline de index.html applique déjà le thème avant le rendu (pas de flash).
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedMode === "dark")
    root.dataset.theme = preset
  }, [resolvedMode, preset])

  const setMode = useCallback((next: Mode) => {
    setModeState(next)
    safeStorage.set(MODE_KEY, next)
  }, [])

  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next)
    safeStorage.set(PRESET_KEY, next)
  }, [])

  const value = useMemo<ThemeState>(
    () => ({ mode, setMode, resolvedMode, preset, setPreset }),
    [mode, setMode, resolvedMode, preset, setPreset]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
