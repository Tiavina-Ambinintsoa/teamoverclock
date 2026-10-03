import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { generateDescription, isValidDescription, type AiTargetTable } from "@/features/admin/ai-content"
import { useBuildings, useSectors, useServices } from "@/features/city/city-queries"
import { SyncIndicator } from "@/features/agent/sync-indicator"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

async function countOf(table: string, build: (q: ReturnType<NonNullable<typeof supabase>["from"]>) => PromiseLike<{ count: number | null }>): Promise<number> {
  if (!supabase) return 0
  const result = await build(supabase.from(table))
  return result.count ?? 0
}

/** Vue d'ensemble de l'administration : ce qui attend une décision. */
export function AdminOverviewPage() {
  const { tx } = useLocale()
  const newsletter = useMutation({
    mutationFn: async (frequency: "instant" | "daily" | "weekly") => {
      if (!supabase) throw new Error("Supabase")
      const { data, error } = await supabase.rpc("send_newsletter_digest", { p_frequency: frequency })
      if (error) throw new Error(error.message)
      return data as number
    },
    onSuccess: (n) => toast.success(tx(`${n} notification(s) de lettre d'information créée(s).`, `${n} newsletter notification(s) created.`)),
    onError: (error: Error) => toast.error(error.message),
  })
  const counts = useQuery({
    queryKey: ["admin-overview"],
    enabled: Boolean(supabase),
    queryFn: async () => {
      const head = { count: "exact" as const, head: true }
      const [users, kyc, news, ai, reports, overdue] = await Promise.all([
        countOf("profiles", (q) => q.select("id", head)),
        countOf("citizen_verifications", (q) => q.select("id", head).eq("status", "pending")),
        countOf("news", (q) => q.select("id", head).eq("status", "pending_review")),
        countOf("ai_generated_content", (q) => q.select("id", head).eq("status", "pending")),
        countOf("reports", (q) => q.select("id", head).in("status", ["received", "to_verify"])),
        countOf("requests", (q) => q.select("id", head).lt("due_at", new Date().toISOString()).not("status", "in", "(resolved,closed,rejected,cancelled)")),
      ])
      return { users, kyc, news, ai, reports, overdue }
    },
  })
  const c = counts.data
  const cards = [
    { label: tx("Profils", "Profiles"), value: c?.users, to: "/admin/users" },
    { label: tx("Vérifications CIN en attente", "CIN checks pending"), value: c?.kyc, to: "/admin/verifications" },
    { label: tx("Actualités à relire", "News to review"), value: c?.news, to: "/admin/news" },
    { label: tx("Contenus IA à valider", "AI content to validate"), value: c?.ai, to: "/admin/ai-content" },
    { label: tx("Signalements à vérifier", "Reports to verify"), value: c?.reports, to: "/agent/reports" },
    { label: tx("Demandes en retard", "Overdue requests"), value: c?.overdue, to: "/agent/requests" },
  ]
  return (
    <Container className="max-w-6xl">
      <title>{tx("Administration", "Administration")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Vue d'ensemble", "Overview")} description={tx("Ce qui attend une décision de l'administration générale.", "What is waiting for a decision from the general administration.")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="rounded-xl border bg-card p-5 hover:bg-accent">
            <h2 className="text-sm font-medium text-muted-foreground">{card.label}</h2>
            <p className="mt-2 text-3xl font-semibold">{card.value ?? "—"}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SyncIndicator />
        <section aria-labelledby="nl-title" className="rounded-xl border bg-card p-5">
          <h2 id="nl-title" className="font-semibold">{tx("Lettres d'information", "Newsletters")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tx("Notifie les abonnés des actualités publiées correspondant à leurs sujets (une seule fois par actualité).", "Notifies subscribers about published news matching their topics (once per item).")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["instant", "daily", "weekly"] as const).map((f) => (
              <Button key={f} variant="outline" size="sm" disabled={newsletter.isPending} onClick={() => newsletter.mutate(f)}>{f === "instant" ? tx("Immédiates", "Instant") : f === "daily" ? tx("Quotidiennes", "Daily") : tx("Hebdomadaires", "Weekly")}</Button>
            ))}
          </div>
        </section>
      </div>
    </Container>
  )
}

interface AiRow {
  id: string
  target_table: AiTargetTable
  target_id: string | null
  model: string
  prompt_version: string
  payload: { description?: string }
  status: "pending" | "validated" | "rejected"
  reviewed_at: string | null
  created_at: string
}

/** Contenus générés par IA : proposés, relus puis validés par un humain avant d'être appliqués ; reconstruction de la base du chatbot. */
export function AdminAiContentPage() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const buildings = useBuildings()
  const services = useServices({})
  const [table, setTable] = useState<AiTargetTable>("sectors")
  const [targetId, setTargetId] = useState("")

  const rows = useQuery({
    queryKey: ["ai-content"],
    queryFn: async (): Promise<AiRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("ai_generated_content").select("*").order("created_at", { ascending: false }).limit(100), []) as AiRow[]
    },
  })

  const targets = table === "sectors" ? (sectors.data ?? []).map((s) => ({ id: s.id, name: s.name })) : table === "buildings" ? (buildings.data ?? []).map((b) => ({ id: b.id, name: b.name })) : (services.data ?? []).map((s) => ({ id: s.id, name: s.name }))
  const nameOf = (row: AiRow) => [...(sectors.data ?? []), ...(buildings.data ?? []), ...(services.data ?? [])].find((x) => x.id === row.target_id)?.name ?? "—"
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["ai-content"] })

  const propose = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase")
      const target = targets.find((t) => t.id === targetId)
      if (!target) throw new Error(tx("Choisissez un élément.", "Choose an item."))
      const description = generateDescription(table, target.name)
      if (!isValidDescription(description)) throw new Error("Invalid")
      const { error } = await supabase.rpc("propose_ai_content", { p_target_table: table, p_target_id: target.id, p_model: "local-template-v1", p_description: description })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Proposition créée (en attente de validation).", "Proposal created (awaiting validation).")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const review = useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.rpc("apply_ai_content", { p_id: input.id, p_approve: input.approve })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Décision enregistrée.", "Decision saved."))
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ["sectors"] })
      await queryClient.invalidateQueries({ queryKey: ["buildings"] })
      await queryClient.invalidateQueries({ queryKey: ["services"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const rebuild = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase")
      const { data, error } = await supabase.rpc("rebuild_knowledge_base")
      if (error) throw new Error(error.message)
      return data as number
    },
    onSuccess: (n) => toast.success(tx(`Base de connaissances reconstruite (${n} changement(s)).`, `Knowledge base rebuilt (${n} change(s)).`)),
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-5xl">
      <title>{tx("Contenu généré par IA", "AI-generated content")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Contenu généré par IA", "AI-generated content")} description={tx("Aucun contenu généré n'est publié sans validation humaine. Chaque proposition conserve son modèle et sa version.", "No generated content is published without human validation. Each proposal keeps its model and version.")} actions={<Button variant="outline" disabled={rebuild.isPending} onClick={() => rebuild.mutate()}>{tx("Reconstruire la base du chatbot", "Rebuild the chatbot knowledge base")}</Button>} />

      <section aria-labelledby="propose" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <h2 id="propose" className="sr-only">{tx("Nouvelle proposition", "New proposal")}</h2>
        <div className="grid gap-1"><label htmlFor="ai-table" className="text-sm font-medium">{tx("Type", "Type")}</label>
          <Select id="ai-table" className="w-40" value={table} onChange={(e) => { setTable(e.target.value as AiTargetTable); setTargetId("") }}><option value="sectors">{tx("Secteur", "Sector")}</option><option value="buildings">{tx("Bâtiment", "Building")}</option><option value="services">Service</option></Select></div>
        <div className="grid gap-1"><label htmlFor="ai-target" className="text-sm font-medium">{tx("Élément", "Item")}</label>
          <Select id="ai-target" className="w-64" value={targetId} onChange={(e) => setTargetId(e.target.value)}><option value="">—</option>{targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
        <Button disabled={!targetId || propose.isPending} onClick={() => propose.mutate()}>{tx("Proposer une description", "Propose a description")}</Button>
      </section>

      <DataState data={rows.data} isLoading={rows.isLoading} error={rows.error} onRetry={() => void rows.refetch()} emptyTitle={tx("Aucune proposition", "No proposal")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((row) => (
              <li key={row.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{row.target_table} · {nameOf(row)}</p>
                  <StatusBadge kind="validation" value={row.status} />
                </div>
                <p className="mt-2 text-sm">{row.payload.description}</p>
                <p className="mt-1 text-xs text-muted-foreground"><Badge variant="outline">{row.model} · {row.prompt_version}</Badge> {formatDateTime(row.created_at, tag)}</p>
                {row.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, approve: true })}>{tx("Valider et appliquer", "Approve & apply")}</Button>
                    <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, approve: false })}>{tx("Rejeter", "Reject")}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}

interface AuditRow {
  id: string
  actor_id: string | null
  actor_type: string
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string | null
  created_at: string
}

/** Clés dont la valeur diffère entre l'ancienne et la nouvelle version (résumé lisible d'un changement). */
export function changedKeys(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null): string[] {
  const keys = new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})])
  return [...keys].filter((key) => key !== "updated_at" && JSON.stringify(oldValue?.[key]) !== JSON.stringify(newValue?.[key]))
}

const PAGE_SIZE = 25

/** Journal d'audit en lecture seule : qui, quoi, sur quel objet, quand, ancienne et nouvelle valeur. */
export function AdminAuditPage() {
  const { tx, tag } = useLocale()
  const [entity, setEntity] = useState("")
  const [page, setPage] = useState(1)

  const rows = useQuery({
    queryKey: ["audit", entity, page],
    queryFn: async (): Promise<AuditRow[]> => {
      if (!supabase) return []
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      if (entity) query = query.eq("entity_type", entity)
      return unwrap(await query, []) as AuditRow[]
    },
  })

  const hasNext = (rows.data?.length ?? 0) > PAGE_SIZE
  const visible = (rows.data ?? []).slice(0, PAGE_SIZE)

  return (
    <Container className="max-w-6xl">
      <title>{tx("Journal d'audit", "Audit log")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Journal d'audit", "Audit log")} description={tx("Les actions sensibles sont enregistrées automatiquement et ne peuvent pas être modifiées.", "Sensitive actions are recorded automatically and cannot be edited.")} />
      <div className="mb-4 max-w-xs">
        <label htmlFor="audit-entity" className="mb-1 block text-sm font-medium">{tx("Objet", "Object")}</label>
        <Select id="audit-entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1) }}>
          <option value="">{tx("Tous", "All")}</option>
          {["profiles", "citizens", "service_members", "role_permissions", "services", "news", "requests", "reports"].map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>
      <DataState data={visible} isLoading={rows.isLoading} error={rows.error} onRetry={() => void rows.refetch()} emptyTitle={tx("Aucune entrée", "No entry")}>
        {(items) => (
          <>
            <ul className="grid gap-2">
              {items.map((row) => (
                <li key={row.id} className="rounded-lg border bg-card p-3 text-sm">
                  <p><Badge variant="secondary">{row.action}</Badge> <strong>{row.entity_type}</strong> <span className="font-mono text-xs text-muted-foreground">{row.entity_id?.slice(0, 8)}</span> · {row.actor_type} · {formatDateTime(row.created_at, tag)}</p>
                  {changedKeys(row.old_value, row.new_value).length > 0 && (
                    <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                      {changedKeys(row.old_value, row.new_value).slice(0, 6).map((key) => (
                        <li key={key}><code>{key}</code> : {JSON.stringify(row.old_value?.[key] ?? null)} → {JSON.stringify(row.new_value?.[key] ?? null)}</li>
                      ))}
                    </ul>
                  )}
                  {row.reason && <p className="mt-1 text-xs">{row.reason}</p>}
                </li>
              ))}
            </ul>
            <Pagination className="mt-4" page={page} pageCount={hasNext ? page + 1 : page} onPageChange={setPage} />
          </>
        )}
      </DataState>
    </Container>
  )
}
