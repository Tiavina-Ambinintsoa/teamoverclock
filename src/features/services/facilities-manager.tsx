import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBuildings, useSectors } from "@/features/city/city-queries"
import type { Building, BuildingType, FacilityType, Service } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { BUILDING_TYPE_LABELS, FACILITY_TYPE_LABELS, pickLabel, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

const FACILITY_TYPES: FacilityType[] = [
  "hospital", "pharmacy", "dentist", "clinic", "care_center", "administrative_office",
  "police_station", "fire_station", "service_center", "utility_center", "mobility_hub",
  "environment_center", "school", "other",
]
const BUILDING_TYPES: BuildingType[] = [
  "administrative", "residential", "hospital", "school", "security",
  "industrial", "energy", "telecom", "public_place", "transport_hub",
]
const BUILDING_STATUSES: Building["status"][] = ["operational", "temporarily_closed", "under_maintenance", "restricted"]

function isOpeningHours(value: unknown): value is Record<string, string> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
}

export function FacilitiesManager({ service }: { service: Service }) {
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const buildings = useBuildings({ serviceId: service.id })
  const [editing, setEditing] = useState<Building | null>(null)
  const [adding, setAdding] = useState(false)

  const save = useMutation({
    mutationFn: async (input: { id?: string; values: FacilityValues }) => {
      if (!supabase) throw new Error("Supabase is not configured.")
      const operation = input.id
        ? supabase.from("buildings").update(input.values).eq("id", input.id)
        : supabase.from("buildings").insert({ ...input.values, service_id: service.id })
      const { error } = await operation
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Établissement enregistré.", "Facility saved."))
      await queryClient.invalidateQueries({ queryKey: ["buildings"] })
      setEditing(null)
      setAdding(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase is not configured.")
      const { error } = await supabase.from("buildings").delete().eq("id", id).eq("service_id", service.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Établissement supprimé.", "Facility deleted."))
      await queryClient.invalidateQueries({ queryKey: ["buildings"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section className="mt-4 rounded-lg border p-4" aria-label={tx(`Établissements de ${service.name}`, `Facilities for ${service.name}`)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{tx("Établissements rattachés", "Assigned facilities")}</h3>
        <Button size="sm" onClick={() => setAdding(true)}>{tx("Ajouter un établissement", "Add facility")}</Button>
      </div>
      <DataState
        data={buildings.data}
        isLoading={buildings.isLoading}
        error={buildings.error}
        onRetry={() => void buildings.refetch()}
        emptyTitle={tx("Aucun établissement rattaché", "No assigned facilities")}
      >
        {(items) => (
          <ul className="grid gap-2">
            {items.map((building) => (
              <li key={building.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{building.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {building.facility_type ? pickLabel(FACILITY_TYPE_LABELS, building.facility_type, locale) : ""}
                    {building.address ? ` · ${building.address}` : ""}
                  </p>
                  {(building.offerings ?? []).length > 0 && <p className="mt-1 text-xs text-muted-foreground">{(building.offerings ?? []).join(" · ")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge kind="building" value={building.status} />
                  <Button size="sm" variant="outline" onClick={() => setEditing(building)}>{tx("Modifier", "Edit")}</Button>
                  <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => {
                    if (window.confirm(tx("Supprimer cet établissement ?", "Delete this facility?"))) remove.mutate(building.id)
                  }}>{tx("Supprimer", "Delete")}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {(adding || editing) && (
        <FacilityDialog
          key={editing?.id ?? "new"}
          building={editing}
          service={service}
          sectors={sectors.data ?? []}
          busy={save.isPending}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={(values) => save.mutate({ ...(editing ? { id: editing.id } : {}), values })}
        />
      )}
    </section>
  )
}

type FacilityValues = {
  name: string
  type: BuildingType
  facility_type: FacilityType
  sector_id: string
  x: number
  y: number
  address: string | null
  phone: string | null
  email: string | null
  opening_hours: Record<string, string>
  accessibility: Record<string, boolean>
  status: Building["status"]
  description: string | null
  offerings: string[]
}

function FacilityDialog({
  building, service, sectors, busy, onClose, onSave,
}: {
  building: Building | null
  service: Service
  sectors: ReturnType<typeof useSectors>["data"]
  busy: boolean
  onClose: () => void
  onSave: (values: FacilityValues) => void
}) {
  const { tx, locale } = useLocale()
  const firstSector = sectors?.[0]
  const [name, setName] = useState(building?.name ?? "")
  const [type, setType] = useState<BuildingType>(building?.type ?? "public_place")
  const [facilityType, setFacilityType] = useState<FacilityType>(building?.facility_type ?? "other")
  const [sectorId, setSectorId] = useState(building?.sector_id ?? firstSector?.id ?? "")
  const [x, setX] = useState(String(building?.x ?? firstSector?.x ?? 0))
  const [y, setY] = useState(String(building?.y ?? firstSector?.y ?? 0))
  const [address, setAddress] = useState(building?.address ?? "")
  const [phone, setPhone] = useState(building?.phone ?? "")
  const [email, setEmail] = useState(building?.email ?? "")
  const [hoursJson, setHoursJson] = useState(JSON.stringify(building?.opening_hours ?? { "mon-fri": "08:00-17:00" }, null, 2))
  const [stepFree, setStepFree] = useState(building?.accessibility.step_free ?? true)
  const [hearingLoop, setHearingLoop] = useState(building?.accessibility.hearing_loop ?? false)
  const [braille, setBraille] = useState(building?.accessibility.braille ?? false)
  const [status, setStatus] = useState<Building["status"]>(building?.status ?? "operational")
  const [description, setDescription] = useState(building?.description ?? "")
  const [offeringsText, setOfferingsText] = useState((building?.offerings ?? []).join("\n"))
  const [hoursError, setHoursError] = useState("")
  const setSector = (id: string) => {
    setSectorId(id)
    const sector = sectors?.find((item) => item.id === id)
    if (sector && !building) {
      setX(String(sector.x))
      setY(String(sector.y))
    }
  }
  const submit = () => {
    let openingHours: unknown
    try {
      openingHours = JSON.parse(hoursJson)
    } catch {
      setHoursError(tx("Le format des horaires doit être un objet JSON valide.", "Opening hours must be a valid JSON object."))
      return
    }
    if (!isOpeningHours(openingHours)) {
      setHoursError(tx("Indiquez des horaires sous forme de clés et de textes.", "Enter opening hours as key/text pairs."))
      return
    }
    setHoursError("")
    onSave({
      name: name.trim(),
      type,
      facility_type: facilityType,
      sector_id: sectorId,
      x: Number(x),
      y: Number(y),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      opening_hours: openingHours,
      accessibility: { step_free: stepFree, hearing_loop: hearingLoop, braille },
      status,
      description: description.trim() || null,
      offerings: Array.from(new Set(offeringsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{building ? tx("Modifier l'établissement", "Edit facility") : tx("Ajouter un établissement", "Add facility")}</DialogTitle>
          <DialogDescription>{service.name}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submit() }}>
          <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-name">{tx("Nom", "Name")}</Label><Input id="facility-name" required value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="facility-kind">{tx("Type d'établissement", "Facility type")}</Label><Select id="facility-kind" value={facilityType} onChange={(event) => setFacilityType(event.target.value as FacilityType)}>{FACILITY_TYPES.map((option) => <option key={option} value={option}>{pickLabel(FACILITY_TYPE_LABELS, option, locale)}</option>)}</Select></div>
          <div className="grid gap-1"><Label htmlFor="facility-building-type">{tx("Type de bâtiment", "Building type")}</Label><Select id="facility-building-type" value={type} onChange={(event) => setType(event.target.value as BuildingType)}>{BUILDING_TYPES.map((option) => <option key={option} value={option}>{pickLabel(BUILDING_TYPE_LABELS, option, locale)}</option>)}</Select></div>
          <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-address">{tx("Adresse", "Address")}</Label><Input id="facility-address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="facility-phone">{tx("Téléphone", "Phone")}</Label><Input id="facility-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="facility-email">E-mail</Label><Input id="facility-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-sector">{tx("Secteur", "Sector")}</Label><Select id="facility-sector" value={sectorId} onChange={(event) => setSector(event.target.value)}>{(sectors ?? []).map((sector) => <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>)}</Select></div>
          <div className="grid gap-1"><Label htmlFor="facility-x">X</Label><Input id="facility-x" type="number" value={x} onChange={(event) => setX(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="facility-y">Y</Label><Input id="facility-y" type="number" value={y} onChange={(event) => setY(event.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="facility-status">{tx("État", "Status")}</Label><Select id="facility-status" value={status} onChange={(event) => setStatus(event.target.value as Building["status"])}>{BUILDING_STATUSES.map((option) => <option key={option} value={option}>{statusLabel("building", option, locale)}</option>)}</Select></div>
          <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-hours">{tx("Horaires (JSON)", "Opening hours (JSON)")}</Label><Textarea id="facility-hours" rows={3} value={hoursJson} onChange={(event) => setHoursJson(event.target.value)} /><p className="text-xs text-muted-foreground">{tx('Exemple : {"mon-fri":"08:00-17:00","sat":"09:00-12:00"}', 'Example: {"mon-fri":"08:00-17:00","sat":"09:00-12:00"}')}</p>{hoursError && <p role="alert" className="text-sm text-destructive">{hoursError}</p>}</div>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="text-sm font-medium">{tx("Accessibilité", "Accessibility")}</legend>
            {([[stepFree, setStepFree, "step-free", tx("Accès sans marche", "Step-free access")], [hearingLoop, setHearingLoop, "hearing-loop", tx("Boucle auditive", "Hearing loop")], [braille, setBraille, "braille", "Braille"]] as const).map(([checked, setChecked, id, label]) => (
              <label key={id} className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />{label}</label>
            ))}
          </fieldset>
          <div className="grid gap-1 sm:col-span-2"><Label htmlFor="facility-description">{tx("Description", "Description")}</Label><Textarea id="facility-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="facility-offerings">{tx("Soins et prestations proposés", "Treatments and services offered")}</Label>
            <Textarea id="facility-offerings" rows={5} value={offeringsText} onChange={(event) => setOfferingsText(event.target.value)} placeholder={tx("Urgences\nChirurgie générale\nPédiatrie", "Emergency care\nGeneral surgery\nPediatrics")} />
            <p className="text-xs text-muted-foreground">{tx("Indiquez une prestation par ligne.", "Enter one service per line.")}</p>
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={busy || name.trim().length < 2 || !sectorId || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))}>{tx("Enregistrer", "Save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
