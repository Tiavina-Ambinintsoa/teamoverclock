import { useCallback, useEffect, useRef, useState } from "react"

import {
  collectTranscript,
  describeRecognitionError,
  getRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/features/voice/speech"
import { useLocale } from "@/lib/locale"

export interface DictationState {
  supported: boolean
  listening: boolean
  /** Texte provisoire en cours de reconnaissance (affiché mais pas encore validé). */
  interim: string
  error: string | null
  start: () => void
  stop: () => void
}

/**
 * Dictée vocale : appelle `onFinalText` avec chaque morceau de texte reconnu.
 * Le micro n'est activé que sur action de l'utilisateur (jamais en arrière-plan).
 */
export function useDictation(onFinalText: (text: string) => void, lang?: string): DictationState {
  const { locale } = useLocale()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbackRef = useRef(onFinalText)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  const supported = typeof window !== "undefined" && getRecognitionConstructor() !== null

  useEffect(() => {
    callbackRef.current = onFinalText
  }, [onFinalText])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionConstructor()
    if (!Ctor) {
      setError(describeRecognitionError("service-not-allowed", locale))
      return
    }
    recognitionRef.current?.abort()
    const recognition = new Ctor()
    recognition.lang = lang ?? (locale === "en" ? "en-GB" : "fr-FR")
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      const { final, interim: partial } = collectTranscript(event)
      setInterim(partial)
      if (final) callbackRef.current(final)
    }
    recognition.onerror = (event) => {
      setError(describeRecognitionError(event.error, locale))
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
      setInterim("")
    }
    setError(null)
    setListening(true)
    recognitionRef.current = recognition
    recognition.start()
  }, [lang, locale])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, interim, error, start, stop }
}
