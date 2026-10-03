import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { filterBuildingsForService, filterFacilities, useBuildings, useDangers, useSectors, useServices, useTransports } from "@/features/city/city-queries"
import type { MapData, MapReport, Observation, Pick } from "@/features/map/engine"
import { estimateMinutes, findRoute, isBuildingOpen } from "@/features/map/hex"
import { HexMap, type MapLayers, type MapMarker, type MapSelection } from "@/features/map/hex-map"
import { HologramMap } from "@/features/map/hologram-map"
import { MapDetailPanel } from "@/features/map/map-detail-panel"
import { DEFAULT_FILTERS, filterMapBuildings, filterMapReports, MapFilters, type MapFilterState } from "@/features/map/map-filters"
import { usePublicReports, type PublicReport } from "@/features/reports/report-queries"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

const DANGEROUS = ["moderate", "high", "extreme"]

interface ObservationItem extends Observation {
  x: number
  y: number
  label: string
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

/** Carte holographique 3D : secteurs en ruche, bâtiments, transports, zones d'alerte, signalements, itinéraires. */
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
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

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
  const avoidSectorIds = useMemo(() => Array.from(new Set(activeDangers.filter((d) => DANGEROUS.includes(d.severity)).flatMap((d) => d.affected_sector_ids))), [activeDangers])

  const shownBuildings = useMemo(() => filterMapBuildings(visibleBuildings, filters), [visibleBuildings, filters])
  const shownReports = useMemo(() => filterMapReports(reports.data ?? [], filters), [reports.data, filters])

  // Une sélection masquée par un filtre est ignorée (et revient dès que le filtre est levé).
  const selected = useMemo<Pick | null>(() => {
    if (!pending) return null
    if (pending.kind === "building") return shownBuildings.some((b) => b.id === pending.id) ? pending : null
    if (pending.kind === "report") return shownReports.some((r) => r.id === pending.id) ? pending : null
    return pending
  }, [pending, shownBuildings, shownReports])
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

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? visibleBuildings.filter((b) => b.name.toLowerCase().includes(term)) : []
  }, [visibleBuildings, search])

  const sectorName = (id: string) => sectors.data?.find((s) => s.id === id)
  const route = useMemo(() => {
    if (!from || !to || !sectors.data || !buildings.data) return null
    const routeSectors = sectors.data.map((sector) => ({ ...sector, q: sector.hex_q, r: sector.hex_r }))
    return findRoute(routeSectors, visibleBuildings, from, to, { avoidSectorIds })
  }, [from, to, sectors.data, buildings.data, visibleBuildings, avoidSectorIds])
  const routePoints = useMemo(() => {
    if (!route) return undefined
    return route.nodes.map((id) => {
      const s = sectors.data?.find((x) => x.id === id) ?? visibleBuildings.find((x) => x.id === id)
      return { x: s?.x ?? 0, y: s?.y ?? 0 }
    })
  }, [route, sectors.data, visibleBuildings])
  const routeTransports = route ? (transports.data ?? []).filter((t) => t.visibility === "public" && t.status === "active" && route.sectorIds.includes(t.sector_id)) : []
  const crossesDanger = route ? route.sectorIds.some((id) => avoidSectorIds.includes(id)) : false

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

  const openBuildings = visibleBuildings.filter(isBuildingOpen)
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
      onRouteTo={setTo}
    />
  ) : null

  const layers2d: MapLayers = { sectors: true, buildings: filters.buildings, transports: filters.transit, dangers: filters.dangers, reports: filters.reports, observations: filters.observations && canSeeObservations }
  const reportMarkers: MapMarker[] = shownReports.filter((r) => r.x !== null && r.y !== null).map((r) => ({ id: r.id, x: r.x as number, y: r.y as number, label: r.title }))
  const observationMarkers: MapMarker[] = (observations.data ?? []).map((o) => ({ id: o.id, x: o.x, y: o.y, label: o.label }))
  const selected2d: MapSelection = selected && selected.kind !== "report" ? { type: selected.kind, id: selected.id } : null
  const showSidebarDetail = view === "2d" && detail
  const mapReady = (sectors.data?.length ?? 0) > 0

  return (
    <Container className="py-8">
      <title>{tx("Carte interactive", "Interactive map")}</title>
      <PageHeader
        eyebrow={tx("La ville", "The city")}
        title={serviceFilter ? `${tx("Carte :", "Map:")} ${serviceFilter.name}` : tx("Carte de Nova Terra", "Nova Terra map")}
        description={serviceFilter
          ? tx("Cette vue conserve la carte de la ville et filtre les bâtiments sur les établissements de ce service.", "This view keeps the city map and filters buildings to this service's facilities.")
          : tx("Hologramme de la ruche : cliquez sur un secteur, un bâtiment, un transport ou un signalement pour afficher sa fiche.", "Hologram of the hive: select a sector, building, transport or report to open its card.")}
      />
      {serviceFilter && <p className="mb-4 text-sm"><Link className="underline underline-offset-4" to={`/services/${serviceFilter.slug}?q=${encodeURIComponent(facilitySearch)}&type=${encodeURIComponent(facilityType)}`}>{tx("Retour au service", "Back to service")}</Link> · {tx(`${visibleBuildings.length} établissement(s)`, `${visibleBuildings.length} facility/facilities`)}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_21rem]" data-tour="map">
        <div className="grid min-w-0 content-start gap-3">
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <fieldset className="flex gap-2"><legend className="sr-only">{tx("Mode d'affichage", "Display mode")}</legend>
              <Button type="button" size="sm" variant={view === "3d" ? "default" : "outline"} aria-pressed={view === "3d"} disabled={webglMissing} onClick={() => setView("3d")}>{tx("Hologramme 3D", "3D hologram")}</Button>
              <Button type="button" size="sm" variant={view === "2d" ? "default" : "outline"} aria-pressed={view === "2d"} onClick={() => setView("2d")}>{tx("Plan 2D", "2D plan")}</Button>
            </fieldset>
            {webglMissing && <output className="text-xs text-muted-foreground">{tx("WebGL indisponible : plan 2D affiché.", "WebGL unavailable: showing the 2D plan.")}</output>}
          </div>

          {view === "3d" && !webglMissing ? (
            <HologramMap
              className="h-[min(74vh,46rem)]"
              data={engineData}
              layers={engineLayers}
              selected={selected}
              onSelect={setSelected}
              routeSectorIds={route?.sectorIds ?? null}
              dangerId={filters.dangerId || null}
              panel={detail ?? undefined}
              onUnsupported={() => { setWebglMissing(true); setView("2d") }}
            />
          ) : (
            <HexMap
              sectors={sectors.data ?? []} buildings={shownBuildings} transports={transports.data ?? []}
              layers={layers2d} dangerSectorIds={avoidSectorIds} reportMarkers={reportMarkers} observationMarkers={observationMarkers}
              selected={selected2d} onSelect={(s) => setSelected(s ? { kind: s.type, id: s.id } : null)} routePoints={routePoints}
            />
          )}
          {sectors.isLoading && <p className="text-sm text-muted-foreground">{tx("Chargement de la carte…", "Loading the map…")}</p>}
          {!sectors.isLoading && !mapReady && <p role="alert" className="text-sm text-destructive">{tx("Aucune donnée de carte disponible.", "No map data available.")}</p>}
        </div>

        <aside className="grid content-start gap-4" aria-label={tx("Détails et navigation", "Details and navigation")}>
          <section className="rounded-xl border bg-card p-4" aria-labelledby="map-search">
            <h2 id="map-search" className="mb-2 font-semibold">{tx("Rechercher un bâtiment", "Search a building")}</h2>
            <Label htmlFor="b-search" className="sr-only">{tx("Nom du bâtiment", "Building name")}</Label>
            <Input id="b-search" type="search" value={serviceFilter ? facilitySearch : search} onChange={(event) => {
              if (serviceFilter) updateFacilityFilters({ q: event.target.value })
              else setSearch(event.target.value)
            }} placeholder={tx("Hôpital, mairie…", "Hospital, city hall…")} />
            {matches.length > 0 && (
              <ul className="mt-2 grid gap-1">
                {matches.map((b) => <li key={b.id}><Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setSelected({ kind: "building", id: b.id })}>{b.name}</Button></li>)}
              </ul>
            )}
          </section>

          {showSidebarDetail}

          <section className="rounded-xl border bg-card p-4" aria-labelledby="map-route">
            <h2 id="map-route" className="mb-2 font-semibold">{tx("Itinéraire", "Route")}</h2>
            <div className="grid gap-2">
              <Select aria-label={tx("Départ", "From")} value={from} onChange={(e) => setFrom(e.target.value)}>
                <option value="">{tx("Départ…", "From…")}</option>
                {openBuildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
              <Select aria-label={tx("Destination", "To")} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">{tx("Destination…", "To…")}</option>
                {openBuildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            {from && to && !route && <p role="alert" className="mt-2 text-sm text-destructive">{tx("Aucun itinéraire possible (bâtiment fermé ou zone isolée).", "No route possible (closed building or isolated area).")}</p>}
            {route && (
              <div className="mt-3 text-sm" aria-live="polite">
                <p className="font-medium">≈ {estimateMinutes(route.cost)} min · {route.sectorIds.length} {tx("secteur(s)", "sector(s)")}</p>
                <ol className="mt-1 list-decimal pl-5">
                  {route.sectorIds.map((id) => <li key={id}>{sectorName(id)?.code} {sectorName(id)?.name}</li>)}
                </ol>
                {crossesDanger && <p role="alert" className="mt-2 text-destructive">{tx("Attention : ce trajet traverse une zone sous alerte.", "Warning: this route crosses an area under alert.")}</p>}
                {routeTransports.length > 0 && <p className="mt-2 text-muted-foreground">{tx("Transports disponibles :", "Available transports:")} {routeTransports.map((t) => t.route_name ?? t.code).join(", ")}</p>}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{tx("Les bâtiments fermés et en maintenance sont exclus ; les secteurs sous alerte sont évités si possible.", "Closed and in-maintenance buildings are excluded; alert sectors are avoided when possible.")}</p>
          </section>

          {avoidSectorIds.length > 0 && (
            <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" aria-labelledby="map-zones">
              <h2 id="map-zones" className="mb-1 font-semibold">{tx("Zones à éviter (alertes fictives)", "Areas to avoid (fictional alerts)")}</h2>
              <ul className="list-disc pl-5">{avoidSectorIds.map((id) => <li key={id}>{sectorName(id)?.code} {sectorName(id)?.name}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>

      <details className="mt-6 rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">{tx("Version texte de la carte (bâtiments et signalements)", "Text version of the map (buildings and reports)")}</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <ul className="grid gap-1 text-sm">
            {shownBuildings.map((b) => (
              <li key={b.id}><button type="button" className="underline underline-offset-4" onClick={() => setSelected({ kind: "building", id: b.id })}>{b.name}</button> — {sectorName(b.sector_id)?.code} · {b.status}</li>
            ))}
          </ul>
          <ul className="grid gap-1 text-sm">
            {shownReports.map((r) => (
              <li key={r.id}><button type="button" className="underline underline-offset-4" onClick={() => setSelected({ kind: "report", id: r.id })}>{r.title}</button> — {sectorName(r.sector_id)?.code} · {r.status}</li>
            ))}
          </ul>
        </div>
      </details>
    </Container>
  )
}
