import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { HeatAlertCreateDialog } from "@/features/admin/heat-alert-create-dialog"
import type { DangerRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { uniqueSlug } from "@/lib/slug"
import { supabase } from "@/lib/supabase"
import type { DangerSeverity } from "@/lib/types"

const SEVERITIES: DangerSeverity[] = ["info", "low", "moderate", "high", "extreme"]

/** Une alerte ne peut être activée que si elle a un responsable ; la validation est horodatée (contrainte SQL). */
export function activationPatch(userId: string, responsibleServiceId: string | null, now: Date = new Date()) {
  if (!responsibleServiceId) return null
  return { status: "active", validated_by: userId, validated_at: now.toISOString() }
}

/** Gestion des dangers (administrateur) : brouillon → activation validée → archivage. */
export function DangersManager() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const [creating, setCreating] = useState(false)

  const dangers = useQuery({
    queryKey: ["manage-dangers"],
    queryFn: async (): Promise<DangerRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("dangers").select("*").order("valid_from", { ascending: false }), []) as DangerRow[]
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["manage-dangers"] })
    await queryClient.invalidateQueries({ queryKey: ["dangers"] })
  }

  const change = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("dangers").update(input.patch).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Alerte mise à jour.", "Alert updated.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const create = useMutation({
    mutationFn: async (input: { title: string; summary: string; severity: DangerSeverity; serviceId: string }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("dangers").insert({
        slug: uniqueSlug(input.title), title: input.title, summary: input.summary, severity: input.severity,
        responsible_service_id: input.serviceId || null, status: "draft", is_fictional_alert: true,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { setCreating(false); toast.success(tx("Brouillon créé.", "Draft created.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const activate = (d: DangerRow) => {
    const patch = user ? activationPatch(user.id, d.responsible_service_id) : null
    if (!patch) return toast.error(tx("Attribuez d'abord un service responsable.", "Assign a responsible service first."))
    change.mutate({ id: d.id, patch })
  }

  return (
    <Container className="max-w-5xl">
      <title>{tx("Dangers", "Dangers")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Dangers et protocoles", "Dangers & protocols")} description={tx("Chaque procédure a un responsable et une date de validation. Les anciennes alertes sont archivées.", "Every procedure has an owner and a validation date. Old alerts are archived.")} actions={<div className="flex flex-wrap gap-2">{user?.isAdmin && <HeatAlertCreateDialog />}<Button onClick={() => setCreating(true)}>{tx("Nouvelle alerte", "New alert")}</Button></div>} />
      <DataState data={dangers.data} isLoading={dangers.isLoading} error={dangers.error} onRetry={() => void dangers.refetch()} emptyTitle={tx("Aucune alerte", "No alert")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0"><p className="font-medium">{d.title}</p><p className="text-sm text-muted-foreground">v{d.procedure_version} · {services.data?.find((s) => s.id === d.responsible_service_id)?.name ?? tx("sans responsable", "no owner")}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="severity" value={d.severity} /><StatusBadge kind="danger" value={d.status} />
                  {d.status !== "active" && d.status !== "archived" && <Button size="sm" disabled={change.isPending} onClick={() => activate(d)}>{tx("Valider et activer", "Validate & activate")}</Button>}
                  {d.status === "active" && <Button size="sm" variant="outline" disabled={change.isPending} onClick={() => change.mutate({ id: d.id, patch: { status: "archived", valid_until: new Date().toISOString() } })}>{tx("Clôturer (archiver)", "Close (archive)")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {creating && <CreateDialog services={services.data ?? []} busy={create.isPending} onClose={() => setCreating(false)} onCreate={(v) => create.mutate(v)} />}
    </Container>
  )
}

function CreateDialog({ services, busy, onClose, onCreate }: { services: { id: string; name: string }[]; busy: boolean; onClose: () => void; onCreate: (v: { title: string; summary: string; severity: DangerSeverity; serviceId: string }) => void }) {
  const { tx } = useLocale()
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [severity, setSeverity] = useState<DangerSeverity>("moderate")
  const [serviceId, setServiceId] = useState("")
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tx("Nouvelle alerte", "New alert")}</DialogTitle><DialogDescription>{tx("Elle reste en brouillon jusqu'à validation.", "It stays a draft until validated.")}</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label htmlFor="d-title">{tx("Titre", "Title")}</Label><Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="d-sum">{tx("Résumé", "Summary")}</Label><Textarea id="d-sum" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="d-sev">{tx("Gravité", "Severity")}</Label><Select id="d-sev" value={severity} onChange={(e) => setSeverity(e.target.value as DangerSeverity)}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></div>
          <div className="grid gap-1"><Label htmlFor="d-svc">{tx("Service responsable", "Responsible service")}</Label><Select id="d-svc" value={serviceId} onChange={(e) => setServiceId(e.target.value)}><option value="">—</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
          <Button disabled={busy || title.trim().length < 3 || summary.trim().length < 3} onClick={() => onCreate({ title: title.trim(), summary: summary.trim(), severity, serviceId })}>{tx("Créer le brouillon", "Create draft")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
