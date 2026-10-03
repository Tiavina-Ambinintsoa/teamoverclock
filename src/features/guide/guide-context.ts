import { createContext, useContext } from "react"

import type { GuideTour } from "@/features/guide/guide-tours"

export interface GuideState {
  /** Parcours disponibles pour le profil courant (base de données + parcours intégrés). */
  tours: GuideTour[]
  activeCode: string | null
  start: (code: string) => void
  close: (markCompleted?: boolean) => void
  isCompleted: (code: string) => boolean
}

export const GuideContext = createContext<GuideState | null>(null)

export function useGuide(): GuideState {
  const context = useContext(GuideContext)
  if (!context) throw new Error("useGuide doit être utilisé à l'intérieur de <GuideProvider>")
  return context
}
