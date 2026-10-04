import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Building, DangerRow, Sector } from "@/lib/db-types"
import type { PublicReport } from "@/features/reports/report-queries"
import { useLocale } from "@/lib/locale"
import { BUILDING_TYPE_LABELS, pickLabel, REPORT_CATEGORY_LABELS, statusLabel } from "@/lib/status-labels"

export interface MapFilterState {
  buildings: boolean
  transit: boolean
  dangers: boolean
  reports: boolean
  labels: boolean
  observations: boolean
  buildingType: string
  buildingStatus: string
  reportStatuses: string[]
  reportCategory: string
  reportSearch: string
  dangerId: string
}

export const DEFAULT_FILTERS: MapFilterState = {
  buildings: true,
  transit: true,
  dangers: true,
  reports: true,
  labels: true,
  observations: false,
  buildingType: "",
  buildingStatus: "",
  reportStatuses: [],
  reportCategory: "",
  reportSearch: "",
  dangerId: "",
}

export function filterMapBuildings(buildings: Building[], f: MapFilterState): Building[] {
  if (!f.buildings) return []
  return buildings.filter((b) => (!f.buildingType || b.type === f.buildingType) && (!f.buildingStatus || b.status === f.buildingStatus))
}

export function filterMapReports(reports: PublicReport[], f: MapFilterState): PublicReport[] {
  if (!f.reports) return []
  const term = f.reportSearch.trim().toLocaleLowerCase()
  return reports.filter((r) => {
    if (f.reportStatuses.length > 0 && !f.reportStatuses.includes(r.status)) return false
    if (f.reportCategory && r.category !== f.reportCategory) return false
    if (!term) return true
    return [r.title, r.description, r.report_number].some((value) => value.toLocaleLowerCase().includes(term))
  })
}

const BUILDING_STATUS_VALUES = ["operational", "temporarily_closed", "under_maintenance", "restricted"] as const

interface MapFiltersProps {
  value: MapFilterState
  onChange: (patch: Partial<MapFilterState>) => void
  sectors: Sector[]
  activeDangers: DangerRow[]
  buildingTypes: string[]
  reportStatuses: string[]
  canSeeObservations: boolean
  selectedSectorId: string
  onFocusSector: (id: string) => void
  counts: { buildings: number; reports: number }
}

/** Couches et filtres de la carte : bâtiments, signalements, secteur et zone d'alerte. */
export function MapFilters({ value, onChange, sectors, activeDangers, buildingTypes, reportStatuses, canSeeObservations, selectedSectorId, onFocusSector, counts }: MapFiltersProps) {
  const { tx, locale } = useLocale()
  const layers: [keyof MapFilterState, string][] = [
    ["buildings", tx("Bâtiments", "Buildings")],
    ["transit", tx("Transports", "Transit")],
    ["dangers", tx("Zones d'alerte", "Alert zones")],
    ["reports", tx("Signalements", "Reports")],
    ["labels", tx("Étiquettes", "Labels")],
    ...(canSeeObservations ? [["observations", tx("Observations (admin)", "Admin observations")] as [keyof MapFilterState, string]] : []),
  ]
  const toggleStatus = (status: string) =>
    onChange({ reportStatuses: value.reportStatuses.includes(status) ? value.reportStatuses.filter((s) => s !== status) : [...value.reportStatuses, status] })
  const dirty = JSON.stringify({ ...value, labels: true, observations: false }) !== JSON.stringify({ ...DEFAULT_FILTERS })

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4" aria-label={tx("Filtres de la carte", "Map filters")} data-tour="map-filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
          <legend className="sr-only">{tx("Couches de la carte", "Map layers")}</legend>
          {layers.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={Boolean(value[key])} onChange={() => onChange({ [key]: !value[key] })} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-live="polite">
          <span>{tx(`${counts.buildings} bâtiment(s)`, `${counts.buildings} building(s)`)}</span>
          <span>{tx(`${counts.reports} signalement(s)`, `${counts.reports} report(s)`)}</span>
          <Button type="button" size="sm" variant="ghost" disabled={!dirty} onClick={() => onChange({ ...DEFAULT_FILTERS, labels: value.labels, observations: value.observations })}>
            <RotateCcw className="size-3.5" aria-hidden />
            {tx("Réinitialiser", "Reset")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="mf-sector">{tx("Aller à un secteur", "Go to a sector")}</Label>
          <Select id="mf-sector" value={selectedSectorId} onChange={(e) => e.target.value && onFocusSector(e.target.value)}>
            <option value="">{tx("Choisir un secteur…", "Choose a sector…")}</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="mf-btype">{tx("Type de bâtiment", "Building type")}</Label>
          <Select id="mf-btype" value={value.buildingType} onChange={(e) => onChange({ buildingType: e.target.value })}>
            <option value="">{tx("Tous les types", "All types")}</option>
            {buildingTypes.map((type) => <option key={type} value={type}>{pickLabel(BUILDING_TYPE_LABELS, type, locale)}</option>)}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="mf-bstatus">{tx("État du bâtiment", "Building status")}</Label>
          <Select id="mf-bstatus" value={value.buildingStatus} onChange={(e) => onChange({ buildingStatus: e.target.value })}>
            <option value="">{tx("Tous les états", "All statuses")}</option>
            {BUILDING_STATUS_VALUES.map((status) => <option key={status} value={status}>{statusLabel("building", status, locale)}</option>)}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="mf-rcat">{tx("Catégorie de signalement", "Report category")}</Label>
          <Select id="mf-rcat" value={value.reportCategory} onChange={(e) => onChange({ reportCategory: e.target.value })}>
            <option value="">{tx("Toutes les catégories", "All categories")}</option>
            {Object.keys(REPORT_CATEGORY_LABELS).map((category) => <option key={category} value={category}>{pickLabel(REPORT_CATEGORY_LABELS, category, locale)}</option>)}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="mf-rsearch">{tx("Rechercher un signalement", "Search reports")}</Label>
          <Input id="mf-rsearch" type="search" value={value.reportSearch} onChange={(e) => onChange({ reportSearch: e.target.value })} placeholder={tx("Titre, numéro, description…", "Title, number, description…")} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="mf-danger">{tx("Zone d'alerte", "Alert zone")}</Label>
          <Select id="mf-danger" value={value.dangerId} onChange={(e) => onChange({ dangerId: e.target.value })} disabled={activeDangers.length === 0}>
            <option value="">{activeDangers.length ? tx("Toutes les alertes actives", "All active alerts") : tx("Aucune alerte active", "No active alert")}</option>
            {activeDangers.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
        </div>
      </div>

      {reportStatuses.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-medium" id="mf-rstatus">{tx("Statut des signalements", "Report status")}</p>
          <fieldset className="flex flex-wrap gap-2" aria-labelledby="mf-rstatus">
            {reportStatuses.map((status) => {
              const active = value.reportStatuses.includes(status)
              return (
                <Button key={status} type="button" size="sm" variant={active ? "default" : "outline"} aria-pressed={active} onClick={() => toggleStatus(status)}>
                  {statusLabel("report", status, locale)}
                </Button>
              )
            })}
          </fieldset>
        </div>
      )}
    </section>
  )
}
