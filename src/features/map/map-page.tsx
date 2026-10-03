import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { filterBuildingsForService, filterFacilities, useBuildings, useDangers, useSectors, useServices, useTransports } from "@/features/city/city-queries"
import type { MapData, MapReport, Observation, Pick } from "@/features/map/engine"
import { HexMap, type MapLayers, type MapMarker, type MapSelection } from "@/features/map/hex-map"
import { HologramMap } from "@/features/map/hologram-map"
import { MapDetailPanel } from "@/features/map/map-detail-panel"
import { DEFAULT_FILTERS, filterMapBuildings, filterMapReports, MapFilters, type MapFilterState } from "@/features/map/map-filters"
import { usePublicReports, type PublicReport } from "@/features/reports/report-queries"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface ObservationItem extends Observation {
  x: number
  y: number
  label: string
}

type MapListItem = {
  id: string
  kind: Pick["kind"]
  name: string
  sectorId: string | null
  status: string
  pick: Pick
}

const toMapReport = (r: PublicReport): MapReport => ({
  id: r.id,
  title: r.title,
  description: r.description,
  sector_id: r.sector_id,
  x: r.x,
  y: r.y,
  status: r.status,
  source: r.category,
  confidence_score: null,
})

/** Carte interactive de Nova Terra avec vues 3D/2D, filtres et détails des éléments. */
export function MapPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const [params, setSearchParams] = useSearchParams()
  const sectors = useSectors()
  const buildings = useBuildings()
  const transports = useTransports()
  const services = useServices({})
  const dangers = useDangers()
  const reports = usePublicReports()

  const serviceFilterId = params.get("service")
  const serviceFilter = (services.data ?? []).find((service) => service.id === serviceFilterId)
  const facilitySearch = params.get("q") ?? ""
  const facilityType = params.get("type") ?? ""
  const serviceBuildings = useMemo(() => filterBuildingsForService(buildings.data ?? [], serviceFilterId), [buildings.data, serviceFilterId])
  const visibleBuildings = useMemo(() => filterFacilities(serviceBuildings, facilitySearch, facilityType), [serviceBuildings, facilitySearch, facilityType])

  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_FILTERS)
  const patchFilters = (patch: Partial<MapFilterState>) => setFilters((current) => ({ ...current, ...patch }))
  const [pending, setSelected] = useState<Pick | null>(() => {
    const buildingId = params.get("building")
    if (buildingId) return { kind: "building", id: buildingId }
    const reportId = params.get("report")
    if (reportId) return { kind: "report", id: reportId }
    const sectorId = params.get("sector")
    return sectorId ? { kind: "sector", id: sectorId } : null
  })
  const [view, setView] = useState<"3d" | "2d">("3d")
  const [webglMissing, setWebglMissing] = useState(false)
  const [search, setSearch] = useState(facilitySearch)
  const [listSearch, setListSearch] = useState("")
  const [listKind, setListKind] = useState<"all" | Pick["kind"]>("all")

  const canSeeObservations = Boolean(user && (user.isAdmin || user.profileRole === "service_admin"))
  const observations = useQuery({
    queryKey: ["observations"],
    enabled: Boolean(supabase && canSeeObservations),
    queryFn: async (): Promise<ObservationItem[]> => {
      if (!supabase) return []
      const sats = unwrap(await supabase.from("satellite_observations").select("id,satellite_code,sector_id,x,y,confidence_score"), []) as { id: string; satellite_code: string; sector_id: string; x: number; y: number; confidence_score: number | null }[]
      const cams = unwrap(await supabase.from("cameras").select("id,code,sector_id,x,y,status"), []) as { id: string; code: string; sector_id: string; x: number; y: number; status: string }[]
      return [
        ...sats.map((s): ObservationItem => ({ kind: "satellite", id: s.id, sector_id: s.sector_id, online: true, x: s.x, y: s.y, label: `${s.satellite_code} (${Math.round((s.confidence_score ?? 0) * 100)} %)` })),
        ...cams.map((c): ObservationItem => ({ kind: "camera", id: c.id, sector_id: c.sector_id, online: c.status === "online", x: c.x, y: c.y, label: `${c.code} (${c.status})` })),
      ]
    },
  })

  const activeDangers = useMemo(() => (dangers.data ?? []).filter((d) => d.status === "active"), [dangers.data])

  const shownBuildings = useMemo(() => filterMapBuildings(visibleBuildings, filters), [visibleBuildings, filters])
  const shownReports = useMemo(() => filterMapReports(reports.data ?? [], filters), [reports.data, filters])

  // Keep details available when an item is selected from search/table even if a map filter hides it.
  const selected = useMemo<Pick | null>(() => {
    if (!pending) return null
    if (pending.kind === "building") return (buildings.data ?? []).some((b) => b.id === pending.id) ? pending : null
    if (pending.kind === "report") return (reports.data ?? []).some((r) => r.id === pending.id) ? pending : null
    return pending
  }, [pending, buildings.data, reports.data])
  const buildingTypes = useMemo(() => Array.from(new Set(visibleBuildings.map((b) => b.type))).sort(), [visibleBuildings])
  const reportStatuses = useMemo(() => Array.from(new Set((reports.data ?? []).map((r) => r.status))).sort(), [reports.data])

  const engineData = useMemo<MapData>(
    () => ({
      sectors: sectors.data ?? [],
      buildings: shownBuildings,
      transports: transports.data ?? [],
      dangers: dangers.data ?? [],
      reports: shownReports.map(toMapReport),
      observations: filters.observations && canSeeObservations ? (observations.data ?? []) : [],
    }),
    [sectors.data, shownBuildings, transports.data, dangers.data, shownReports, filters.observations, canSeeObservations, observations.data]
  )
  const engineLayers = useMemo(
    () => ({ transit: filters.transit, dangers: filters.dangers, reports: filters.reports, labels: filters.labels, observations: filters.observations && canSeeObservations }),
    [filters.transit, filters.dangers, filters.reports, filters.labels, filters.observations, canSeeObservations]
  )

  const buildingSuggestions = useMemo(() => {
    const term = (serviceFilter ? facilitySearch : search).trim().toLocaleLowerCase()
    return term ? serviceBuildings.filter((building) => building.name.toLocaleLowerCase().includes(term)) : []
  }, [serviceFilter, facilitySearch, search, serviceBuildings])

  const staff = user?.profileRole === "agent" || user?.profileRole === "service_admin"
  const reportHref = (id: string) => (staff ? `/agent/reports/${id}` : `/app/reports/${id}`)

  const updateFacilityFilters = (patch: { q?: string; type?: string }) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const detail = selected ? (
    <MapDetailPanel
      selected={selected}
      sectors={sectors.data ?? []}
      buildings={buildings.data ?? []}
      transports={transports.data ?? []}
      reports={reports.data ?? []}
      dangers={dangers.data ?? []}
      services={services.data ?? []}
      reportHref={reportHref}
      onSelect={setSelected}
      showReportLink={view === "3d"}
      presentation={view === "2d" ? "dialog" : "hologram"}
    />
  ) : null

  const selectedBuilding = selected?.kind === "building" ? buildings.data?.find((building) => building.id === selected.id) : undefined
  const selectedReport = selected?.kind === "report" ? reports.data?.find((report) => report.id === selected.id) : undefined
  const selectedSector = selected?.kind === "sector" ? sectors.data?.find((sector) => sector.id === selected.id) : undefined
  const selectedService = selectedBuilding
    ? services.data?.find((service) => service.building_id === selectedBuilding.id)
    : undefined
  const selectedDanger = selectedSector
    ? activeDangers.find((danger) => danger.affected_sector_ids.includes(selectedSector.id))
    : undefined
  const dedicatedPage = selectedReport
    ? { href: reportHref(selectedReport.id), label: tx("Ouvrir le signalement", "Open report") }
    : selectedService
      ? { href: `/services/${selectedService.slug}`, label: tx("Ouvrir le service associé", "Open associated service") }
      : selectedDanger
        ? { href: `/dangers/${selectedDanger.slug}`, label: tx("Ouvrir l'alerte", "Open alert") }
        : null

  const layers2d: MapLayers = { sectors: true, buildings: filters.buildings, transports: filters.transit, dangers: filters.dangers, reports: filters.reports, observations: filters.observations && canSeeObservations }
  const dangerSectorIds = useMemo(() => Array.from(new Set(activeDangers.flatMap((danger) => danger.affected_sector_ids ?? []))), [activeDangers])
  const reportMarkers: MapMarker[] = shownReports.filter((r) => r.x !== null && r.y !== null).map((r) => ({ id: r.id, x: r.x as number, y: r.y as number, label: r.title }))
  const observationMarkers: MapMarker[] = (observations.data ?? []).map((o) => ({ id: o.id, x: o.x, y: o.y, label: o.label }))
  const selected2d: MapSelection = selected ? { type: selected.kind, id: selected.id } : null
  const listItems = useMemo<MapListItem[]>(() => [
    ...(sectors.data ?? []).map((sector): MapListItem => ({
      id: sector.id, kind: "sector", name: `${sector.code} · ${sector.name}`, sectorId: sector.id,
      status: `${sector.activity_level}% ${tx("d'activité", "activity")}`, pick: { kind: "sector", id: sector.id },
    })),
    ...serviceBuildings.map((building): MapListItem => ({
      id: building.id, kind: "building", name: building.name, sectorId: building.sector_id,
      status: building.status, pick: { kind: "building", id: building.id },
    })),
    ...(transports.data ?? []).map((transport): MapListItem => ({
      id: transport.id, kind: "transport", name: `${transport.code} · ${transport.route_name ?? transport.type}`,
      sectorId: transport.sector_id, status: transport.status, pick: { kind: "transport", id: transport.id },
    })),
    ...(reports.data ?? []).map((report): MapListItem => ({
      id: report.id, kind: "report", name: report.title, sectorId: report.sector_id,
      status: report.status, pick: { kind: "report", id: report.id },
    })),
  ], [sectors.data, serviceBuildings, transports.data, reports.data, tx])
  const filteredListItems = useMemo(() => {
    const term = listSearch.trim().toLocaleLowerCase()
    return listItems.filter((item) => {
      const sector = sectors.data?.find((entry) => entry.id === item.sectorId)
      return (listKind === "all" || item.kind === listKind)
        && (!term || `${item.name} ${item.status} ${sector?.code ?? ""} ${sector?.name ?? ""}`.toLocaleLowerCase().includes(term))
    })
  }, [listItems, listKind, listSearch, sectors.data])
  const mapReady = (sectors.data?.length ?? 0) > 0

  return (
    <Container className="max-w-screen-2xl py-8">
      <title>{tx("Carte interactive", "Interactive map")}</title>
      <PageHeader
        eyebrow={tx("La ville", "The city")}
        title={serviceFilter ? `${tx("Carte :", "Map:")} ${serviceFilter.name}` : tx("Carte de Nova Terra", "Nova Terra map")}
        description={serviceFilter
          ? tx("Cette vue conserve la carte de la ville et filtre les bâtiments sur les établissements de ce service.", "This view keeps the city map and filters buildings to this service's facilities.")
          : tx("Explorez la ville en 3D ou en 2D. Sélectionnez un élément pour consulter ses détails.", "Explore the city in 3D or 2D. Select an item to view its details.")}
      />
      {serviceFilter && <p className="mb-4 text-sm"><Link className="underline underline-offset-4" to={`/services/${serviceFilter.slug}?q=${encodeURIComponent(facilitySearch)}&type=${encodeURIComponent(facilityType)}`}>{tx("Retour au service", "Back to service")}</Link> · {tx(`${visibleBuildings.length} établissement(s)`, `${visibleBuildings.length} facility/facilities`)}</p>}

      <div className="grid min-w-0 gap-3" data-tour="map">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <section className="relative min-w-[min(100%,20rem)] flex-1" aria-labelledby="map-search">
            <h2 id="map-search" className="mb-2 font-semibold">{tx("Rechercher un bâtiment", "Search a building")}</h2>
            <Label htmlFor="b-search" className="sr-only">{tx("Nom du bâtiment", "Building name")}</Label>
            <Input id="b-search" type="search" value={serviceFilter ? facilitySearch : search} onChange={(event) => {
              if (serviceFilter) updateFacilityFilters({ q: event.target.value })
              else setSearch(event.target.value)
            }} placeholder={tx("Hôpital, mairie…", "Hospital, city hall…")} aria-controls="building-suggestions" aria-expanded={buildingSuggestions.length > 0} />
            {buildingSuggestions.length > 0 && (
              <ul id="building-suggestions" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-lg" aria-label={tx("Suggestions de bâtiments", "Building suggestions")}>
                {buildingSuggestions.map((building) => (
                  <li key={building.id}>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => {
                      setSelected({ kind: "building", id: building.id })
                      if (serviceFilter) updateFacilityFilters({ q: building.name })
                      else setSearch(building.name)
                    }}>
                      {building.name} · {sectors.data?.find((sector) => sector.id === building.sector_id)?.code}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {(serviceFilter ? facilitySearch : search).trim() && buildingSuggestions.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">{tx("Aucun bâtiment trouvé.", "No buildings found.")}</p>
            )}
          </section>
          <fieldset className="flex gap-2"><legend className="sr-only">{tx("Mode d'affichage", "Display mode")}</legend>
            <Button type="button" size="sm" variant={view === "3d" ? "default" : "outline"} aria-pressed={view === "3d"} disabled={webglMissing} onClick={() => setView("3d")}>{tx("Hologramme 3D", "3D hologram")}</Button>
            <Button type="button" size="sm" variant={view === "2d" ? "default" : "outline"} aria-pressed={view === "2d"} onClick={() => setView("2d")}>{tx("Plan 2D", "2D plan")}</Button>
          </fieldset>
        </div>
        {webglMissing && <output className="text-xs text-muted-foreground">{tx("WebGL indisponible : plan 2D affiché.", "WebGL unavailable: showing the 2D plan.")}</output>}
        <MapFilters
          value={filters}
          onChange={patchFilters}
          sectors={sectors.data ?? []}
          activeDangers={activeDangers}
          buildingTypes={buildingTypes}
          reportStatuses={reportStatuses}
          canSeeObservations={canSeeObservations}
          selectedSectorId={selected?.kind === "sector" ? selected.id : ""}
          onFocusSector={(id) => setSelected({ kind: "sector", id })}
          counts={{ buildings: shownBuildings.length, reports: shownReports.length }}
        />
        {view === "3d" && !webglMissing ? (
          <HologramMap
            className="h-[min(78vh,52rem)]"
            data={engineData}
            layers={engineLayers}
            selected={selected}
            onSelect={setSelected}
            routeSectorIds={null}
            dangerId={filters.dangerId || null}
            panel={detail ?? undefined}
            onUnsupported={() => { setWebglMissing(true); setView("2d") }}
          />
        ) : (
          <HexMap
            sectors={sectors.data ?? []}
            buildings={shownBuildings}
            transports={transports.data ?? []}
            layers={layers2d}
            dangerSectorIds={dangerSectorIds}
            reportMarkers={reportMarkers}
            observationMarkers={observationMarkers}
            selected={selected2d}
            onSelect={(item) => setSelected(item ? { kind: item.type, id: item.id } : null)}
          />
        )}
        <Dialog open={view === "2d" && selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{tx("Détails de l'élément", "Item details")}</DialogTitle>
              <DialogDescription>{tx("Informations sur l'élément sélectionné sur la carte 2D.", "Details for the item selected on the 2D map.")}</DialogDescription>
            </DialogHeader>
            {detail}
            {dedicatedPage && (
              <div className="flex justify-end">
                <Button asChild>
                  <Link to={dedicatedPage.href}>{dedicatedPage.label}</Link>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {sectors.isLoading && <p className="text-sm text-muted-foreground">{tx("Chargement de la carte…", "Loading the map…")}</p>}
        {!sectors.isLoading && !mapReady && <p role="alert" className="text-sm text-destructive">{tx("Aucune donnée de carte disponible.", "No map data available.")}</p>}
      </div>

        <details open className="mt-3 rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">{tx("Explorer tous les éléments", "Browse all map items")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div>
              <Label htmlFor="map-list-search" className="sr-only">{tx("Rechercher dans les éléments", "Search map items")}</Label>
              <Input id="map-list-search" type="search" value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder={tx("Rechercher nom, secteur ou statut…", "Search name, sector, or status…")} />
            </div>
            <Select aria-label={tx("Filtrer par type", "Filter by type")} value={listKind} onChange={(event) => setListKind(event.target.value as typeof listKind)}>
              <option value="all">{tx("Tous les types", "All types")}</option>
              <option value="sector">{tx("Secteurs", "Sectors")}</option>
              <option value="building">{tx("Bâtiments", "Buildings")}</option>
              <option value="transport">{tx("Transports", "Transport")}</option>
              <option value="report">{tx("Signalements", "Reports")}</option>
            </Select>
          </div>
          <div className="mt-3 max-h-[28rem] overflow-auto rounded-md border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{tx("Type", "Type")}</th>
                  <th className="px-3 py-2 font-medium">{tx("Élément", "Item")}</th>
                  <th className="px-3 py-2 font-medium">{tx("Secteur", "Sector")}</th>
                  <th className="px-3 py-2 font-medium">{tx("Statut", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredListItems.map((item) => {
                  const active = selected?.kind === item.kind && selected.id === item.id
                  const itemSector = sectors.data?.find((sector) => sector.id === item.sectorId)
                  const kindLabel = { sector: tx("Secteur", "Sector"), building: tx("Bâtiment", "Building"), transport: tx("Transport", "Transport"), report: tx("Signalement", "Report") }[item.kind]
                  return (
                    <tr key={`${item.kind}:${item.id}`} aria-selected={active} className={active ? "bg-primary/10" : "border-t"}>
                      <td className="px-3 py-2 text-muted-foreground">{kindLabel}</td>
                      <td className="px-3 py-2">
                        <button type="button" className="text-left font-medium underline-offset-4 hover:underline" onClick={() => setSelected(item.pick)}>{item.name}</button>
                      </td>
                      <td className="px-3 py-2">{itemSector ? `${itemSector.code} · ${itemSector.name}` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.status}</td>
                    </tr>
                  )
                })}
                {filteredListItems.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">{tx("Aucun élément ne correspond à ces filtres.", "No items match these filters.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{tx(`${filteredListItems.length} élément(s)`, `${filteredListItems.length} item(s)`)}</p>
        </details>
    </Container>
  )
}
