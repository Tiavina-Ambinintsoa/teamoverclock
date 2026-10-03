import { createContext, useContext } from "react"

export interface VoiceState {
  /** La reconnaissance vocale est-elle disponible sur ce navigateur ? */
  supported: boolean
  listening: boolean
  /** Dernière phrase prononcée ou comprise (sous-titres). */
  caption: string
  say: (text: string) => void
  readPage: () => void
  help: () => void
  startListening: () => void
  stopListening: () => void
}

export const VoiceContext = createContext<VoiceState | null>(null)

export function useVoice(): VoiceState {
  const context = useContext(VoiceContext)
  if (!context) throw new Error("useVoice doit être utilisé à l'intérieur de <VoiceProvider>")
  return context
}
