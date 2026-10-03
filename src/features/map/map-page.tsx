import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { filterBuildingsForService, filterFacilities, useBuildings, useDangers, useSectors, useServices, useTransports } from "@/features/city/city-queries"
import { estimateMinutes, findRoute, isBuildingOpen } from "@/features/map/hex"
import { HexMap, type MapLayers, type MapMarker, type MapSelection } from "@/features/map/hex-map"
import { usePublicReports } from "@/features/reports/report-queries"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { BUILDING_TYPE_LABELS, FACILITY_TYPE_LABELS, pickLabel, TRANSPORT_TYPE_LABELS } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import { describeOpeningHours } from "@/features/services/hours"

const DANGEROUS = ["moderate", "high", "extreme"]

/** Carte interactive : secteurs en ruche, bâtiments, transports, zones d'alerte, signalements validés, itinéraires. */
export function MapPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const [params, setSearchParams] = useSearchParams()
  const sectors = useSectors()
  const buildings = useBuildings()
  const transports = useTransports()
  const services = useServices({})
  const serviceFilterId = params.get("service")
  const serviceFilter = (services.data ?? []).find((service) => service.id === serviceFilterId)
  const facilitySearch = params.get("q") ?? ""
  const facilityType = params.get("type") ?? ""
  const serviceBuildings = useMemo(() => filterBuildingsForService(buildings.data ?? [], serviceFilterId), [buildings.data, serviceFilterId])
  const visibleBuildings = useMemo(() => filterFacilities(serviceBuildings, facilitySearch, facilityType), [serviceBuildings, facilitySearch, facilityType])
  const facilityTypes = Array.from(new Set(serviceBuildings.flatMap((building) => building.facility_type ? [building.facility_type] : []))).sort()
  const dangers = useDangers()
  const reports = usePublicReports()

  const [layers, setLayers] = useState<MapLayers>({ sectors: true, buildings: true, transports: true, dangers: true, reports: true, observations: false })
  const [selected, setSelected] = useState<MapSelection>(() => (params.get("building") ? { type: "building", id: params.get("building") as string } : null))
  const [search, setSearch] = useState(facilitySearch)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const canSeeObservations = Boolean(user && (user.isAdmin || user.profileRole === "service_admin"))
  const observations = useQuery({
    queryKey: ["observations"],
    enabled: Boolean(supabase && canSeeObservations),
    queryFn: async (): Promise<MapMarker[]> => {
      if (!supabase) return []
      const sats = unwrap(await supabase.from("satellite_observations").select("id,satellite_code,x,y,confidence_score"), []) as { id: string; satellite_code: string; x: number; y: number; confidence_score: number | null }[]
      const cams = unwrap(await supabase.from("cameras").select("id,code,x,y,status"), []) as { id: string; code: string; x: number; y: number; status: string }[]
      return [
        ...sats.map((s) => ({ id: s.id, x: s.x, y: s.y, label: `${s.satellite_code} (${Math.round((s.confidence_score ?? 0) * 100)} %)` })),
        ...cams.map((c) => ({ id: c.id, x: c.x, y: c.y, label: `${c.code} (${c.status})` })),
      ]
    },
  })

  const activeDangers = (dangers.data ?? []).filter((d) => d.status === "active")
  const avoidSectorIds = useMemo(() => Array.from(new Set(activeDangers.filter((d) => DANGEROUS.includes(d.severity)).flatMap((d) => d.affected_sector_ids))), [activeDangers])
  const reportMarkers: MapMarker[] = (reports.data ?? []).filter((r) => r.x !== null && r.y !== null).map((r) => ({ id: r.id, x: r.x as number, y: r.y as number, label: r.title }))

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

  const selBuilding = selected?.type === "building" ? visibleBuildings.find((b) => b.id === selected.id) : undefined
  const selSector = selected?.type === "sector" ? sectors.data?.find((s) => s.id === selected.id) : undefined
  const selTransport = selected?.type === "transport" ? transports.data?.find((t) => t.id === selected.id) : undefined
  const buildingServices = selBuilding ? (services.data ?? []).filter((s) => s.building_id === selBuilding.id) : []
  const toggle = (key: keyof MapLayers) => setLayers((l) => ({ ...l, [key]: !l[key] }))
  const updateFacilityFilters = (patch: { q?: string; type?: string }) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const layerLabels: [keyof MapLayers, string][] = [
    ["sectors", tx("Secteurs", "Sectors")], ["buildings", tx("Bâtiments", "Buildings")], ["transports", tx("Transports", "Transports")],
    ["dangers", tx("Zones d'alerte", "Alert zones")], ["reports", tx("Signalements validés", "Validated reports")],
    ...(canSeeObservations ? [["observations", tx("Observations (admin)", "Observations (admin)")] as [keyof MapLayers, string]] : []),
  ]
  const openBuildings = visibleBuildings.filter(isBuildingOpen)

  return (
    <Container className="py-8">
      <title>{tx("Carte interactive", "Interactive map")}</title>
      <PageHeader
        eyebrow={tx("La ville", "The city")}
        title={serviceFilter ? `${tx("Carte :", "Map:")} ${serviceFilter.name}` : tx("Carte de Nova Terra", "Nova Terra map")}
        description={serviceFilter
          ? tx("Cette vue conserve la carte de la ville et filtre les bâtiments sur les établissements de ce service.", "This view keeps the city map and filters buildings to this service's facilities.")
          : tx("La ruche est divisée en secteurs. Cliquez sur un secteur, un bâtiment ou un transport pour le détail.", "The hive is divided into sectors. Select a sector, a building or a transport for details.")}
      />
      {serviceFilter && <p className="mb-4 text-sm"><Link className="underline underline-offset-4" to={`/services/${serviceFilter.slug}?q=${encodeURIComponent(facilitySearch)}&type=${encodeURIComponent(facilityType)}`}>{tx("Retour au service", "Back to service")}</Link> · {tx(`${visibleBuildings.length} établissement(s)`, `${visibleBuildings.length} facility/facilities`)}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]" data-tour="map">
        <div className="grid gap-3">
          {serviceFilter && (
            <section className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_14rem]" aria-label={tx("Filtres des établissements", "Facility filters")}>
              <div className="grid gap-1">
                <Label htmlFor="map-facility-search">{tx("Rechercher un établissement ou une prestation", "Search facilities or services offered")}</Label>
                <Input
                  id="map-facility-search"
                  type="search"
                  value={facilitySearch}
                  onChange={(event) => updateFacilityFilters({ q: event.target.value })}
                  placeholder={tx("Urgences, chirurgie, pharmacie…", "Emergency care, surgery, pharmacy…")}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="map-facility-type">{tx("Type d'établissement", "Facility type")}</Label>
                <Select id="map-facility-type" value={facilityType} onChange={(event) => updateFacilityFilters({ type: event.target.value })}>
                  <option value="">{tx("Tous les types", "All types")}</option>
                  {facilityTypes.map((type) => <option key={type} value={type}>{pickLabel(FACILITY_TYPE_LABELS, type, locale)}</option>)}
                </Select>
              </div>
            </section>
          )}
          <fieldset className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border bg-card p-3">
            <legend className="sr-only">{tx("Couches de la carte", "Map layers")}</legend>
            {layerLabels.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={layers[key]} onChange={() => toggle(key)} />{label}</label>
            ))}
          </fieldset>
          <HexMap
            sectors={sectors.data ?? []} buildings={visibleBuildings} transports={transports.data ?? []}
            layers={layers} dangerSectorIds={avoidSectorIds} reportMarkers={reportMarkers} observationMarkers={observations.data ?? []}
            selected={selected} onSelect={setSelected} routePoints={routePoints}
          />
          {sectors.isLoading && <p className="text-sm text-muted-foreground">{tx("Chargement de la carte…", "Loading the map…")}</p>}
          {!sectors.isLoading && (sectors.data?.length ?? 0) === 0 && <p role="alert" className="text-sm text-destructive">{tx("Aucune donnée de carte disponible.", "No map data available.")}</p>}
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
                {matches.map((b) => <li key={b.id}><Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setSelected({ type: "building", id: b.id })}>{b.name}</Button></li>)}
              </ul>
            )}
          </section>

          {(selBuilding || selSector || selTransport) && (
            <section className="rounded-xl border bg-card p-4" aria-labelledby="map-detail" aria-live="polite">
              <h2 id="map-detail" className="font-semibold">{selBuilding?.name ?? (selSector ? `${selSector.code} — ${selSector.name}` : selTransport?.code)}</h2>
              {selBuilding && (
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{selBuilding.facility_type ? pickLabel(FACILITY_TYPE_LABELS, selBuilding.facility_type, locale) : pickLabel(BUILDING_TYPE_LABELS, selBuilding.type, locale)}</Badge><StatusBadge kind="building" value={selBuilding.status} /></div>
                  <p>{sectorName(selBuilding.sector_id)?.name} · {selBuilding.address}</p>
                  {selBuilding.phone && <a className="underline-offset-4 hover:underline" href={`tel:${selBuilding.phone.replace(/\s/g, "")}`}>{selBuilding.phone}</a>}
                  {selBuilding.email && <a className="underline-offset-4 hover:underline" href={`mailto:${selBuilding.email}`}>{selBuilding.email}</a>}
                  <p className="text-muted-foreground">{selBuilding.description}</p>
                  {(selBuilding.offerings ?? []).length > 0 && (
                    <div>
                      <p className="font-medium">{tx("Prestations proposées", "Services offered")}</p>
                      <ul className="flex flex-wrap gap-1">{(selBuilding.offerings ?? []).map((offering) => <li key={offering}><Badge variant="secondary">{offering}</Badge></li>)}</ul>
                    </div>
                  )}
                  <ul>{describeOpeningHours(selBuilding.opening_hours, locale).map((h) => <li key={h.days}>{h.days} : {h.hours}</li>)}</ul>
                  <p className="text-xs text-muted-foreground">{tx("Accessibilité :", "Accessibility:")} {Object.entries(selBuilding.accessibility).filter(([, v]) => v).map(([k]) => k).join(", ") || "—"}</p>
                  {buildingServices.length > 0 && (
                    <div><p className="font-medium">{tx("Services présents", "Services here")}</p><ul className="list-disc pl-5">{buildingServices.map((s) => <li key={s.id}><Link className="underline underline-offset-4" to={`/services/${s.slug}`}>{s.name}</Link></li>)}</ul></div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!isBuildingOpen(selBuilding)} onClick={() => setTo(selBuilding.id)}>{tx("Itinéraire vers ici", "Route here")}</Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/app/reports/new?sector=${selBuilding.sector_id}&building=${selBuilding.id}`}>{tx("Signaler ici", "Report here")}</Link></Button>
                  </div>
                </div>
              )}
              {selSector && <p className="mt-2 text-sm text-muted-foreground">{selSector.description}<br />{tx("Activité", "Activity")} : {selSector.activity_level} %</p>}
              {selTransport && <p className="mt-2 text-sm">{pickLabel(TRANSPORT_TYPE_LABELS, selTransport.type, locale)} · {selTransport.status} · {selTransport.route_name ?? "—"} · {tx("capacité", "capacity")} {selTransport.capacity}</p>}
            </section>
          )}

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
        <summary className="cursor-pointer font-medium">{tx("Version texte de la carte (liste des bâtiments)", "Text version of the map (list of buildings)")}</summary>
        <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
          {visibleBuildings.map((b) => (
            <li key={b.id}><button type="button" className="underline underline-offset-4" onClick={() => setSelected({ type: "building", id: b.id })}>{b.name}</button> — {sectorName(b.sector_id)?.code} · {b.status}</li>
          ))}
        </ul>
      </details>
    </Container>
  )
}
