import { createContext, useContext } from "react"

import type { PresetId } from "@/lib/presets"
import type { TypographyId } from "@/lib/typography-presets"
import type { MorphismId } from "@/lib/morphisms"

export type Mode = "light" | "dark" | "system"

export interface ThemeState {
  mode: Mode
  setMode: (mode: Mode) => void
  /** Mode réellement appliqué (résout "system"). */
  resolvedMode: "light" | "dark"
  preset: PresetId
  setPreset: (preset: PresetId) => void
  resetTheme: () => void
  typography: TypographyId
  setTypography: (typography: TypographyId) => void
  morphism: MorphismId
  setMorphism: (morphism: MorphismId) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme doit être utilisé à l'intérieur de <ThemeProvider>")
  return context
}
