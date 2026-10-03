import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { ThemeContext, type Mode, type ThemeState } from "@/components/theme-context"
import { isPresetId, type PresetId } from "@/lib/presets"
import { isTypographyId, type TypographyId } from "@/lib/typography-presets"
import { isMorphismId, type MorphismId } from "@/lib/morphisms"
import { SITE } from "@/lib/site"
import { safeStorage } from "@/lib/storage"

const MODE_KEY = "webcup:mode"
const PRESET_KEY = "webcup:preset:v2"
const TYPOGRAPHY_KEY = "webcup:typography"
const MORPHISM_KEY = "webcup:morphism"

function readMode(): Mode {
  const stored = safeStorage.get(MODE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : SITE.defaultMode
}

function readPreset(): PresetId {
  const stored = safeStorage.get(PRESET_KEY)
  return isPresetId(stored) ? stored : SITE.defaultPreset
}

function readTypography(): TypographyId {
  const stored = safeStorage.get(TYPOGRAPHY_KEY)
  return isTypographyId(stored) ? stored : "theme"
}

function readMorphism(): MorphismId {
  const stored = safeStorage.get(MORPHISM_KEY)
  return isMorphismId(stored) ? stored : "standard"
}

const DARK_QUERY = "(prefers-color-scheme: dark)"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(readMode)
  const [preset, setPresetState] = useState<PresetId>(readPreset)
  const [typography, setTypographyState] = useState<TypographyId>(readTypography)
  const [morphism, setMorphismState] = useState<MorphismId>(readMorphism)
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
    // Un thème d'accessibilité contrasté impose clair/sombre (voir AccessibilityProvider).
    const contrast = root.dataset.contrast
    const forcedDark = contrast === "high_contrast_light" ? false : contrast || preset === "nova-terra" ? true : null
    root.classList.toggle("dark", forcedDark ?? resolvedMode === "dark")
    root.dataset.theme = preset
    root.dataset.typography = typography
    root.dataset.morphism = morphism
  }, [resolvedMode, preset, typography, morphism])

  const setMode = useCallback((next: Mode) => {
    setModeState(next)
    safeStorage.set(MODE_KEY, next)
  }, [])

  const setPreset = useCallback((next: PresetId) => {
    setPresetState(next)
    safeStorage.set(PRESET_KEY, next)
  }, [])

  const setTypography = useCallback((next: TypographyId) => {
    setTypographyState(next)
    safeStorage.set(TYPOGRAPHY_KEY, next)
  }, [])

  const setMorphism = useCallback((next: MorphismId) => {
    setMorphismState(next)
    safeStorage.set(MORPHISM_KEY, next)
  }, [])

  const value = useMemo<ThemeState>(
    () => ({ mode, setMode, resolvedMode, preset, setPreset, typography, setTypography, morphism, setMorphism }),
    [mode, setMode, resolvedMode, preset, setPreset, typography, setTypography, morphism, setMorphism]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
