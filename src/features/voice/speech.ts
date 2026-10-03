/**
 * Enveloppes minces autour de la Web Speech API (reconnaissance et synthèse vocales du navigateur).
 * Aucun audio n'est envoyé ni stocké par l'application : seule la transcription texte est conservée si l'utilisateur la valide.
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
    network: "Réseau indisponible pour la reconnaissance vocale.",
  }
  const en: Record<string, string> = {
    "not-allowed": "Microphone access was denied. Allow it in your browser or type the text.",
    "service-not-allowed": "Speech recognition is not allowed on this device.",
    "no-speech": "No speech detected. Try again.",
    "audio-capture": "No microphone detected.",
    network: "Network unavailable for speech recognition.",
  }
  const table = locale === "en" ? en : fr
  return table[code] ?? (locale === "en" ? "Speech recognition error." : "Erreur de reconnaissance vocale.")
}

/** Lit un texte à voix haute ; retourne false si la synthèse n'est pas disponible. */
export function speak(text: string, options: { lang?: string; rate?: number; onEnd?: () => void } = {}): boolean {
  if (!isSynthesisSupported() || !text.trim()) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? "fr-FR"
  utterance.rate = options.rate ?? 1
  if (options.onEnd) utterance.onend = options.onEnd
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking(): void {
  if (isSynthesisSupported()) window.speechSynthesis.cancel()
}
