import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Mic, MicOff } from "lucide-react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAccessibility } from "@/features/accessibility/accessibility-context"
import { useAuth } from "@/features/auth/auth-context"
import { isConfirmation, isRejection } from "@/features/chatbot/chatbot-engine"
import { useGuide } from "@/features/guide/guide-context"
import { describePage, readableText } from "@/features/voice/page-reader"
import {
  collectTranscript,
  describeRecognitionError,
  getRecognitionConstructor,
  speak,
  stopSpeaking,
  type SpeechRecognitionLike,
} from "@/features/voice/speech"
import { VoiceContext, type VoiceState } from "@/features/voice/voice-context"
import {
  DEFAULT_COMMANDS,
  dictateIntoField,
  findActionable,
  matchCommand,
  parseClickTarget,
  parseDictation,
  type VoiceCommand,
} from "@/features/voice/voice-commands"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

const CAPTION_MS = 12_000

function useVoiceCommands() {
  return useQuery({
    queryKey: ["voice-commands"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<VoiceCommand[]> => {
      if (!supabase) return DEFAULT_COMMANDS
      const { data } = await supabase.from("voice_commands").select("code,locale,phrases,action,target,description,requires_confirmation,min_role")
      return data && data.length > 0 ? (data as VoiceCommand[]) : DEFAULT_COMMANDS
    },
  })
}

/**
 * Assistance vocale : lecture de l'écran, navigation et réponses à la voix, guide vocal, sous-titres.
 * Le micro n'est actif que sur action de l'utilisateur ; aucune donnée audio n'est conservée.
 * Les actions qui créent ou envoient quelque chose exigent un « oui » prononcé (ou la touche Entrée sur le bouton d'action).
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const { prefs } = useAccessibility()
  const { locale, tx } = useLocale()
  const { user } = useAuth()
  const guide = useGuide()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const commands = useVoiceCommands()
  const lang = locale === "en" ? "en-GB" : "fr-FR"
  const role = user ? user.profileRole : null

  const [caption, setCaption] = useState("")
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListening = useRef(false)
  const startRef = useRef<() => void>(() => undefined)
  const pendingRef = useRef<{ label: string; run: () => void } | null>(null)
  const captionTimer = useRef<number | undefined>(undefined)
  const supported = typeof window !== "undefined" && getRecognitionConstructor() !== null

  const showCaption = useCallback((text: string) => {
    setCaption(text)
    window.clearTimeout(captionTimer.current)
    captionTimer.current = window.setTimeout(() => setCaption(""), CAPTION_MS)
  }, [])

  // Parler : on coupe l'écoute pendant la lecture pour éviter que l'assistant s'entende lui-même.
  const say = useCallback((text: string) => {
    showCaption(text)
    const recognition = recognitionRef.current
    if (recognition && wantListening.current) recognition.abort()
    const resume = () => { if (wantListening.current) startRef.current() }
    if (!speak(text, { lang, rate: prefs.ttsRate, onEnd: resume })) resume()
  }, [lang, prefs.ttsRate, showCaption])

  const readPage = useCallback(() => {
    const text = readableText(document)
    say(text || describePage(document, locale))
  }, [say, locale])

  const help = useCallback(() => {
    const list = (commands.data ?? DEFAULT_COMMANDS)
      .filter((c) => c.locale === "any" || c.locale === locale)
      .slice(0, 6)
      .map((c) => c.phrases[0])
      .join(", ")
    say(`${describePage(document, locale, { title: document.title })} ${tx("Commandes possibles :", "Possible commands:")} ${list}. ${tx("Dites stop pour m'arrêter.", "Say stop to interrupt me.")}`)
  }, [commands.data, locale, say, tx])

  const confirmThen = useCallback((label: string, run: () => void) => {
    pendingRef.current = { label, run }
    say(tx(`Voulez-vous vraiment ${label} ? Dites oui pour confirmer, non pour annuler.`, `Do you really want to ${label}? Say yes to confirm, no to cancel.`))
  }, [say, tx])

  const handleUtterance = useCallback((raw: string) => {
    const text = raw.trim()
    if (!text) return
    showCaption(`« ${text} »`)

    const pending = pendingRef.current
    if (pending) {
      if (isConfirmation(text)) { pendingRef.current = null; pending.run(); return }
      if (isRejection(text)) { pendingRef.current = null; say(tx("D'accord, j'annule.", "Okay, cancelled.")); return }
    }

    const dictated = parseDictation(text)
    if (dictated) {
      const ok = dictateIntoField(dictated, document.activeElement)
      say(ok ? `${tx("J'ai écrit", "I wrote")} : ${dictated}` : tx("Sélectionnez d'abord un champ de texte.", "Select a text field first."))
      return
    }

    const match = matchCommand(text, commands.data ?? DEFAULT_COMMANDS, locale, role)
    if (match) {
      const { command } = match
      const run = () => {
        switch (command.action) {
          case "navigate": if (command.target) { void navigate(command.target); say(command.description) } break
          case "read": readPage(); break
          case "help": help(); break
          case "stop": stopSpeaking(); pendingRef.current = null; setCaption(""); break
          case "open_tour": guide.start(command.target ?? "welcome"); break
          default: say(command.description)
        }
      }
      if (command.requires_confirmation) confirmThen(command.description.toLowerCase().replace(/\.$/, ""), run)
      else run()
      return
    }

    const label = parseClickTarget(text)
    if (label) {
      const found = findActionable(label, document)
      if (found) {
        const run = () => { found.element.click(); say(`${tx("Activé", "Activated")} : ${found.label}`) }
        if (found.element.hasAttribute("data-voice-confirm")) confirmThen(found.label, run)
        else run()
        return
      }
      say(tx(`Je ne trouve pas « ${label} » sur cette page.`, `I cannot find “${label}” on this page.`))
      return
    }

    say(tx("Je n'ai pas compris. Dites « aide » pour connaître les commandes.", "I did not understand. Say “help” to hear the commands."))
  }, [commands.data, confirmThen, guide, help, locale, navigate, readPage, role, say, showCaption, tx])

  const handlerRef = useRef(handleUtterance)
  useEffect(() => { handlerRef.current = handleUtterance }, [handleUtterance])

  const startRecognition = useCallback(() => {
    const Ctor = getRecognitionConstructor()
    if (!Ctor) { setError(describeRecognitionError("service-not-allowed", locale)); return }
    recognitionRef.current?.abort()
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const { final } = collectTranscript(event)
      if (final) handlerRef.current(final)
    }
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return
      setError(describeRecognitionError(event.error, locale))
      wantListening.current = false
      setListening(false)
    }
    recognition.onend = () => {
      // Le navigateur coupe l'écoute après un silence : on relance tant que l'utilisateur la souhaite.
      if (wantListening.current && !window.speechSynthesis?.speaking) {
        try { recognition.start() } catch { setListening(false) }
      }
    }
    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    try { recognition.start() } catch { /* déjà démarrée */ }
  }, [lang, locale])

  useEffect(() => { startRef.current = startRecognition }, [startRecognition])

  const startListening = useCallback(() => { wantListening.current = true; startRecognition() }, [startRecognition])
  const stopListening = useCallback(() => {
    wantListening.current = false
    recognitionRef.current?.abort()
    setListening(false)
  }, [])

  // Lecture automatique à chaque changement de page (lecture de l'écran) ou annonce courte (guide vocal).
  useEffect(() => {
    if (!prefs.readScreenAloud && !prefs.voiceGuide) return
    const timer = window.setTimeout(() => {
      if (prefs.readScreenAloud) say(describePage(document, locale, { title: document.title, withHint: prefs.voiceNavigation }))
      else {
        const title = document.querySelector("main h1")?.textContent?.trim() || document.title
        say(`${tx("Page", "Page")} : ${title}. ${tx("Dites aide pour connaître les commandes.", "Say help to hear the commands.")}`)
      }
    }, 900)
    return () => window.clearTimeout(timer)
    // On ne relit que lors d'un vrai changement de page ou de préférence, pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, prefs.readScreenAloud, prefs.voiceGuide])

  useEffect(() => () => { wantListening.current = false; recognitionRef.current?.abort(); stopSpeaking() }, [])
  useEffect(() => { if (!prefs.voiceNavigation && listening) stopListening() }, [prefs.voiceNavigation, listening, stopListening])

  const value = useMemo<VoiceState>(
    () => ({ supported, listening, caption, say, readPage, help, startListening, stopListening }),
    [supported, listening, caption, say, readPage, help, startListening, stopListening]
  )

  const showBar = prefs.captions || prefs.readScreenAloud || prefs.voiceNavigation

  return (
    <VoiceContext.Provider value={value}>
      {children}
      {/* Région vivante : les sous-titres sont aussi annoncés aux lecteurs d'écran (poli, sans interrompre). */}
      <div aria-live="polite" className="sr-only">{caption}</div>

      {prefs.voiceNavigation && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
          {supported ? (
            <Button type="button" size="lg" variant={listening ? "destructive" : "default"} aria-pressed={listening} onClick={listening ? stopListening : startListening}>
              {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
              {listening ? tx("Écoute active — dites « stop » ou cliquez", "Listening — say “stop” or click") : tx("Parler à l'assistant vocal", "Talk to the voice assistant")}
            </Button>
          ) : (
            <p role="alert" className="rounded-lg border bg-popover p-3 text-sm shadow">{tx("La reconnaissance vocale n'est pas disponible sur ce navigateur : utilisez le clavier.", "Speech recognition is not available in this browser: use the keyboard.")}</p>
          )}
          {error && <p role="alert" className="max-w-xs rounded-lg border border-destructive/50 bg-popover p-3 text-sm shadow">{error}</p>}
        </div>
      )}

      {showBar && caption && (
        <output className="fixed right-4 bottom-4 left-4 z-40 mx-auto block max-w-3xl rounded-xl border bg-popover/95 px-4 py-3 text-center text-base shadow-lg sm:left-24">{caption}</output>
      )}
    </VoiceContext.Provider>
  )
}
