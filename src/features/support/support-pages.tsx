import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Phone } from "lucide-react"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { localizedField } from "@/features/i18n/content-translations"
import { fetchDisplayNames } from "@/features/requests/request-queries"
import { copyLocale, useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

type CallStatus = "requested" | "connected" | "ended" | "missed"
interface CallRow {
  id: string
  caller_id: string | null
  service_id: string
  agent_id: string | null
  status: CallStatus
  started_at: string
  ended_at: string | null
  duration_s: number
  summary: string | null
}

const STATUS_LABEL: Record<CallStatus, { fr: string; en: string }> = {
  requested: { fr: "Demandé", en: "Requested" },
  connected: { fr: "En cours", en: "In progress" },
  ended: { fr: "Terminé", en: "Ended" },
  missed: { fr: "Manqué", en: "Missed" },
}

/** Durée d'un appel en secondes entre deux horodatages (jamais négative). */
export function callDuration(startedAt: string, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000))
}

/** Appel avec un conseiller (simulé) : l'habitant le demande, un agent du service le prend puis le clôt avec un résumé. */
export function SupportPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const [serviceId, setServiceId] = useState("")

  const calls = useQuery({
    queryKey: ["my-calls", user?.id],
    enabled: Boolean(supabase && user && !user.isDemo),
    refetchInterval: 5000,
    queryFn: async (): Promise<CallRow[]> => {
      if (!supabase || !user) return []
      return unwrap(await supabase.from("support_calls").select("*").eq("caller_id", user.id).order("started_at", { ascending: false }).limit(20), []) as CallRow[]
    },
  })

  const request = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase")
      const id = serviceId || services.data?.find((s) => s.slug === "citizen-relations")?.id
      if (!id) throw new Error(tx("Choisissez un service.", "Choose a service."))
      const { error } = await supabase.from("support_calls").insert({ service_id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Appel demandé : un conseiller va vous répondre.", "Call requested: an agent will answer.")); await queryClient.invalidateQueries({ queryKey: ["my-calls"] }) },
    onError: (error: Error) => toast.error(error.message),
  })

  const nameOf = (id: string) => {
    const service = services.data?.find((s) => s.id === id)
    return service ? localizedField(service.translations, "name", locale, service.name) : "—"
  }

  return (
    <Container className="max-w-3xl">
      <title>{tx("Appeler un conseiller", "Call an agent")}</title>
      <PageHeader eyebrow={tx("Mon espace", "My space")} title={tx("Appeler un conseiller", "Call an agent")} description={tx("Demandez à être appelé par un agent du service de votre choix (appel simulé pour la démonstration).", "Ask to be called by an agent of the service you choose (simulated call for the demo).")} />
      <section aria-labelledby="ask" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <h2 id="ask" className="sr-only">{tx("Nouvelle demande d'appel", "New call request")}</h2>
        <div className="grid gap-1">
          <label htmlFor="call-service" className="text-sm font-medium">{tx("Service", "Service")}</label>
          <Select id="call-service" className="w-72" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">{tx("Bureau des relations citoyennes", "Citizen Relations Office")}</option>
            {(services.data ?? []).filter((s) => s.status === "open" && s.slug !== "citizen-relations").map((s) => <option key={s.id} value={s.id}>{localizedField(s.translations, "name", locale, s.name)}</option>)}
          </Select>
        </div>
        <Button disabled={request.isPending} onClick={() => request.mutate()}><Phone aria-hidden />{tx("Demander un appel", "Request a call")}</Button>
      </section>
      <DataState data={calls.data} isLoading={calls.isLoading} error={calls.error} onRetry={() => void calls.refetch()} emptyTitle={tx("Aucun appel", "No call")}>
        {(rows) => (
          <ul className="grid gap-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{nameOf(c.service_id)}</p><Badge variant={c.status === "connected" ? "default" : "outline"}>{STATUS_LABEL[c.status][copyLocale(locale)]}</Badge></div>
                <p className="text-muted-foreground">{formatDateTime(c.started_at, tag)}{c.duration_s > 0 ? ` · ${c.duration_s} s` : ""}</p>
                {c.summary && <p className="mt-1">{c.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}

/** File d'appels de mon service : prendre un appel, le clore avec un résumé. */
export function AgentCallsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const [summaries, setSummaries] = useState<Record<string, string>>({})

  const calls = useQuery({
    queryKey: ["agent-calls", user?.id],
    enabled: Boolean(supabase && user),
    refetchInterval: 5000,
    queryFn: async () => {
      if (!supabase) return { rows: [] as CallRow[], names: {} as Record<string, string> }
      const rows = unwrap(await supabase.from("support_calls").select("*").order("started_at", { ascending: false }).limit(50), []) as CallRow[]
      return { rows, names: await fetchDisplayNames(rows.map((r) => r.caller_id)) }
    },
  })

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["agent-calls"] })
  const take = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("support_calls").update({ status: "connected", agent_id: user.id, started_at: new Date().toISOString() }).eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  })
  const end = useMutation({
    mutationFn: async (call: CallRow) => {
      if (!supabase) throw new Error("Supabase")
      const now = new Date()
      const { error } = await supabase.from("support_calls").update({ status: "ended", ended_at: now.toISOString(), duration_s: callDuration(call.started_at, now), summary: summaries[call.id]?.trim() || null }).eq("id", call.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Appel clos.", "Call ended.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })
  const miss = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("support_calls").update({ status: "missed" }).eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-4xl">
      <title>{tx("Appels", "Calls")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Appels des habitants", "Residents' calls")} description={tx("Prenez un appel en attente, puis clôturez-le avec un résumé.", "Take a pending call, then close it with a summary.")} />
      <DataState data={calls.data?.rows} isLoading={calls.isLoading} error={calls.error} onRetry={() => void calls.refetch()} emptyTitle={tx("Aucun appel", "No call")}>
        {(rows) => (
          <ul className="grid gap-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{calls.data?.names[c.caller_id ?? ""] ?? "—"} <span className="font-normal text-muted-foreground">· {services.data?.find((s) => s.id === c.service_id)?.name}</span></p>
                  <Badge variant={c.status === "requested" ? "highlight" : c.status === "connected" ? "default" : "outline"}>{STATUS_LABEL[c.status][copyLocale(locale)]}</Badge>
                </div>
                <p className="text-muted-foreground">{formatDateTime(c.started_at, tag)}</p>
                {c.status === "requested" && <div className="mt-2 flex gap-2"><Button size="sm" disabled={take.isPending} onClick={() => take.mutate(c.id)}>{tx("Prendre l'appel", "Take the call")}</Button><Button size="sm" variant="outline" disabled={miss.isPending} onClick={() => miss.mutate(c.id)}>{tx("Marquer manqué", "Mark missed")}</Button></div>}
                {c.status === "connected" && (
                  <div className="mt-2 grid gap-2">
                    <label htmlFor={`sum-${c.id}`} className="text-sm font-medium">{tx("Résumé de l'appel", "Call summary")}</label>
                    <Textarea id={`sum-${c.id}`} value={summaries[c.id] ?? ""} onChange={(e) => setSummaries((s) => ({ ...s, [c.id]: e.target.value }))} />
                    <Button size="sm" className="w-fit" disabled={end.isPending} onClick={() => end.mutate(c)}>{tx("Terminer l'appel", "End the call")}</Button>
                  </div>
                )}
                {c.summary && <p className="mt-2">{c.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
