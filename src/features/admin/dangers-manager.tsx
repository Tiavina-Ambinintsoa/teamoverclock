import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { HeatAlertCreateDialog } from "@/features/admin/heat-alert-create-dialog"
import { DangerForm } from "@/features/admin/danger-form"
import { buildDangerPayload, dangerRowToFormValues, emptyDangerFormValues, type DangerFormValues } from "@/features/admin/danger-form-helpers"
import { useBuildings, useSectors, useServices } from "@/features/city/city-queries"
import type { DangerRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

/** Une alerte ne peut être activée que si elle a un responsable ; la validation est horodatée (contrainte SQL). */
export function activationPatch(userId: string, responsibleServiceId: string | null, now: Date = new Date()) {
  if (!responsibleServiceId) return null
  return { status: "active", validated_by: userId, validated_at: now.toISOString() }
}

type EditingState = { mode: "create" } | { mode: "edit"; danger: DangerRow }

/** Gestion des dangers pour l'administration générale et les équipes de service. */
export function DangersManager() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const sectors = useSectors()
  const buildings = useBuildings()
  const [editing, setEditing] = useState<EditingState | null>(null)

  const dangers = useQuery({
    queryKey: ["manage-dangers"],
    queryFn: async (): Promise<DangerRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("dangers").select("*").order("valid_from", { ascending: false }), []) as DangerRow[]
    },
  })

  const manageableServices = useMemo(() => {
    if (user?.isAdmin) return services.data ?? []
    const allowedIds = new Set([...(user?.serviceIds ?? []), ...(user?.validatorServiceIds ?? [])])
    return (services.data ?? []).filter((service) => allowedIds.has(service.id))
  }, [services.data, user?.isAdmin, user?.serviceIds, user?.validatorServiceIds])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manage-dangers"] }),
      queryClient.invalidateQueries({ queryKey: ["dangers"] }),
      queryClient.invalidateQueries({ queryKey: ["critical-alerts", "dangers"] }),
    ])
  }

  const change = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("dangers").update(input.patch).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Alerte mise à jour.", "Alert updated."))
      setEditing(null)
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("dangers").insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Brouillon créé.", "Draft created."))
      setEditing(null)
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const submit = (values: DangerFormValues, action: "save" | "activate") => {
    const existing = editing?.mode === "edit" ? editing.danger : null
    const payload = buildDangerPayload(values, existing)
    const activation = action === "activate" && user ? activationPatch(user.id, payload.responsible_service_id) : null
    if (action === "activate" && !activation) {
      toast.error(tx("Attribuez d'abord un service responsable.", "Assign a responsible service first."))
      return
    }
    const patch: Record<string, unknown> = activation ? { ...payload, ...activation } : payload

    if (existing) {
      change.mutate({ id: existing.id, patch })
      return
    }

    create.mutate(activation ? { ...patch, status: "active" } : patch)
  }

  const activate = (danger: DangerRow) => {
    const patch = user ? activationPatch(user.id, danger.responsible_service_id) : null
    if (!patch) {
      toast.error(tx("Attribuez d'abord un service responsable.", "Assign a responsible service first."))
      return
    }
    change.mutate({ id: danger.id, patch })
  }

  const items = dangers.data ?? []
  const eyebrow = user?.isAdmin ? tx("Administration", "Administration") : tx("Espace agent", "Agent workspace")
  const title = user?.isAdmin ? tx("Dangers et protocoles", "Dangers & protocols") : tx("Mes dangers et protocoles", "My dangers & protocols")
  const description = user?.isAdmin
    ? tx("Chaque procédure a un responsable et une date de validation. Les anciennes alertes sont archivées.", "Every procedure has an owner and a validation date. Old alerts are archived.")
    : tx("Créez, activez et mettez à jour les protocoles de votre périmètre de service.", "Create, activate, and update protocols for your service scope.")
  const editingValues = editing?.mode === "edit" ? dangerRowToFormValues(editing.danger) : emptyDangerFormValues()

  return (
    <Container className="max-w-6xl">
      <title>{tx("Dangers", "Dangers")}</title>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            {user?.isAdmin && <HeatAlertCreateDialog />}
            <Button onClick={() => setEditing({ mode: "create" })}>{tx("Nouvelle alerte", "New alert")}</Button>
          </div>
        }
      />
      <DataState data={items} isLoading={dangers.isLoading} error={dangers.error} onRetry={() => void dangers.refetch()} emptyTitle={tx("Aucune alerte", "No alert")}>
        {(rows) => (
          <ul className="grid gap-3">
            {rows.map((danger) => (
              <li key={danger.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{danger.title}</p>
                    <p className="text-sm text-muted-foreground">
                      v{danger.procedure_version} · {services.data?.find((service) => service.id === danger.responsible_service_id)?.name ?? tx("sans responsable", "no owner")}
                    </p>
                    <p className="text-sm text-muted-foreground">{danger.summary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge kind="severity" value={danger.severity} />
                    <StatusBadge kind="danger" value={danger.status} />
                    <Button size="sm" variant="outline" onClick={() => setEditing({ mode: "edit", danger })}>{tx("Modifier", "Edit")}</Button>
                    {danger.status !== "active" && danger.status !== "archived" && (
                      <Button size="sm" disabled={change.isPending} onClick={() => activate(danger)}>
                        {tx("Valider et activer", "Validate & activate")}
                      </Button>
                    )}
                    {danger.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={change.isPending}
                        onClick={() => change.mutate({ id: danger.id, patch: { status: "archived", valid_until: new Date().toISOString() } })}
                      >
                        {tx("Clôturer (archiver)", "Close (archive)")}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>

      {editing && (
        <DangerForm
          key={editing.mode === "edit" ? editing.danger.id : "create"}
          open
          busy={create.isPending || change.isPending}
          title={editing.mode === "edit" ? tx("Modifier l'alerte", "Edit alert") : tx("Nouvelle alerte", "New alert")}
          description={editing.mode === "edit"
            ? tx("Mettez à jour le protocole complet. Une alerte active publie automatiquement une nouvelle version.", "Update the full protocol. Editing an active alert automatically publishes a new version.")
            : tx("Créez le protocole complet, puis activez-le quand il est prêt.", "Create the full protocol, then activate it when it is ready.")}
          services={manageableServices}
          sectors={sectors.data ?? []}
          buildings={buildings.data ?? []}
          initialValues={editingValues}
          existingStatus={editing.mode === "edit" ? editing.danger.status : "draft"}
          onClose={() => setEditing(null)}
          onSubmit={submit}
        />
      )}
    </Container>
  )
}
