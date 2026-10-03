import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { HexMap } from "@/features/map/hex-map"
import { useAuth } from "@/features/auth/auth-context"
import { useBuildings, useSectors } from "@/features/city/city-queries"
import type { Building, BuildingStatus, HealthFacilityType, Sector, Service } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const FACILITY_TYPES: HealthFacilityType[] = ["hospital", "clinic", "pharmacy", "dentist", "laboratory"]
const BUILDING_STATUSES: BuildingStatus[] = ["operational", "temporarily_closed", "under_maintenance", "restricted"]

interface FacilityDraft {
  name: string
  facility_type: HealthFacilityType
  sector_id: string
  x: number
  y: number
  address: string
  status: BuildingStatus
  description: string
  capabilities: string
  opening_hours: string
  contact_phone: string
  contact_email: string
}

function draftFromBuilding(building: Building): FacilityDraft {
  return {
    name: building.name,
    facility_type: building.facility_type ?? "clinic",
    sector_id: building.sector_id,
    x: building.x,
    y: building.y,
    address: building.address ?? "",
    status: building.status,
    description: building.description ?? "",
    capabilities: (building.capabilities ?? []).join(", "),
    opening_hours: Object.entries(building.opening_hours ?? {}).map(([day, hours]) => `${day}: ${hours}`).join("\n"),
    contact_phone: building.contact_phone ?? "",
    contact_email: building.contact_email ?? "",
  }
}

function parseOpeningHours(value: string): Record<string, string> {
  return Object.fromEntries(
    value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.indexOf(":")
      if (separator < 1 || !line.slice(separator + 1).trim()) {
        throw new Error("Enter opening hours one per line as day: hours.")
      }
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
    })
  )
}

function FacilityForm({
  sectors,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  sectors: Sector[]
  initial: FacilityDraft
  busy: boolean
  onCancel: () => void
  onSave: (draft: FacilityDraft) => void
}) {
  const { tx } = useLocale()
  const [draft, setDraft] = useState(initial)
  const update = <K extends keyof FacilityDraft>(key: K, value: FacilityDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(draft)
      }}
    >
      <h3 className="font-semibold">{initial.name ? tx("Modifier l'établissement", "Edit facility") : tx("Nouvel établissement", "New facility")}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1"><Label htmlFor="facility-name">{tx("Nom", "Name")}</Label><Input id="facility-name" required value={draft.name} onChange={(e) => update("name", e.target.value)} /></div>
        <div className="grid gap-1"><Label htmlFor="facility-type">{tx("Type", "Type")}</Label><Select id="facility-type" value={draft.facility_type} onChange={(e) => update("facility_type", e.target.value as HealthFacilityType)}>{FACILITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</Select></div>
        <div className="grid gap-1"><Label htmlFor="facility-sector">{tx("Secteur", "Sector")}</Label><Select id="facility-sector" required value={draft.sector_id} onChange={(e) => {
          const sector = sectors.find((item) => item.id === e.target.value)
          if (sector) setDraft((current) => ({ ...current, sector_id: sector.id, x: sector.x, y: sector.y }))
        }}>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.code} · {sector.name}</option>)}</Select></div>
        <div className="grid gap-1"><Label htmlFor="facility-status">{tx("État", "Status")}</Label><Select id="facility-status" value={draft.status} onChange={(e) => update("status", e.target.value as BuildingStatus)}>{BUILDING_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</Select></div>
        <div className="grid gap-1"><Label htmlFor="facility-x">{tx("Position X sur la carte", "Map X position")}</Label><Input id="facility-x" type="number" required value={draft.x} onChange={(e) => update("x", Number(e.target.value))} /></div>
        <div className="grid gap-1"><Label htmlFor="facility-y">{tx("Position Y sur la carte", "Map Y position")}</Label><Input id="facility-y" type="number" required value={draft.y} onChange={(e) => update("y", Number(e.target.value))} /></div>
        <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-address">{tx("Adresse", "Address")}</Label><Input id="facility-address" value={draft.address} onChange={(e) => update("address", e.target.value)} /></div>
        <div className="grid gap-1"><Label htmlFor="facility-phone">{tx("Téléphone", "Phone")}</Label><Input id="facility-phone" type="tel" value={draft.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} /></div>
        <div className="grid gap-1"><Label htmlFor="facility-email">Email</Label><Input id="facility-email" type="email" value={draft.contact_email} onChange={(e) => update("contact_email", e.target.value)} /></div>
        <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-capabilities">{tx("Soins et spécialités (séparés par des virgules)", "Care and specialties (comma-separated)")}</Label><Input id="facility-capabilities" value={draft.capabilities} onChange={(e) => update("capabilities", e.target.value)} /></div>
        <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-hours">{tx("Horaires (un par ligne, jour: heures)", "Opening hours (one per line, day: hours)")}</Label><Textarea id="facility-hours" value={draft.opening_hours} onChange={(e) => update("opening_hours", e.target.value)} placeholder="Mon-Fri: 08:00-18:00" /></div>
        <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-description">{tx("Informations", "Information")}</Label><Textarea id="facility-description" value={draft.description} onChange={(e) => update("description", e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !draft.sector_id}>{tx("Enregistrer", "Save")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>{tx("Annuler", "Cancel")}</Button>
      </div>
    </form>
  )
}

function emptyDraft(sectors: Sector[]): FacilityDraft {
  const sector = sectors[0]
  return {
    name: "",
    facility_type: "clinic",
    sector_id: sector?.id ?? "",
    x: sector?.x ?? 0,
    y: sector?.y ?? 0,
    address: "",
    status: "operational",
    description: "",
    capabilities: "",
    opening_hours: "",
    contact_phone: "",
    contact_email: "",
  }
}

export function HealthFacilitiesSection({ service }: { service: Service }) {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const buildingsQuery = useBuildings()
  const sectorsQuery = useSectors()
  const [view, setView] = useState<"list" | "map">("list")
  const [editing, setEditing] = useState<Building | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sectors = sectorsQuery.data ?? []
  const facilities = useMemo(
    () => (buildingsQuery.data ?? []).filter((building) => building.service_id === service.id && building.facility_type),
    [buildingsQuery.data, service.id]
  )

  const manager = useQuery({
    queryKey: ["health-service-manager", service.id, user?.id],
    enabled: Boolean(user && !user.isAdmin && supabase),
    queryFn: async () => {
      if (!user || !supabase) return false
      const { data, error } = await supabase.from("service_members").select("id")
        .eq("profile_id", user.id).eq("service_id", service.id).eq("member_role", "admin")
        .is("revoked_at", null).maybeSingle()
      if (error) throw new Error(error.message)
      return Boolean(data)
    },
  })
  const canManage = Boolean(user?.isAdmin || manager.data)
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["buildings"] })
    await queryClient.invalidateQueries({ queryKey: ["health-service-manager", service.id] })
  }
  const save = useMutation({
    mutationFn: async ({ draft, building }: { draft: FacilityDraft; building: Building | null }) => {
      if (!supabase) throw new Error("Supabase is not configured.")
      const payload = {
        name: draft.name.trim(),
        type: "hospital" as const,
        sector_id: draft.sector_id,
        x: draft.x,
        y: draft.y,
        address: draft.address.trim() || null,
        status: draft.status,
        description: draft.description.trim() || null,
        service_id: service.id,
        facility_type: draft.facility_type,
        capabilities: draft.capabilities.split(",").map((item) => item.trim()).filter(Boolean),
        opening_hours: parseOpeningHours(draft.opening_hours),
        contact_phone: draft.contact_phone.trim() || null,
        contact_email: draft.contact_email.trim() || null,
      }
      const result = building
        ? await supabase.from("buildings").update(payload).eq("id", building.id)
        : await supabase.from("buildings").insert(payload)
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Établissement enregistré.", "Facility saved."))
      await invalidate()
      setEditing(null)
      setCreating(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const remove = useMutation({
    mutationFn: async (building: Building) => {
      if (!supabase) throw new Error("Supabase is not configured.")
      const { error } = await supabase.from("buildings").delete().eq("id", building.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Établissement supprimé.", "Facility deleted."))
      await invalidate()
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section className="mt-10 border-t pt-8" aria-labelledby="health-facilities">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{tx("Réseau de santé", "Health network")}</p>
          <h2 id="health-facilities" className="font-display text-2xl font-semibold">{tx("Établissements de santé", "Health facilities")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tx("Hôpitaux, cliniques, pharmacies, dentistes et laboratoires de Nova Terra.", "Hospitals, clinics, pharmacies, dentists and laboratories across Nova Terra.")}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant={view === "list" ? "default" : "outline"} aria-pressed={view === "list"} onClick={() => setView("list")}>{tx("Liste", "List")}</Button>
          <Button type="button" variant={view === "map" ? "default" : "outline"} aria-pressed={view === "map"} onClick={() => setView("map")}>{tx("Carte", "Map")}</Button>
          {canManage && <Button type="button" onClick={() => { setEditing(null); setCreating(true) }}><Plus aria-hidden />{tx("Ajouter", "Add facility")}</Button>}
        </div>
      </header>

      {canManage && creating && <div className="mb-5"><FacilityForm sectors={sectors} initial={emptyDraft(sectors)} busy={save.isPending} onCancel={() => setCreating(false)} onSave={(draft) => save.mutate({ draft, building: null })} /></div>}
      {canManage && editing && <div className="mb-5"><FacilityForm sectors={sectors} initial={draftFromBuilding(editing)} busy={save.isPending} onCancel={() => setEditing(null)} onSave={(draft) => save.mutate({ draft, building: editing })} /></div>}

      <DataState
        data={facilities}
        isLoading={buildingsQuery.isLoading || sectorsQuery.isLoading || (Boolean(user) && manager.isLoading)}
        error={buildingsQuery.error ?? sectorsQuery.error ?? manager.error}
        onRetry={() => { void buildingsQuery.refetch(); void sectorsQuery.refetch(); void manager.refetch() }}
        emptyTitle={tx("Aucun établissement de santé", "No health facilities yet")}
        emptyDescription={tx("Les établissements seront affichés ici dès qu'ils seront ajoutés.", "Facilities will appear here once added.")}
      >
        {(items) => view === "list" ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((building) => {
              const sector = sectors.find((item) => item.id === building.sector_id)
              return (
                <li key={building.id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{building.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />{sector ? `${sector.code} · ${sector.name}` : ""}{building.address ? ` · ${building.address}` : ""}</p>
                    </div>
                    <Badge variant="secondary">{building.facility_type}</Badge>
                  </div>
                  <p className="mt-3 text-sm">{building.description || tx("Aucune description renseignée.", "No description provided.")}</p>
                  {(building.capabilities ?? []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{building.capabilities?.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}</div>}
                  <dl className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    {Object.entries(building.opening_hours ?? {}).map(([day, hours]) => <div key={day}><dt className="inline font-medium">{day}: </dt><dd className="inline">{hours}</dd></div>)}
                    {building.contact_phone && <div><dt className="inline font-medium">{tx("Téléphone", "Phone")}: </dt><dd className="inline">{building.contact_phone}</dd></div>}
                    {building.contact_email && <div><dt className="inline font-medium">Email: </dt><dd className="inline">{building.contact_email}</dd></div>}
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Badge variant={building.status === "operational" ? "default" : "outline"}>{building.status.replaceAll("_", " ")}</Badge>
                    {canManage && <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setCreating(false); setEditing(building) }}><Pencil aria-hidden />{tx("Modifier", "Edit")}</Button>
                      <Button type="button" size="sm" variant="destructive" disabled={remove.isPending || building.id === service.building_id} title={building.id === service.building_id ? tx("L'établissement principal du service ne peut pas être supprimé.", "The service's primary location cannot be deleted.") : undefined} onClick={() => {
                        if (window.confirm(tx(`Supprimer ${building.name} ?`, `Delete ${building.name}?`))) remove.mutate(building)
                      }}><Trash2 aria-hidden />{tx("Supprimer", "Delete")}</Button>
                    </div>}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <HexMap
              sectors={sectors}
              buildings={items}
              transports={[]}
              layers={{ sectors: true, buildings: true, transports: false, dangers: false, reports: false, observations: false }}
              selected={selectedId ? { type: "building", id: selectedId } : null}
              onSelect={(selection) => setSelectedId(selection?.type === "building" ? selection.id : null)}
            />
            <aside className="rounded-xl border bg-card p-4" aria-live="polite">
              <h3 className="font-semibold">{tx("Établissements sur la carte", "Facilities on the map")}</h3>
              <ul className="mt-3 grid gap-2">
                {items.map((building) => <li key={building.id}>
                  <button type="button" className="w-full rounded-lg border p-3 text-left hover:bg-accent" aria-pressed={selectedId === building.id} onClick={() => setSelectedId(building.id)}>
                    <span className="block font-medium">{building.name}</span>
                    <span className="text-sm text-muted-foreground">{building.facility_type} · {sectors.find((sector) => sector.id === building.sector_id)?.code}</span>
                  </button>
                </li>)}
              </ul>
            </aside>
          </div>
        )}
      </DataState>
    </section>
  )
}
