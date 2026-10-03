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
import { FacilitiesManager } from "@/features/services/facilities-manager"
import { ServiceAppointmentCalendar } from "@/features/services/service-appointments"
import type { Service } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import type { ServiceStatus } from "@/lib/types"
import { effectiveServiceStatus, isFutureLocalDateTime } from "@/features/services/service-availability"
import { useNow } from "@/hooks/use-now"

const STATUSES: ServiceStatus[] = ["open", "temporarily_closed", "suspended", "hidden"]
const SCHEDULE_STATUSES: Exclude<ServiceStatus, "hidden">[] = ["open", "temporarily_closed", "suspended"]

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** Pur : colonnes à mettre à jour pour publier / masquer un service (un service masqué n'est pas public). */
export function publicationPatch(status: ServiceStatus, wasPublishedAt: string | null, now: Date = new Date()) {
  if (status === "hidden") return { status, published_at: null }
  return { status, published_at: wasPublishedAt ?? now.toISOString() }
}

/** D05 — gestion des services : modifier les informations, changer l'état, publier ou masquer. */
export function ServicesManager({ scope }: { scope: "all" | "mine" }) {
  const { user } = useAuth()
  const { tx } = useLocale()
  const now = useNow(60_000)
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
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.category} · {s.published_at ? tx("publié", "published") : tx("non publié", "unpublished")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="service" value={effectiveServiceStatus(s, now)} />
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>{tx("Modifier", "Edit")}</Button>
                  </div>
                </div>
                {(scope === "all" || user?.profileRole === "service_admin") && <FacilitiesManager service={s} />}
                {(scope === "all" || user?.profileRole === "service_admin") && <ServiceAppointmentCalendar service={s} mode="manage" />}
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
  const { tx, locale } = useLocale()
  const now = useNow(60_000)
  const [name, setName] = useState(service.name)
  const [description, setDescription] = useState(service.description ?? "")
  const [phone, setPhone] = useState(service.phone ?? "")
  const [email, setEmail] = useState(service.email ?? "")
  const [status, setStatus] = useState<ServiceStatus>(effectiveServiceStatus(service))
  const [reason, setReason] = useState(service.status_reason ?? "")
  const [changeType, setChangeType] = useState<"manual" | "unexpected">(service.status_change_type === "unexpected" ? "unexpected" : "manual")
  const [reopensAt, setReopensAt] = useState(toLocalDateTimeInput(service.reopens_at))
  const [scheduledStatus, setScheduledStatus] = useState<"" | Exclude<ServiceStatus, "hidden">>(service.scheduled_status ?? "")
  const [scheduledAt, setScheduledAt] = useState(toLocalDateTimeInput(service.scheduled_at))
  const needsReason = status !== "open" || (scheduledStatus !== "" && scheduledStatus !== "open")
  const scheduleValid = !scheduledStatus || isFutureLocalDateTime(scheduledAt, now)
  const reasonValid = !needsReason || reason.trim().length >= 5
  const saveChanges = () => onSave({
    name: name.trim(),
    description: description.trim() || null,
    phone: phone.trim() || null,
    email: email.trim() || null,
    ...publicationPatch(status, service.published_at),
    status_reason: reason.trim() || null,
    status_change_type: status === "open" && scheduledStatus ? "scheduled" : changeType,
    reopens_at: reopensAt ? new Date(reopensAt).toISOString() : null,
    scheduled_status: scheduledStatus || null,
    scheduled_at: scheduledStatus && scheduledAt ? new Date(scheduledAt).toISOString() : null,
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
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
              {STATUSES.map((s) => <option key={s} value={s}>{statusLabel("service", s, locale)}</option>)}
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="s-change-type">{tx("Type de changement", "Change type")}</Label>
            <Select id="s-change-type" value={changeType} onChange={(event) => setChangeType(event.target.value as typeof changeType)}>
              <option value="manual">{tx("Mise à jour", "Manual update")}</option>
              <option value="unexpected">{tx("Fermeture imprévue", "Unexpected closure")}</option>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="s-status-reason">{tx("Explication de l'état", "Status explanation")}{needsReason ? " *" : ""}</Label>
            <Textarea id="s-status-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder={tx("Expliquez la fermeture ou le changement d'horaire.", "Explain the closure or schedule change.")} />
            {needsReason && reason.trim().length < 5 && <p className="text-xs text-destructive">{tx("Une explication de 5 caractères minimum est obligatoire.", "An explanation of at least 5 characters is required.")}</p>}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="s-reopens-at">{tx("Réouverture prévue (facultatif)", "Expected reopening (optional)")}</Label>
            <Input id="s-reopens-at" type="datetime-local" value={reopensAt} onChange={(event) => setReopensAt(event.target.value)} />
          </div>
          <fieldset className="grid gap-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">{tx("Prochain changement programmé", "Next scheduled change")}</legend>
            <div className="grid gap-1">
              <Label htmlFor="s-scheduled-status">{tx("État à appliquer", "Status to apply")}</Label>
              <Select id="s-scheduled-status" value={scheduledStatus} onChange={(event) => setScheduledStatus(event.target.value as typeof scheduledStatus)}>
                <option value="">{tx("Aucun changement programmé", "No scheduled change")}</option>
                {SCHEDULE_STATUSES.map((value) => <option key={value} value={value}>{statusLabel("service", value, locale)}</option>)}
              </Select>
            </div>
            {scheduledStatus && (
              <div className="grid gap-1">
                <Label htmlFor="s-scheduled-at">{tx("Date et heure", "Date and time")}</Label>
                <Input id="s-scheduled-at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
                {!scheduleValid && <p className="text-xs text-destructive">{tx("Choisissez une date future.", "Choose a future date.")}</p>}
              </div>
            )}
          </fieldset>
          <p className="text-xs text-muted-foreground">{tx("Un changement imprévu est signalé sur l'accueil. Un changement programmé ne prend effet qu'à la date choisie.", "Unexpected changes are highlighted on the home page. A scheduled change takes effect only at the selected time.")}</p>
          <Button disabled={busy || name.trim().length < 2 || !reasonValid || !scheduleValid || Boolean(reopensAt && !isFutureLocalDateTime(reopensAt, now))} onClick={saveChanges}>
            {tx("Enregistrer", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
