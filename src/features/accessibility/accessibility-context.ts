import { createContext, useContext } from "react"

import type { A11yPrefs } from "@/lib/a11y-prefs"

export interface AccessibilityState {
  prefs: A11yPrefs
  /** Fusionne un changement partiel ; les valeurs sont validées et bornées. */
  update: (patch: Partial<A11yPrefs>) => void
  reset: () => void
}

export const AccessibilityContext = createContext<AccessibilityState | null>(null)

export function useAccessibility(): AccessibilityState {
  const context = useContext(AccessibilityContext)
  if (!context) throw new Error("useAccessibility doit être utilisé à l'intérieur de <AccessibilityProvider>")
  return context
}
