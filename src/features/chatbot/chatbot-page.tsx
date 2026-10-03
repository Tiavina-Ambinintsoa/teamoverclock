import { useEffect, useRef, useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bot, Send, Volume2, VolumeX } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
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
import { dueDateFor } from "@/features/requests/request-workflow"
import { speak, stopSpeaking } from "@/features/voice/speech"
import { DictationButton } from "@/features/voice/dictation-button"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: ChatReply["kind"]
  sources?: ChatSource[]
  pending?: PendingAction | null
}

function useKnowledge() {
  return useQuery({
    queryKey: ["chat-knowledge"],
    staleTime: 60_000,
    queryFn: async () => {
      if (!supabase) return { kb: [] as KbEntry[], services: [] as ServiceFacts[] }
      const [kb, services] = await Promise.all([
        supabase.from("knowledge_base").select("id,entity_type,title,content,url").eq("is_published", true),
        supabase.from("services").select("slug,name,category,description,phone,opening_hours,required_documents,procedures,status,is_emergency"),
      ])
      return { kb: unwrap(kb, []) as KbEntry[], services: unwrap(services, []) as ServiceFacts[] }
    },
  })
}

let counter = 0
const nextId = () => `m-${(counter += 1)}`

/** Assistant texte et vocal : répond depuis les contenus publiés, cite ses sources, confirme avant toute création. */
export function ChatbotPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const navigate = useNavigate()
  const knowledge = useKnowledge()
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: nextId(), role: "assistant", kind: "normal", content: tx("Bonjour ! Posez-moi une question sur les services, les démarches, les actualités ou les alertes de Nova Terra. Je peux aussi préparer un signalement ou une demande (avec votre confirmation).", "Hello! Ask me about Nova Terra's services, procedures, news or alerts. I can also prepare a report or a request (with your confirmation).") },
  ])
  const [draft, setDraft] = useState("")
  const [keepHistory, setKeepHistory] = useState(false)
  const [readAloud, setReadAloud] = useState(false)
  const sessionRef = useRef<string | null>(null)
  const lang = locale === "en" ? "en-GB" : "fr-FR"

  useEffect(() => () => stopSpeaking(), [])

  const persist = async (message: Message) => {
    if (!keepHistory || !supabase || !user || user.isDemo) return
    try {
      if (!sessionRef.current) {
        const { data } = await supabase.from("chat_sessions").insert({ channel: readAloud ? "voice" : "text", keep_history: true, language: locale }).select("id").single()
        sessionRef.current = (data as { id: string } | null)?.id ?? null
      }
      if (sessionRef.current) {
        await supabase.from("chat_messages").insert({ session_id: sessionRef.current, role: message.role, content: message.content, sources: message.sources ?? [], pending_action: message.pending ?? null })
      }
    } catch {
      /* l'historique est facultatif : une erreur ne doit pas bloquer la conversation */
    }
  }

  const push = (message: Omit<Message, "id">) => {
    const full = { ...message, id: nextId() }
    setMessages((current) => [...current, full])
    void persist(full)
    if (full.role === "assistant" && readAloud) speak(full.content, { lang })
    return full
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

  const send = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text) return
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
    const reply = buildReply({ text, locale, kb: knowledge.data?.kb ?? [], services: knowledge.data?.services ?? [] })
    push({ role: "assistant", content: reply.content, kind: reply.kind, sources: reply.sources, pending: reply.pendingAction ?? null })
  }

  const cancelPending = () => {
    setMessages((current) => current.map((m) => (m.pending ? { ...m, pending: null } : m)))
    push({ role: "assistant", content: tx("D'accord, je n'ai rien créé.", "Okay, I have not created anything."), kind: "normal" })
  }

  return (
    <Container className="max-w-3xl">
      <title>{tx("Assistant", "Assistant")}</title>
      <PageHeader eyebrow={tx("Mon espace", "My space")} title={tx("Assistant virtuel", "Virtual assistant")} description={tx("Réponses fondées sur les contenus publiés, avec leurs sources. Je n'invente jamais un horaire, une adresse ou une procédure.", "Answers based on published content, with their sources. I never make up an hour, an address or a procedure.")} />

      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={keepHistory} onChange={(e) => setKeepHistory(e.target.checked)} />{tx("Conserver l'historique de cette conversation", "Keep this conversation's history")}</label>
        <Button type="button" variant="outline" size="sm" aria-pressed={readAloud} onClick={() => { setReadAloud((v) => !v); stopSpeaking() }}>
          {readAloud ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}{readAloud ? tx("Lecture vocale activée", "Read aloud on") : tx("Lecture vocale désactivée", "Read aloud off")}
        </Button>
      </div>

      <section aria-label={tx("Conversation", "Conversation")} aria-live="polite" className="grid max-h-[55vh] min-h-72 gap-3 overflow-y-auto rounded-xl border bg-card p-4">
        {messages.map((m) => (
          <article key={m.id} className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : m.kind === "emergency" ? "border border-destructive/50 bg-destructive/10" : "bg-muted")}>
            <p className="sr-only">{m.role === "user" ? tx("Vous", "You") : tx("Assistant", "Assistant")}</p>
            <p className="whitespace-pre-line">{m.content}</p>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-2 text-xs">{tx("Sources :", "Sources:")} {m.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<Link className="underline underline-offset-4" to={s.url}>{s.title}</Link></span>)}</p>
            )}
            {m.role === "assistant" && (
              <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2" onClick={() => speak(m.content, { lang })}><Volume2 aria-hidden />{tx("Écouter", "Listen")}</Button>
            )}
            {m.pending && m.pending.type !== undefined && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" data-voice="confirmer" onClick={() => void execute(m.pending as PendingAction)}>{tx("Confirmer", "Confirm")}</Button>
                <Button size="sm" variant="outline" onClick={cancelPending}>{tx("Annuler", "Cancel")}</Button>
              </div>
            )}
          </article>
        ))}
        <div ref={(element) => { element?.scrollIntoView({ behavior: "smooth", block: "end" }) }} />
      </section>

      <form onSubmit={send} className="mt-3 grid gap-2">
        <label htmlFor="chat-input" className="sr-only">{tx("Votre message", "Your message")}</label>
        <div className="flex gap-2">
          <Input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tx("Posez votre question…", "Ask your question…")} autoComplete="off" />
          <Button type="submit" data-voice="envoyer le message" disabled={!draft.trim()}><Send aria-hidden />{tx("Envoyer", "Send")}</Button>
        </div>
        <DictationButton onText={(text) => setDraft((d) => `${d} ${text}`.trim())} />
        <p className="text-xs text-muted-foreground"><Bot className="mr-1 inline size-3" aria-hidden />{tx("La dictée remplit le champ : relisez et corrigez la transcription avant d'envoyer.", "Dictation fills the field: review and correct the transcript before sending.")}</p>
      </form>
    </Container>
  )
}
