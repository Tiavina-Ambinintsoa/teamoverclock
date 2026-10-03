import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import type { Service } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import type { ServiceStatus } from "@/lib/types"

const STATUSES: ServiceStatus[] = ["open", "temporarily_closed", "suspended", "hidden"]

/** Pur : colonnes à mettre à jour pour publier / masquer un service (un service masqué n'est pas public). */
export function publicationPatch(status: ServiceStatus, wasPublishedAt: string | null, now: Date = new Date()) {
  if (status === "hidden") return { status, published_at: null }
  return { status, published_at: wasPublishedAt ?? now.toISOString() }
}

/** D05 — gestion des services : modifier les informations, changer l'état, publier ou masquer. */
export function ServicesManager({ scope }: { scope: "all" | "mine" }) {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const [editing, setEditing] = useState<Service | null>(null)

  const visible = (services.data ?? []).filter((s) => scope === "all" || user?.serviceIds.includes(s.id))

  const save = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("services").update({ ...input.patch, last_updated_by: user.id }).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Service mis à jour.", "Service updated."))
      await queryClient.invalidateQueries({ queryKey: ["services"] })
      await queryClient.invalidateQueries({ queryKey: ["service"] })
      setEditing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-5xl">
      <title>{tx("Gestion des services", "Service management")}</title>
      <PageHeader
        eyebrow={scope === "all" ? tx("Administration", "Administration") : tx("Espace agent", "Agent workspace")}
        title={tx("Gestion des services", "Service management")}
        description={tx("Un service masqué n'est plus visible du public. Les changements sont journalisés.", "A hidden service is no longer visible to the public. Changes are logged.")}
      />
      <DataState data={visible} isLoading={services.isLoading} error={services.error} onRetry={() => void services.refetch()} emptyTitle={tx("Aucun service", "No service")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.category} · {s.published_at ? tx("publié", "published") : tx("non publié", "unpublished")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge kind="service" value={s.status} />
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>{tx("Modifier", "Edit")}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {editing && <ServiceDialog service={editing} busy={save.isPending} onClose={() => setEditing(null)} onSave={(patch) => save.mutate({ id: editing.id, patch })} />}
    </Container>
  )
}

function ServiceDialog({ service, busy, onClose, onSave }: { service: Service; busy: boolean; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const { tx } = useLocale()
  const [name, setName] = useState(service.name)
  const [description, setDescription] = useState(service.description ?? "")
  const [phone, setPhone] = useState(service.phone ?? "")
  const [email, setEmail] = useState(service.email ?? "")
  const [status, setStatus] = useState<ServiceStatus>(service.status)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service.name}</DialogTitle>
          <DialogDescription>{tx("Modifiez les informations affichées au public.", "Edit the information shown to the public.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label htmlFor="s-name">{tx("Nom", "Name")}</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="s-desc">Description</Label><Textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label htmlFor="s-phone">{tx("Téléphone", "Phone")}</Label><Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="grid gap-1"><Label htmlFor="s-email">E-mail</Label><Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="s-status">{tx("État", "State")}</Label>
            <Select id="s-status" value={status} onChange={(e) => setStatus(e.target.value as ServiceStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Button disabled={busy || name.trim().length < 2} onClick={() => onSave({ name: name.trim(), description: description.trim() || null, phone: phone.trim() || null, email: email.trim() || null, ...publicationPatch(status, service.published_at) })}>
            {tx("Enregistrer", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
