import { readStoredPrefs } from "@/lib/a11y-prefs"

/**
 * Enveloppes autour de la Web Speech API (reconnaissance et synthèse vocales du navigateur).
 * Le chat vocal Google AI Studio analyse un enregistrement uniquement après l'action explicite de l'utilisateur.
 */

interface RecognitionAlternative { transcript: string }
interface RecognitionResult { isFinal: boolean; 0: RecognitionAlternative }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent { error: string }

export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => SpeechRecognitionLike

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

export function getRecognitionConstructor(scope: SpeechWindow = window as unknown as SpeechWindow): RecognitionConstructor | null {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function isRecognitionSupported(scope?: SpeechWindow): boolean {
  return getRecognitionConstructor(scope) !== null
}

export function isSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"
}

export function selectSpeechVoice<T extends Pick<SpeechSynthesisVoice, "lang" | "default">>(
  voices: readonly T[],
  language: string,
): T | null {
  const normalizedLanguage = language.replace("_", "-").toLowerCase()
  const languageCode = normalizedLanguage.split("-")[0]
  const matchingVoices = voices.filter((voice) => voice.lang.replace("_", "-").toLowerCase() === normalizedLanguage)
  if (matchingVoices.length > 0) return matchingVoices.find((voice) => voice.default) ?? matchingVoices[0]

  const languageVoices = voices.filter((voice) => voice.lang.replace("_", "-").toLowerCase().split("-")[0] === languageCode)
  return languageVoices.find((voice) => voice.default) ?? languageVoices[0] ?? null
}

export function filterSpeechVoices<T extends Pick<SpeechSynthesisVoice, "name" | "lang">>(
  voices: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return [...voices]
  return voices.filter((voice) =>
    `${voice.name} ${voice.lang}`.toLocaleLowerCase().includes(normalizedQuery),
  )
}

/** Concatène les résultats finaux et provisoires d'un événement de reconnaissance. */
export function collectTranscript(event: RecognitionEvent): { final: string; interim: string } {
  let final = ""
  let interim = ""
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i]
    if (result.isFinal) final += result[0].transcript
    else interim += result[0].transcript
  }
  return { final: final.trim(), interim: interim.trim() }
}

/** Messages d'erreur de reconnaissance compréhensibles. */
export function describeRecognitionError(code: string, locale: "fr" | "en" = "fr"): string {
  const fr: Record<string, string> = {
    "not-allowed": "Le microphone est refusé. Autorisez-le dans le navigateur ou saisissez le texte au clavier.",
    "service-not-allowed": "La reconnaissance vocale n'est pas autorisée sur cet appareil.",
    "no-speech": "Aucune parole détectée. Réessayez.",
    "audio-capture": "Aucun microphone détecté.",
    network: "Le service vocal du navigateur est indisponible. Connectez-vous et configurez le chat vocal Google AI Studio, ou saisissez le texte au clavier.",
  }
  const en: Record<string, string> = {
    "not-allowed": "Microphone access was denied. Allow it in your browser or type the text.",
    "service-not-allowed": "Speech recognition is not allowed on this device.",
    "no-speech": "No speech detected. Try again.",
    "audio-capture": "No microphone detected.",
    network: "The browser speech service is unavailable. Sign in and configure Google AI Studio voice chat, or type your message.",
  }
  const table = locale === "en" ? en : fr
  return table[code] ?? (locale === "en" ? "Speech recognition error." : "Erreur de reconnaissance vocale.")
}

/** Lit un texte à voix haute ; retourne false si la synthèse n'est pas disponible. */
export function speak(text: string, options: {
  lang?: string
  rate?: number
  voiceURI?: string
  onStart?: () => void
  onEnd?: () => void
} = {}): boolean {
  if (!isSynthesisSupported() || !text.trim()) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? "fr-FR"
  utterance.rate = options.rate ?? 1
  const voices = window.speechSynthesis.getVoices()
  const voiceURI = options.voiceURI ?? readStoredPrefs().speechVoiceURI
  const voice = voices.find((candidate) => candidate.voiceURI === voiceURI) ?? selectSpeechVoice(voices, utterance.lang)
  if (voice) {
    utterance.voice = voice
    if (voiceURI && voice.voiceURI === voiceURI) utterance.lang = voice.lang
  }
  if (options.onStart) utterance.onstart = options.onStart
  if (options.onEnd) utterance.onend = options.onEnd
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking(): void {
  if (isSynthesisSupported()) window.speechSynthesis.cancel()
}
