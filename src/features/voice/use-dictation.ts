import { useCallback, useEffect, useRef, useState } from "react"

import {
  collectTranscript,
  describeRecognitionError,
  getRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/features/voice/speech"
import { useLocale } from "@/lib/locale"

function canUseMediaRecording(): boolean {
  return typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined"
}

export interface DictationVoiceResponse {
  transcript: string
  answer: string
}

export interface DictationState {
  supported: boolean
  voiceChatSupported: boolean
  listening: boolean
  processing: boolean
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
export function useDictation(
  onFinalText: (text: string) => void,
  lang?: string,
  sendVoiceMessage?: (audio: Blob, language: string) => Promise<DictationVoiceResponse>,
  onVoiceResponse?: (response: DictationVoiceResponse) => void | Promise<void>
): DictationState {
  const { locale } = useLocale()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sendVoiceMessageRef = useRef(sendVoiceMessage)
  const voiceResponseRef = useRef(onVoiceResponse)
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)
  const callbackRef = useRef(onFinalText)
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  const voiceChatSupported = Boolean(sendVoiceMessage && canUseMediaRecording())
  const supported = voiceChatSupported || (typeof window !== "undefined" && getRecognitionConstructor() !== null)

  useEffect(() => {
    callbackRef.current = onFinalText
  }, [onFinalText])

  useEffect(() => {
    sendVoiceMessageRef.current = sendVoiceMessage
  }, [sendVoiceMessage])

  useEffect(() => {
    voiceResponseRef.current = onVoiceResponse
  }, [onVoiceResponse])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
      return
    }
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(async () => {
    if (sendVoiceMessageRef.current && canUseMediaRecording()) {
      cancelledRef.current = false
      setError(null)
      setInterim("")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelledRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        chunksRef.current = []
        const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus"]
          .find((candidate) => MediaRecorder.isTypeSupported(candidate))
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        recorderRef.current = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onerror = () => {
          setError(locale === "en" ? "Recording failed. Check microphone access and try again." : "L'enregistrement a échoué. Vérifiez l'accès au microphone et réessayez.")
          setListening(false)
          releaseStream()
        }
        recorder.onstop = async () => {
          if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
          recordingTimerRef.current = null
          releaseStream()
          setListening(false)
          if (cancelledRef.current) return
          setProcessing(true)
          try {
            const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
            const response = await sendVoiceMessageRef.current?.(audio, lang ?? (locale === "en" ? "en-GB" : "fr-FR"))
            if (!response?.transcript.trim() || !response.answer.trim()) {
              throw new Error(locale === "en" ? "No reply was returned. Try again." : "Aucune réponse n'a été renvoyée. Réessayez.")
            }
            if (voiceResponseRef.current) await voiceResponseRef.current(response)
            else callbackRef.current(response.transcript.trim())
          } catch (transcriptionError) {
            setError(transcriptionError instanceof Error
              ? transcriptionError.message
              : (locale === "en" ? "Could not transcribe the recording." : "Impossible de transcrire l'enregistrement."))
          } finally {
            setProcessing(false)
            setInterim("")
          }
        }
        recorder.start(500)
        setListening(true)
        recordingTimerRef.current = setTimeout(() => {
          if (recorder.state === "recording") recorder.stop()
        }, 30_000)
        return
      } catch (recordingError) {
        releaseStream()
        setListening(false)
        setError(recordingError instanceof Error && recordingError.name === "NotAllowedError"
          ? describeRecognitionError("not-allowed", locale)
          : (locale === "en" ? "Could not access the microphone. Check browser permissions and try again." : "Impossible d'accéder au microphone. Vérifiez les autorisations du navigateur et réessayez."))
        return
      }
    }

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
  }, [lang, locale, releaseStream])

  useEffect(() => () => {
    cancelledRef.current = true
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    releaseStream()
    recognitionRef.current?.abort()
  }, [releaseStream])

  return { supported, voiceChatSupported, listening, processing, interim, error, start, stop }
}
