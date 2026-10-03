import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { fetchDisplayNames, useRequestDetail } from "@/features/requests/request-queries"
import { allowedTransitions, requiresNote } from "@/features/requests/request-workflow"
import { useLocale } from "@/lib/locale"
import { formatDateTime, isOverdue, unwrap } from "@/lib/query-helpers"
import { statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import type { RequestStatus } from "@/lib/types"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

/** F22 — fiche d'une demande : citoyen (suivi, réponse, annulation, note) ou agent (statut, affectation, notes internes). */
export function RequestDetail({ mode }: { mode: "citizen" | "agent" }) {
  const { id } = useParams()
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const detail = useRequestDetail(id)
  const services = useServices({})
  const request = detail.data?.request
  const names = detail.data?.names ?? {}
  const agent = mode === "agent"

  const [comment, setComment] = useState("")
  const [internal, setInternal] = useState(false)
  const [target, setTarget] = useState<RequestStatus | "">("")
  const [note, setNote] = useState("")
  const [assignee, setAssignee] = useState("")

  const members = useQuery({
    queryKey: ["request-members", request?.service_id],
    enabled: agent && Boolean(request?.service_id && supabase),
    queryFn: async () => {
      if (!supabase || !request) return [] as { id: string; name: string }[]
      const rows = unwrap(await supabase.from("service_members").select("profile_id").eq("service_id", request.service_id).is("revoked_at", null), []) as { profile_id: string }[]
      const map = await fetchDisplayNames(rows.map((r) => r.profile_id))
      return rows.map((r) => ({ id: r.profile_id, name: map[r.profile_id] ?? r.profile_id }))
    },
  })

  const attachmentUrls = useQuery({
    queryKey: ["request-attachments", request?.id],
    enabled: Boolean(request && request.attachments.length > 0 && supabase),
    queryFn: async () => {
      if (!supabase || !request) return {} as Record<string, string>
      const urls: Record<string, string> = {}
      for (const file of request.attachments) {
        const { data } = await supabase.storage.from("request-attachments").createSignedUrl(file.path, 300)
        if (data) urls[file.path] = data.signedUrl
      }
      return urls
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["request-detail", id] })
    await queryClient.invalidateQueries({ queryKey: ["my-requests"] })
    await queryClient.invalidateQueries({ queryKey: ["agent-requests"] })
  }

  const addComment = useMutation({
    mutationFn: async () => {
      if (!supabase || !request) throw new Error("Supabase")
      const { error } = await supabase.from("request_comments").insert({ request_id: request.id, body: comment.trim(), is_internal: agent && internal })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { setComment(""); setInternal(false); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const changeStatus = useMutation({
    mutationFn: async () => {
      if (!supabase || !request || !target) throw new Error("Supabase")
      if (requiresNote(target) && note.trim().length < 3) throw new Error(tx("Une réponse est obligatoire pour clore, résoudre ou rejeter.", "A reply is required to resolve, close or reject."))
      const patch: Record<string, unknown> = { status: target }
      if (requiresNote(target)) patch.resolution_note = note.trim()
      const { error } = await supabase.from("requests").update(patch).eq("id", request.id)
      if (error) throw new Error(error.message)
      if (note.trim()) {
        await supabase.from("request_comments").insert({ request_id: request.id, body: note.trim(), is_internal: false })
      }
    },
    onSuccess: async () => { setTarget(""); setNote(""); toast.success(tx("Statut mis à jour.", "Status updated.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const assign = useMutation({
    mutationFn: async () => {
      if (!supabase || !request || !assignee) throw new Error("Supabase")
      const patch: Record<string, unknown> = { assigned_agent_id: assignee }
      if (["new", "received", "to_qualify"].includes(request.status)) patch.status = "assigned"
      const { error } = await supabase.from("requests").update(patch).eq("id", request.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { setAssignee(""); toast.success(tx("Demande affectée.", "Request assigned.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const cancel = useMutation({
    mutationFn: async () => {
      if (!supabase || !request) throw new Error("Supabase")
      const { error } = await supabase.rpc("cancel_my_request", { p_request_id: request.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Demande annulée.", "Request cancelled.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const rate = useMutation({
    mutationFn: async (score: number) => {
      if (!supabase || !request) throw new Error("Supabase")
      const { error } = await supabase.rpc("rate_my_request", { p_request_id: request.id, p_score: score })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Merci pour votre avis.", "Thanks for your feedback.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  if (detail.isLoading) return <PageLoader />
  if (!request) {
    return (
      <Container className="max-w-3xl">
        <div role="alert" className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold"><AuroraTitle>{tx("Demande introuvable", "Request not found")}</AuroraTitle></h1>
          <p className="mt-2 text-muted-foreground">{tx("Elle n'existe pas ou vous n'y avez pas accès.", "It does not exist or you do not have access to it.")}</p>
        </div>
      </Container>
    )
  }

  const serviceName = services.data?.find((s) => s.id === request.service_id)?.name ?? "—"
  const overdue = isOverdue(request.due_at, request.status)
  const transitions = allowedTransitions(request.status)
  const canCancel = !agent && ["new", "received", "to_qualify"].includes(request.status)
  const canRate = !agent && ["resolved", "closed"].includes(request.status) && request.satisfaction === null
  const backTo = agent ? "/agent/requests" : "/app/requests"

  const onComment = (event: FormEvent) => {
    event.preventDefault()
    if (comment.trim()) addComment.mutate()
  }

  return (
    <Container className="max-w-4xl">
      <title>{request.tracking_number}</title>
      <nav aria-label={tx("Fil d'Ariane", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <Link to={backTo} className="underline-offset-4 hover:underline">{tx("Demandes", "Requests")}</Link> / <span className="font-mono">{request.tracking_number}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl"><AuroraTitle>{request.subject}</AuroraTitle></h1>
          <StatusBadge kind="request" value={request.status} />
          <StatusBadge kind="priority" value={request.priority} />
          {overdue && <Badge variant="destructive">{tx("En retard", "Overdue")}</Badge>}
          {request.source !== "web" && <Badge variant="outline">{request.source}</Badge>}
        </div>
        <dl className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <div><dt className="inline font-medium text-foreground">{tx("Service", "Service")} : </dt><dd className="inline">{serviceName}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Créée le", "Created on")} : </dt><dd className="inline">{formatDateTime(request.created_at, tag)}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Échéance", "Due")} : </dt><dd className="inline">{formatDateTime(request.due_at, tag)}</dd></div>
          {agent && <div><dt className="inline font-medium text-foreground">{tx("Demandeur", "Requester")} : </dt><dd className="inline">{names[request.requester_id] ?? "—"}</dd></div>}
          <div><dt className="inline font-medium text-foreground">{tx("Responsable", "Assigned to")} : </dt><dd className="inline">{request.assigned_agent_id ? (names[request.assigned_agent_id] ?? "—") : "—"}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="desc" className="mb-6 rounded-xl border bg-card p-5">
        <h2 id="desc" className="mb-2 font-semibold">{tx("Description", "Description")}</h2>
        <p className="whitespace-pre-line text-sm">{request.description}</p>
        {request.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {request.attachments.map((file) => (
              <li key={file.path}>
                {attachmentUrls.data?.[file.path]
                  ? <a className="rounded-md border px-2 py-1 text-sm underline-offset-4 hover:underline" href={attachmentUrls.data[file.path]} target="_blank" rel="noopener noreferrer">{file.name}</a>
                  : <span className="rounded-md border px-2 py-1 text-sm text-muted-foreground">{file.name}</span>}
              </li>
            ))}
          </ul>
        )}
        {request.resolution_note && <p className="mt-4 rounded-lg bg-muted p-3 text-sm"><strong>{tx("Réponse :", "Response:")}</strong> {request.resolution_note}</p>}
      </section>

      {(canCancel || canRate) && (
        <section className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-5">
          {canCancel && <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{tx("Annuler ma demande", "Cancel my request")}</Button>}
          {canRate && (
            <fieldset className="flex items-center gap-2"><legend className="sr-only">{tx("Votre satisfaction", "Your satisfaction")}</legend>
              <span className="text-sm">{tx("Votre satisfaction :", "Your satisfaction:")}</span>
              {[1, 2, 3, 4, 5].map((n) => <Button key={n} size="sm" variant="outline" aria-label={`${n}/5`} disabled={rate.isPending} onClick={() => rate.mutate(n)}>{n}</Button>)}
            </fieldset>
          )}
        </section>
      )}

      {agent && (
        <section aria-labelledby="actions" className="mb-6 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
          <h2 id="actions" className="sr-only">{tx("Actions", "Actions")}</h2>
          <div className="grid gap-2">
            <label htmlFor="assign" className="text-sm font-medium">{tx("Affecter à", "Assign to")}</label>
            <Select id="assign" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">—</option>
              {(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Button variant="outline" disabled={!assignee || assign.isPending} onClick={() => assign.mutate()}>{tx("Affecter", "Assign")}</Button>
          </div>
          <div className="grid gap-2">
            <label htmlFor="target" className="text-sm font-medium">{tx("Changer le statut", "Change status")}</label>
            <Select id="target" value={target} onChange={(e) => setTarget(e.target.value as RequestStatus | "")} disabled={transitions.length === 0}>
              <option value="">{transitions.length === 0 ? tx("Statut final", "Final status") : "—"}</option>
              {transitions.map((s) => <option key={s} value={s}>{statusLabel("request", s, locale)}</option>)}
            </Select>
            {target && (
              <>
                <label htmlFor="note" className="text-sm font-medium">{requiresNote(target) ? tx("Réponse (obligatoire)", "Reply (required)") : tx("Message au citoyen (facultatif)", "Message to the citizen (optional)")}</label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </>
            )}
            <Button disabled={!target || changeStatus.isPending || (requiresNote(target as RequestStatus) && note.trim().length < 3)} onClick={() => changeStatus.mutate()}>{tx("Mettre à jour", "Update")}</Button>
          </div>
        </section>
      )}

      <section aria-labelledby="timeline" className="mb-6 rounded-xl border bg-card p-5">
        <h2 id="timeline" className="mb-3 font-semibold">{tx("Historique", "History")}</h2>
        <ol className="grid gap-2 text-sm">
          <li className="text-muted-foreground">{formatDateTime(request.created_at, tag)} · {tx("Demande créée", "Request created")}</li>
          {(detail.data?.history ?? []).map((h) => (
            <li key={h.id}>
              <span className="text-muted-foreground">{formatDateTime(h.changed_at, tag)} · </span>
              {h.from_status ? statusLabel("request", h.from_status, locale) : "—"} → <strong>{statusLabel("request", h.to_status, locale)}</strong>
              {h.changed_by && agent ? <span className="text-muted-foreground"> ({names[h.changed_by] ?? "—"})</span> : null}
              {h.reason ? <span> — {h.reason}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="comments" className="rounded-xl border bg-card p-5">
        <h2 id="comments" className="mb-3 font-semibold">{tx("Échanges", "Messages")}</h2>
        <ul className="grid gap-3">
          {(detail.data?.comments ?? []).map((c) => (
            <li key={c.id} className={c.is_internal ? "rounded-lg border border-dashed bg-muted/50 p-3 text-sm" : "rounded-lg border p-3 text-sm"}>
              <p className="font-medium">
                {names[c.author_id] ?? "—"}
                {c.is_internal && <Badge variant="outline" className="ml-2">{tx("Note interne", "Internal note")}</Badge>}
                <span className="font-normal text-muted-foreground"> · {formatDateTime(c.created_at, tag)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
          {(detail.data?.comments.length ?? 0) === 0 && <li className="text-sm text-muted-foreground">{tx("Aucun message pour le moment.", "No message yet.")}</li>}
        </ul>
        {user && request.status !== "closed" && request.status !== "cancelled" && (
          <form onSubmit={onComment} className="mt-4 grid gap-2">
            <label htmlFor="comment" className="text-sm font-medium">{tx("Ajouter un message", "Add a message")}</label>
            <Textarea id="comment" value={comment} maxLength={5000} onChange={(e) => setComment(e.target.value)} />
            {agent && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={internal} onChange={(e) => setInternal(e.target.checked)} />{tx("Note interne (invisible pour le citoyen)", "Internal note (hidden from the citizen)")}</label>}
            <Button type="submit" className="w-fit" disabled={addComment.isPending || !comment.trim()}>{tx("Envoyer", "Send")}</Button>
          </form>
        )}
      </section>
    </Container>
  )
}

export function CitizenRequestDetailPage() {
  return <RequestDetail mode="citizen" />
}
export function AgentRequestDetailPage() {
  return <RequestDetail mode="agent" />
}
