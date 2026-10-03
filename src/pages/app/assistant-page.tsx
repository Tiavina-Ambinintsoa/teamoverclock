import { useEffect, useRef, useState, type FormEvent } from "react"
import { Bot, MessageSquarePlus, Send } from "lucide-react"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { supabase } from "@/lib/supabase"
import { SITE } from "@/lib/site"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

type Conversation = { id: string; title: string; updated_at: string }
type ChatMessage = { role: "user" | "assistant"; content: string; created_at?: string }

export function AssistantPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshConversations = async () => {
    if (!env.enableAIHistory || !supabase || !user || user.isDemo) return
    const { data, error } = await supabase.from("ai_conversations")
      .select("id, title, updated_at").order("updated_at", { ascending: false }).limit(30)
    if (error) {
      toast.error("Impossible de charger l'historique : exécutez le schéma Supabase actualisé.")
      return
    }
    setConversations((data ?? []) as Conversation[])
  }

  useEffect(() => { void refreshConversations() }, [user?.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [messages, busy])

  const openConversation = async (id: string) => {
    if (!supabase) return
    const { data, error } = await supabase.from("ai_messages")
      .select("role, content, created_at").eq("conversation_id", id)
      .order("created_at", { ascending: true }).limit(100)
    if (error) return toast.error("Impossible de lire cette conversation.")
    setConversationId(id)
    setMessages((data ?? []) as ChatMessage[])
  }

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    if (!env.enableAIChat) return toast.error("Activez VITE_ENABLE_AI_CHAT et configurez les secrets OpenRouter.")
    if (!supabase || !user || user.isDemo) return toast.error("Connectez un compte Supabase réel pour utiliser l'assistant.")

    setDraft("")
    setBusy(true)
    setMessages((current) => [...current, { role: "user", content }])
    try {
      const { data, error } = await supabase.functions.invoke("openrouter-chat", {
        body: { conversationId, message: content },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setConversationId(data.conversationId ?? null)
      setMessages((current) => [...current, { role: "assistant", content: data.answer }])
      if (data.historyEnabled) await refreshConversations()
    } catch (error) {
      setMessages((current) => current.slice(0, -1))
      setDraft(content)
      toast.error(error instanceof Error ? error.message : "L'assistant n'a pas pu répondre.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="max-w-6xl px-4 sm:px-6">
      <title>Assistant IA — {SITE.name}</title>
      <header className="mb-6">
        <p className="text-sm font-medium text-primary">Module facultatif · OpenRouter</p>
        <h1 className="mt-1 text-3xl font-semibold"><AuroraTitle>Assistant IA</AuroraTitle></h1>
        <p className="mt-2 text-muted-foreground">Les conversations sont privées. Le quota serveur est limité à 20 demandes par jour et par compte.</p>
      </header>

      {!env.enableAIChat || !supabase || user?.isDemo ? (
        <Card><CardHeader><CardTitle>Configuration requise</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>Pour activer le chat, configurez Supabase, exécutez <code>supabase/schema.sql</code>, ajoutez le secret <code>OPENROUTER_API_KEY</code> aux Edge Functions et définissez <code>VITE_ENABLE_AI_CHAT=true</code> avant le build.</p>
          <p>La clé OpenRouter est conservée uniquement côté serveur.</p>
        </CardContent></Card>
      ) : (
        <div className={`grid min-h-[65svh] gap-4 ${env.enableAIHistory ? "lg:grid-cols-[15rem_1fr]" : ""}`}>
          {env.enableAIHistory && <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Button type="button" variant="outline" className="justify-start" onClick={() => { setConversationId(null); setMessages([]) }}><MessageSquarePlus aria-hidden /> Nouvelle conversation</Button>
              <div className="grid max-h-[55svh] gap-1 overflow-y-auto">
                {conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => void openConversation(conversation.id)} className={`truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${conversationId === conversation.id ? "bg-accent font-medium" : ""}`}>{conversation.title}</button>)}
                {conversations.length === 0 && <p className="py-3 text-xs text-muted-foreground">Vos conversations apparaîtront ici.</p>}
              </div>
            </CardContent>
          </Card>}

          <Card className="flex min-h-[65svh] flex-col overflow-hidden">
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" aria-hidden /> Conversation</CardTitle></CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 && <div className="m-auto max-w-md py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Bot aria-hidden /></span><p className="mt-4 font-medium">Comment puis-je vous aider ?</p><p className="mt-1 text-sm text-muted-foreground">Les réponses peuvent contenir des erreurs. Vérifiez les informations importantes.</p></div>}
              {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border bg-muted/60"}`}>{message.content}</div>)}
              {busy && <div className="mr-auto animate-pulse rounded-2xl border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">L'assistant réfléchit…</div>}
              <div ref={bottomRef} />
            </CardContent>
            <form onSubmit={send} className="grid gap-2 border-t p-3 sm:p-4">
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrivez votre message…" maxLength={4000} rows={3} aria-label="Votre message" disabled={busy} />
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{draft.length}/4000 · Quota quotidien : 20 demandes</span><Button type="submit" disabled={busy || !draft.trim()}><Send aria-hidden />Envoyer</Button></div>
            </form>
          </Card>
        </div>
      )}
    </Container>
  )
}
