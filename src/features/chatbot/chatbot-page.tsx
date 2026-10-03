import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Bot, Pin, PinOff, Send, Square, Volume2, VolumeX, X } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth/auth-context"
import {
  buildReply,
  isConfirmation,
  isRejection,
  type ChatReply,
  type ChatSource,
  type KbEntry,
  type PendingAction,
  type ServiceFacts,
} from "@/features/chatbot/chatbot-engine"
import type { DangerRow, Sector } from "@/lib/db-types"
import { env } from "@/lib/env"
import { dueDateFor } from "@/features/requests/request-workflow"
import { speak, stopSpeaking } from "@/features/voice/speech"
import { DictationButton } from "@/features/voice/dictation-button"
import { audioBlobToWavBase64 } from "@/features/voice/audio"
import type { DictationVoiceResponse } from "@/features/voice/use-dictation"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: ChatReply["kind"]
  sources?: ChatSource[]
  pending?: PendingAction | null
  channel?: "text" | "voice"
  choices?: { label: string; prompt?: string; href?: string }[]
}

interface ChatKnowledge {
  kb: KbEntry[]
  services: ServiceFacts[]
  dangers: DangerRow[]
  sectors: Sector[]
  buildings: { id: string; name: string; address: string | null; sector_id: string }[]
}

function useKnowledge() {
  return useQuery({
    queryKey: ["chat-knowledge"],
    staleTime: 60_000,
    queryFn: async (): Promise<ChatKnowledge> => {
      if (!supabase) return { kb: [], services: [], dangers: [], sectors: [], buildings: [] }
      const [kb, services, dangers, sectors, buildings] = await Promise.all([
        supabase.from("knowledge_base").select("id,entity_type,title,content,url").eq("is_published", true),
        supabase.from("services").select("id,slug,name,category,description,phone,opening_hours,required_documents,procedures,status,is_emergency"),
        supabase.from("dangers").select("*").in("status", ["active", "archived"]).order("valid_from", { ascending: false }),
        supabase.from("sectors").select("*").order("code"),
        supabase.from("buildings").select("id,name,address,sector_id").order("name"),
      ])
      for (const result of [kb, services, dangers, sectors, buildings]) {
        if (result.error) throw new Error(result.error.message)
      }
      return {
        kb: (kb.data ?? []) as KbEntry[],
        services: (services.data ?? []) as ServiceFacts[],
        dangers: (dangers.data ?? []) as DangerRow[],
        sectors: (sectors.data ?? []) as Sector[],
        buildings: buildings.data ?? [],
      }
    },
  })
}

let counter = 0
const nextId = () => `m-${(counter += 1)}`

function getChatChoices(reply: ChatReply, locale: "fr" | "en"): { label: string; prompt?: string; href?: string }[] {
  if (reply.intent === "greeting") {
    return locale === "fr"
      ? [
          { label: "Dangers dans mon secteur", prompt: "Quels sont les dangers dans mon secteur ?" },
          { label: "Voir les services", href: "/services" },
          { label: "Faire un signalement", prompt: "Je veux signaler un problème" },
        ]
      : [
          { label: "Dangers in my sector", prompt: "What dangers are in my sector?" },
          { label: "Browse services", href: "/services" },
          { label: "File a report", prompt: "I want to report a problem" },
        ]
  }

  if (reply.kind === "unknown") {
    return locale === "fr"
      ? [
          { label: "Voir les services", href: "/services" },
          { label: "Parler à un conseiller", prompt: "Je veux parler à un conseiller" },
        ]
      : [
          { label: "Browse services", href: "/services" },
          { label: "Talk to an agent", prompt: "I want to speak to an agent" },
        ]
  }

  if (reply.kind === "emergency") {
    return [{ label: locale === "fr" ? "Voir toutes les alertes" : "View all alerts", href: "/dangers" }]
  }

  const serviceSource = reply.intent === "info" && reply.sources.find((source) => source.type === "service")
  if (serviceSource) {
    return locale === "fr"
      ? [
          { label: "Démarches", prompt: `Quelles sont les démarches pour ${serviceSource.title} ?` },
          { label: "Documents requis", prompt: `Quels documents pour ${serviceSource.title} ?` },
          { label: "Horaires", prompt: `Quels sont les horaires de ${serviceSource.title} ?` },
        ]
      : [
          { label: "Procedures", prompt: `What are the procedures for ${serviceSource.title}?` },
          { label: "Required documents", prompt: `What documents are needed for ${serviceSource.title}?` },
          { label: "Opening hours", prompt: `What are the opening hours for ${serviceSource.title}?` },
        ]
  }

  return []
}

/** Assistant flottant : répond depuis les contenus publiés, cite ses sources, confirme avant toute création. */
export function ChatbotPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const knowledge = useKnowledge()
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get("assistant") === "open")
  const routeRequestedOpen = new URLSearchParams(location.search).get("assistant") === "open"
  const isOpen = open || routeRequestedOpen
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: nextId(),
      role: "assistant",
      kind: "normal",
      content: tx("Bonjour ! Posez-moi une question sur les services, les démarches, les actualités ou les alertes de Nova Terra. Je peux aussi préparer un signalement ou une demande (avec votre confirmation).", "Hello! Ask me about Nova Terra's services, procedures, news or alerts. I can also prepare a report or a request (with your confirmation)."),
      choices: getChatChoices({ intent: "greeting", kind: "normal", content: "", sources: [], confidence: 1 }, locale),
    },
  ])
  const [draft, setDraft] = useState("")
  const [pinned, setPinned] = useState(false)
  const [keepHistory, setKeepHistory] = useState(false)
  const [readAloud, setReadAloud] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [busy, setBusy] = useState(false)
  const sessionRef = useRef<string | null>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const messageCount = messages.length
  const lang = locale === "en" ? "en-GB" : "fr-FR"
  const speakChat = useCallback((text: string) => {
    const started = speak(text, {
      lang,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    })
    if (!started) setIsSpeaking(false)
  }, [lang])
  const sendVoiceMessage = useCallback(async (audio: Blob, language: string): Promise<DictationVoiceResponse> => {
    if (!env.enableGoogleAIStudioVoice || !supabase || !user || user.isDemo) {
      throw new Error(tx("Le chat vocal Google AI Studio nécessite un compte connecté et sa configuration activée.", "Google AI Studio voice chat requires a signed-in account and its feature enabled."))
    }
    if (!knowledge.data || knowledge.isLoading || knowledge.isError) {
      throw new Error(tx("La base de connaissances n'est pas prête. Réessayez dans un instant.", "The knowledge base is not ready. Try again in a moment."))
    }
    const audioBase64 = await audioBlobToWavBase64(audio)
    const knowledgeContext = JSON.stringify(knowledge.data)
    if (knowledgeContext.length > 60_000) {
      throw new Error(tx("La base de connaissances dépasse la limite autorisée pour le chat vocal.", "The knowledge base exceeds the voice chat context limit."))
    }
    const history = messages.slice(-12).map(({ role, content: historyContent }) => ({ role, content: historyContent }))
    const { data, error } = await supabase.functions.invoke("gemini-voice-chat", {
      body: { audioBase64, language, knowledge: knowledgeContext, history },
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    if (typeof data?.transcript !== "string" || !data.transcript.trim()
      || typeof data?.answer !== "string" || !data.answer.trim()) {
      throw new Error(tx("Google AI Studio n'a pas renvoyé de réponse exploitable.", "Google AI Studio did not return a usable answer."))
    }
    return { transcript: data.transcript.trim(), answer: data.answer.trim() }
  }, [knowledge.data, knowledge.isError, knowledge.isLoading, messages, tx, user])

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    if (messageCount > 0) conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" })
  }, [messageCount])

  const close = () => {
    setOpen(false)
    if (routeRequestedOpen) void navigate(location.pathname, { replace: true })
  }

  const persist = async (message: Message) => {
    if (!keepHistory || !supabase || !user || user.isDemo) return
    try {
      if (!sessionRef.current) {
        const { data, error } = await supabase.from("chat_sessions").insert({ channel: message.channel ?? (readAloud ? "voice" : "text"), keep_history: true, language: locale }).select("id").single()
        if (error) throw new Error(error.message)
        sessionRef.current = (data as { id: string } | null)?.id ?? null
      }
      if (sessionRef.current) {
        const { error } = await supabase.from("chat_messages").insert({ session_id: sessionRef.current, role: message.role, content: message.content, sources: message.sources ?? [], pending_action: message.pending ?? null })
        if (error) throw new Error(error.message)
      }
    } catch (error) {
      console.error("Could not save chatbot history", error)
    }
  }

  const push = (message: Omit<Message, "id">) => {
    const full = { ...message, id: nextId() }
    setMessages((current) => [...current, full])
    void persist(full)
    if (full.role === "assistant" && readAloud) speakChat(full.content)
    return full
  }

  const handleVoiceResponse = async ({ transcript, answer }: DictationVoiceResponse) => {
    setDraft("")
    push({ role: "user", content: transcript, channel: "voice" })
    const reply = buildReply({
      text: transcript,
      locale,
      kb: knowledge.data?.kb ?? [],
      services: knowledge.data?.services ?? [],
      dangers: knowledge.data?.dangers ?? [],
      sectors: knowledge.data?.sectors ?? [],
      buildings: knowledge.data?.buildings ?? [],
      sectorId: user?.sectorId,
    })
    const resolvedReply = reply.kind === "unknown"
      ? { ...reply, kind: "normal" as const, pendingAction: undefined }
      : reply
    push({
      role: "assistant",
      content: answer,
      kind: resolvedReply.kind,
      sources: resolvedReply.sources,
      pending: resolvedReply.pendingAction ?? null,
      channel: "voice",
      choices: getChatChoices(resolvedReply, locale),
    })
    if (!readAloud) speakChat(answer)
  }

  const lastPending = [...messages].reverse().find((m) => m.role === "assistant" && m.pending)?.pending ?? null

  const execute = async (action: PendingAction) => {
    // On retire l'action en attente de l'historique affiché (une seule confirmation possible).
    setMessages((current) => current.map((m) => (m.pending ? { ...m, pending: null } : m)))
    try {
      if (action.type === "escalate") {
        if (!supabase || !user || user.isDemo) throw new Error(tx("Connectez-vous pour joindre un agent.", "Sign in to reach an agent."))
        const { data: service } = await supabase.from("services").select("id").eq("slug", "citizen-relations").maybeSingle()
        if (!service) throw new Error(tx("Service indisponible.", "Service unavailable."))
        const { error } = await supabase.from("support_calls").insert({ service_id: (service as { id: string }).id })
        if (error) throw new Error(error.message)
        push({ role: "assistant", content: tx("Votre demande a été transmise : un agent des Relations citoyennes vous contactera.", "Your request has been passed on: a Citizen Relations agent will contact you."), kind: "normal" })
        return
      }
      if (action.type === "create_report") {
        const verified = user?.kycStatus === "verified"
        if (!supabase || !user || !verified || !user.sectorId) {
          const params = new URLSearchParams({ title: action.draft.title, description: action.draft.description, category: action.draft.category })
          push({ role: "assistant", content: verified ? tx("Il me manque votre secteur : je vous ouvre le formulaire pré-rempli.", "I need your sector: opening the pre-filled form.") : tx("Seuls les habitants à l'identité vérifiée peuvent déposer un signalement. Je vous ouvre le formulaire pour la suite.", "Only residents with a verified identity can file a report. Opening the form for the next steps."), kind: "normal" })
          await navigate(verified ? `/app/reports/new?${params}` : "/app/verification")
          return
        }
        const { data, error } = await supabase.from("reports").insert({
          title: action.draft.title, description: action.draft.description.length >= 10 ? action.draft.description : `${action.draft.description} (signalement créé par l'assistant)`,
          category: action.draft.category, sector_id: user.sectorId, source: "chatbot", status: "received",
        }).select("report_number").single()
        if (error) throw new Error(error.message)
        push({ role: "assistant", content: tx(`Signalement créé : ${(data as { report_number: string }).report_number}. Il sera vérifié par le service concerné.`, `Report created: ${(data as { report_number: string }).report_number}. The relevant service will review it.`), kind: "normal" })
        return
      }
      if (action.type === "create_request") {
        const slug = action.draft.serviceSlug
        if (!supabase || !user || user.isDemo || !slug) {
          await navigate(slug ? `/app/requests/new?service=${slug}` : "/app/requests/new")
          push({ role: "assistant", content: tx("Je vous ouvre le formulaire de demande pour choisir le service.", "Opening the request form so you can choose the service."), kind: "normal" })
          return
        }
        const { data: service } = await supabase.from("services").select("id,default_sla_hours").eq("slug", slug).maybeSingle()
        if (!service) throw new Error(tx("Service introuvable.", "Service not found."))
        const svc = service as { id: string; default_sla_hours: number }
        const { data, error } = await supabase.from("requests").insert({
          service_id: svc.id, category: "information", subject: action.draft.subject.slice(0, 150).padEnd(3, "."),
          description: action.draft.description.length >= 10 ? action.draft.description : `${action.draft.description} (demande créée par l'assistant)`,
          due_at: dueDateFor(svc.default_sla_hours), source: "chatbot",
        }).select("tracking_number").single()
        if (error) throw new Error(error.message)
        push({ role: "assistant", content: tx(`Demande envoyée. Numéro de suivi : ${(data as { tracking_number: string }).tracking_number}.`, `Request sent. Tracking number: ${(data as { tracking_number: string }).tracking_number}.`), kind: "normal" })
      }
    } catch (error) {
      push({ role: "assistant", content: error instanceof Error ? error.message : tx("L'action a échoué.", "The action failed."), kind: "normal" })
    }
  }

  const send = async (event?: FormEvent, selectedPrompt?: string) => {
    event?.preventDefault()
    const text = (selectedPrompt ?? draft).trim()
    if (!text || busy) return
    setDraft("")
    push({ role: "user", content: text })

    // Réponse à une proposition en attente : « oui » confirme, « non » annule.
    if (lastPending && isConfirmation(text)) {
      void execute(lastPending)
      return
    }
    if (lastPending && isRejection(text)) {
      setMessages((current) => current.map((m) => (m.pending ? { ...m, pending: null } : m)))
      push({ role: "assistant", content: tx("D'accord, je n'ai rien créé.", "Okay, I have not created anything."), kind: "normal" })
      return
    }
    const reply = buildReply({
      text,
      locale,
      kb: knowledge.data?.kb ?? [],
      services: knowledge.data?.services ?? [],
      dangers: knowledge.data?.dangers ?? [],
      sectors: knowledge.data?.sectors ?? [],
      buildings: knowledge.data?.buildings ?? [],
      sectorId: user?.sectorId,
    })
    let content = reply.content
    let sources = reply.sources
    let responseKind = reply.kind
    let pendingAction = reply.pendingAction ?? null
    const availableKnowledge = knowledge.data
    if (supabase && user && !user.isDemo && availableKnowledge && (reply.intent === "info" || reply.intent === "emergency")) {
      const knowledgeContext = JSON.stringify(availableKnowledge)
      if (knowledgeContext.length <= 60_000) {
        setBusy(true)
        try {
          const history = messages.slice(-12).map(({ role, content: historyContent }) => ({ role, content: historyContent }))
          const { data, error } = await supabase.functions.invoke("gemini-chat", {
            body: { message: text, language: locale, knowledge: knowledgeContext, history },
          })
          if (error) throw new Error(error.message)
          if (data?.error) throw new Error(data.error)
          if (typeof data?.answer !== "string" || !data.answer.trim()) throw new Error("Gemini did not return an answer.")
          content = data.answer
          if (reply.kind === "unknown") {
            responseKind = "normal"
            pendingAction = null
          }
          const sourceCandidates: ChatSource[] = [
            ...availableKnowledge.kb.filter((entry): entry is KbEntry & { url: string } => Boolean(entry.url))
              .map((entry) => ({ type: entry.entity_type, title: entry.title, url: entry.url })),
            ...availableKnowledge.services.map((service) => ({ type: "service", title: service.name, url: `/services/${service.slug}` })),
            ...availableKnowledge.dangers.map((danger) => ({ type: "danger", title: danger.title, url: `/dangers/${danger.slug}` })),
          ]
          const requestedUrls: string[] = Array.isArray(data.sourceUrls)
            ? data.sourceUrls.filter((url: unknown): url is string => typeof url === "string")
            : []
          const citedSources = requestedUrls.flatMap((url) => {
            const source = sourceCandidates.find((candidate) => candidate.url === url)
            return source ? [source] : []
          })
          sources = citedSources.length > 0 ? citedSources : reply.sources
        } catch (error) {
          console.error("Grounded Gemini response failed", error)
          content += `\n\n${tx("Gemini n'est pas disponible pour le moment ; cette réponse reprend directement les informations publiées.", "Gemini is unavailable right now; this answer uses the published information directly.")}`
        } finally {
          setBusy(false)
        }
      } else {
        console.error("Published knowledge exceeds Gemini text context limit", knowledgeContext.length)
        content += `\n\n${tx("La base de connaissances dépasse la limite de Gemini ; les informations publiées sont affichées directement.", "The knowledge base exceeds Gemini's context limit; published information is shown directly.")}`
      }
    }
    push({
      role: "assistant",
      content,
      kind: responseKind,
      sources,
      pending: pendingAction,
      choices: getChatChoices({ ...reply, kind: responseKind }, locale),
    })
  }

  const stopChatSpeech = () => {
    stopSpeaking()
    setIsSpeaking(false)
  }

  const cancelPending = () => {
    setMessages((current) => current.map((m) => (m.pending ? { ...m, pending: null } : m)))
    push({ role: "assistant", content: tx("D'accord, je n'ai rien créé.", "Okay, I have not created anything."), kind: "normal" })
  }

  return (
    <>
      {isOpen && (
        <dialog
          open
          id="chatbot-panel"
          aria-label={tx("Assistant virtuel", "Virtual assistant")}
          className={cn(
            "fixed z-50 m-0 flex flex-col overflow-hidden border bg-background p-0 shadow-2xl",
            pinned
              ? "inset-auto top-0 right-0 bottom-0 left-auto h-svh w-[min(28rem,100vw)] max-w-none rounded-none"
              : "inset-auto top-auto right-4 bottom-20 left-auto h-[min(42rem,calc(100svh-7rem))] w-[calc(100vw-2rem)] max-w-[26rem] rounded-2xl"
          )}
        >
          <header className="flex items-center gap-3 border-b p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bot aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{tx("Assistant Nova Terra", "Nova Terra assistant")}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {env.enableGoogleAIStudioVoice && user && !user.isDemo
                  ? tx("Base de connaissances + Google AI Studio", "Knowledge base + Google AI Studio")
                  : tx("Réponses fondées sur les informations publiées", "Answers grounded in published information")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={pinned ? tx("Désépingler l'assistant", "Unpin assistant") : tx("Épingler l'assistant à droite", "Pin assistant to the right")}
              aria-pressed={pinned}
              onClick={() => setPinned((value) => !value)}
            >
              {pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={tx("Fermer l'assistant", "Close assistant")} onClick={close}><X aria-hidden /></Button>
          </header>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" className="size-3.5 accent-primary" checked={keepHistory} onChange={(event) => setKeepHistory(event.target.checked)} />{tx("Conserver l'historique", "Keep history")}</label>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-pressed={readAloud} onClick={() => { setReadAloud((value) => !value); stopChatSpeech() }}>
              {readAloud ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}{readAloud ? tx("Lecture activée", "Read aloud on") : tx("Lecture désactivée", "Read aloud off")}
            </Button>
            {isSpeaking && <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={stopChatSpeech}><Square aria-hidden />{tx("Arrêter la lecture", "Stop reading")}</Button>}
          </div>

          {knowledge.isError && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
              <span>{tx("Impossible de charger la base de connaissances.", "Could not load the knowledge base.")}</span>
              <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 text-foreground" onClick={() => void knowledge.refetch()}>{tx("Réessayer", "Retry")}</Button>
            </div>
          )}
          {knowledge.isLoading && <p className="border-b px-4 py-2 text-xs text-muted-foreground">{tx("Chargement des informations publiées…", "Loading published information…")}</p>}
            <section ref={conversationRef} aria-label={tx("Conversation", "Conversation")} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <article key={message.id} className={cn("max-w-[90%] rounded-2xl px-3.5 py-3 text-sm", message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : message.kind === "emergency" ? "border border-destructive/50 bg-destructive/10" : "bg-muted")}>
                <p className="sr-only">{message.role === "user" ? tx("Vous", "You") : tx("Assistant", "Assistant")}</p>
                <p className="whitespace-pre-line">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 border-t border-current/10 pt-2">
                    <p className="text-xs">{tx("Sources :", "Sources:")}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {message.sources.map((source) => (
                        <Link key={source.url} className="inline-flex min-h-8 items-center gap-1 rounded-md border px-2 text-xs underline underline-offset-2 hover:bg-background/70" onClick={close} to={source.url}>
                          <ArrowUpRight aria-hidden className="size-3.5" />{tx("Ouvrir", "Open")}: {source.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {message.role === "assistant" && <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2" onClick={() => speakChat(message.content)}><Volume2 aria-hidden />{tx("Écouter", "Listen")}</Button>}
                {message.choices && message.choices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2" aria-label={tx("Choix suggérés", "Suggested choices")}>
                    {message.choices.map((choice) => choice.href
                      ? <Link key={choice.label} onClick={close} to={choice.href} className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent">{choice.label}</Link>
                      : <Button key={choice.label} type="button" variant="outline" size="sm" onClick={() => void send(undefined, choice.prompt)}>{choice.label}</Button>)}
                  </div>
                )}
                {message.pending && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" data-voice="confirmer" onClick={() => void execute(message.pending as PendingAction)}>{tx("Confirmer", "Confirm")}</Button>
                    <Button size="sm" variant="outline" onClick={cancelPending}>{tx("Annuler", "Cancel")}</Button>
                  </div>
                )}
              </article>
            ))}
            {busy && <p className="mr-auto animate-pulse rounded-2xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">{tx("L'assistant prépare une réponse fondée sur les sources…", "Preparing a source-grounded answer…")}</p>}
          </section>

          <form onSubmit={(event) => void send(event)} className="grid gap-2 border-t p-3">
            <label htmlFor="chat-input" className="sr-only">{tx("Votre message", "Your message")}</label>
            <div className="flex gap-2">
              <Input id="chat-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={tx("Posez votre question…", "Ask your question…")} autoComplete="off" />
              <Button type="submit" data-voice="envoyer le message" disabled={!draft.trim() || busy}><Send aria-hidden /><span className="sr-only">{tx("Envoyer", "Send")}</span></Button>
            </div>
            {!env.enableGoogleAIStudioVoice
              ? <p className="text-xs text-muted-foreground">{tx("Le chat vocal Gemini doit être activé par l'administrateur.", "Gemini voice chat must be enabled by the administrator.")}</p>
              : !supabase || !user || user.isDemo
                ? <p className="text-xs text-muted-foreground">{user
                    ? tx("Connectez-vous avec un compte réel pour utiliser le chat vocal Google AI Studio.", "Sign in with a real account to use Google AI Studio voice chat.")
                    : <>{tx("Connectez-vous pour utiliser le chat vocal Google AI Studio : ", "Sign in to use Google AI Studio voice chat: ")}<Link className="underline underline-offset-4" to="/connexion" onClick={close}>{tx("Connexion", "Sign in")}</Link></>}
                  </p>
                : <DictationButton
                  onText={(text) => setDraft((current) => `${current} ${text}`.trim())}
                  sendVoiceMessage={sendVoiceMessage}
                  onVoiceResponse={handleVoiceResponse}
                />}
          </form>
        </dialog>
      )}
      <Button
        type="button"
        size="icon"
        aria-label={isOpen ? tx("Fermer l'assistant", "Close assistant") : tx("Ouvrir l'assistant", "Open assistant")}
        aria-expanded={isOpen}
        aria-controls={isOpen ? "chatbot-panel" : undefined}
        className="fixed right-4 bottom-4 z-50 size-14 rounded-full shadow-xl"
        onClick={() => isOpen ? close() : setOpen(true)}
      >
        {isOpen ? <X aria-hidden /> : <Bot aria-hidden />}
      </Button>
    </>
  )
}
