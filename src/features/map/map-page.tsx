import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import { Activity, ArrowRight, Bus, Footprints, Navigation, Radar, Search, ShieldCheck, TrainFront } from "lucide-react"

import { Container } from "@/components/layout/container"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { useBuildings, useDangers, useSectors, useServices, useTransports } from "@/features/city/city-queries"
import { estimateMinutes, findRoute, isBuildingOpen, type RouteLeg, type RouteMode } from "@/features/map/hex"
import { usePublicReports } from "@/features/reports/report-queries"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { pickLabel, TRANSPORT_TYPE_LABELS } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

import type { Layers, Observation } from "./nova-terra-map"
import { NovaTerraMap } from "./nova-terra-map"
import type { MapData } from "./nova-terra-engine"

const DANGEROUS = ["moderate", "high", "extreme"]
const PUBLIC_TRANSPORT_TYPES = new Set(["hover_tram", "maglev", "sky_pod", "shuttle", "drone_taxi", "ferry"])
const REFUGE_PATTERN = /\b(abri|bunker|refuge|shelter)\b/i
const PANEL = "rounded-2xl border border-white/10 bg-[#111923]/85 p-4 shadow-[0_16px_50px_-30px_rgba(0,0,0,.8)] backdrop-blur-xl"
const ROUTE_BUTTON = "border-[#d9bd8c]/25 bg-[#d9bd8c]/10 text-[#f1ddb9] hover:bg-[#d9bd8c]/20"

/** Selected item on the 3D map — only sectors are directly selectable in the engine. */
type SelectedSector = { type: "sector"; id: string } | null

function routeStepLabel(leg: RouteLeg, sectors: ReturnType<typeof useSectors>["data"], buildings: ReturnType<typeof useBuildings>["data"], transports: ReturnType<typeof useTransports>["data"], locale: "fr" | "en") {
  const destination = sectors?.find((s) => s.id === leg.toId) ?? sectors?.find((s) => s.id === buildings?.find((b) => b.id === leg.toId)?.sector_id)
  const building = buildings?.find((b) => b.id === leg.toId)
  const place = building?.name ?? (destination ? `${destination.code} · ${destination.name}` : "")
  if (leg.mode === "transit") {
    const line = transports?.find((t) => t.id === leg.transportId)
    const vehicle = line ? pickLabel(TRANSPORT_TYPE_LABELS, line.type, locale) : locale === "fr" ? "Transport public" : "Public transport"
    return `${locale === "fr" ? "Prendre" : "Take"} ${vehicle}${leg.lineName ? ` · ${leg.lineName}` : ""}${place ? ` → ${place}` : ""}`
  }
  if (building && leg.fromId !== building.id) return `${locale === "fr" ? "Terminer à pied vers" : "Walk to"} ${building.name}`
  return `${locale === "fr" ? "À pied vers" : "Walk to"} ${place || (locale === "fr" ? "le secteur suivant" : "the next sector")}`
}

/** Carte interactive 3D holographique : secteurs, signalements, points de repli et itinéraires multimodaux. */
export function MapPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const [params] = useSearchParams()

  const sectors = useSectors()
  const buildings = useBuildings()
  const transports = useTransports()
  const services = useServices({})
  const dangers = useDangers()
  const reports = usePublicReports()

  // Engine layer toggles (engine uses different keys than the SVG map)
  const [layers, setLayers] = useState<Layers>({ transit: true, labels: true, reports: true, dangers: true, observations: false })

  // Selection — the 3D engine selects sectors by ID
  const initialSectorId = useMemo(() => {
    const bid = params.get("building")
    if (!bid) return null
    return buildings.data?.find((b) => b.id === bid)?.sector_id ?? null
  }, [params, buildings.data])

  const [selected, setSelected] = useState<SelectedSector>(() => (initialSectorId ? { type: "sector", id: initialSectorId } : null))
  const [search, setSearch] = useState("")
  const [hoveredLabel, setHoveredLabel] = useState("")
  const [hoveredSid, setHoveredSid] = useState<string | null>(null)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [routeMode, setRouteMode] = useState<RouteMode>("mixed")

  const canSeeObservations = Boolean(user && (user.isAdmin || user.profileRole === "service_admin"))

  const observations = useQuery({
    queryKey: ["observations"],
    enabled: Boolean(supabase && canSeeObservations),
    queryFn: async (): Promise<Observation[]> => {
      if (!supabase) return []
      const cams = unwrap(await supabase.from("cameras").select("id,code,sector_id,status"), []) as { id: string; code: string; sector_id: string; status: string }[]
      return cams.map((c) => ({
        kind: "camera" as const,
        id: c.id,
        sector_id: c.sector_id,
        online: c.status === "active",
      }))
    },
  })

  const activeDangers = useMemo(() => (dangers.data ?? []).filter((d) => d.status === "active"), [dangers.data])
  const avoidSectorIds = useMemo(
    () => Array.from(new Set(activeDangers.filter((d) => DANGEROUS.includes(d.severity)).flatMap((d) => d.affected_sector_ids))),
    [activeDangers],
  )

  // Build the MapData object for the engine
  const mapData = useMemo((): MapData => {
    return {
      sectors: (sectors.data ?? []).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        hex_q: s.hex_q,
        hex_r: s.hex_r,
        x: s.x,
        y: s.y,
        color: s.color,
        activity_level: s.activity_level,
        description: s.description,
      })),
      buildings: (buildings.data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        sector_id: b.sector_id,
        status: b.status,
        description: b.description,
      })),
      transports: (transports.data ?? []).map((t) => ({
        id: t.id,
        code: t.code,
        type: t.type,
        status: t.status,
        visibility: t.visibility,
        sector_id: t.sector_id,
      })),
      dangers: (dangers.data ?? []).map((d) => ({
        id: d.id,
        slug: d.slug,
        title: d.title,
        severity: d.severity,
        status: d.status,
        affected_sector_ids: d.affected_sector_ids,
        protocol_steps: d.protocol_steps,
      })),
      reports: (reports.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        sector_id: r.sector_id,
        x: r.x,
        y: r.y,
        status: r.status,
        source: r.source ?? "citizen",
        confidence_score: r.confidence_score ?? null,
      })),
      observations: observations.data ?? [],
    }
  }, [sectors.data, buildings.data, transports.data, dangers.data, reports.data, observations.data])

  // Route
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(locale)
    if (!term) return []
    return [
      ...(buildings.data ?? []).filter((b) => `${b.name} ${b.address ?? ""}`.toLocaleLowerCase(locale).includes(term)).map((b) => ({ type: "building" as const, id: b.id, label: b.name, sectorId: b.sector_id })),
      ...(sectors.data ?? []).filter((s) => `${s.code} ${s.name} ${s.description ?? ""}`.toLocaleLowerCase(locale).includes(term)).map((s) => ({ type: "sector" as const, id: s.id, label: `${s.code} — ${s.name}`, sectorId: s.id })),
    ].slice(0, 5)
  }, [buildings.data, locale, search, sectors.data])

  const sectorName = (id: string) => sectors.data?.find((s) => s.id === id)
  const openBuildings = (buildings.data ?? []).filter(isBuildingOpen)

  const route = useMemo(() => {
    if (!from || !to || !sectors.data || !buildings.data) return null
    const routeSectors = sectors.data.map((s) => ({ ...s, q: s.hex_q, r: s.hex_r }))
    const publicLines = (transports.data ?? []).filter((t) => t.visibility === "public" && PUBLIC_TRANSPORT_TYPES.has(t.type))
    return findRoute(routeSectors, buildings.data, from, to, { avoidSectorIds, transports: publicLines, mode: routeMode })
  }, [from, to, routeMode, sectors.data, buildings.data, transports.data, avoidSectorIds])

  const routeIds = useMemo(() => (route ? route.nodes : null), [route])

  const routeTransports = route ? (transports.data ?? []).filter((t) => route.legs.some((leg) => leg.mode === "transit" && leg.transportId === t.id)) : []
  const crossesDanger = route ? route.sectorIds.some((id) => avoidSectorIds.includes(id)) : false

  const selSector = selected?.type === "sector" ? sectors.data?.find((s) => s.id === selected.id) : undefined
  const sectorBuildings = selSector ? (buildings.data ?? []).filter((b) => b.sector_id === selSector.id) : []
  const buildingServices = sectorBuildings.length > 0 ? (services.data ?? []).filter((sv) => sectorBuildings.some((b) => b.id === sv.building_id)) : []

  const toggle = (key: keyof Layers) => setLayers((cur) => ({ ...cur, [key]: !cur[key] }))

  const layerLabels: [keyof Layers, string][] = [
    ["transit", tx("Transports", "Transit")],
    ["labels", tx("Étiquettes", "Labels")],
    ["reports", tx("Signalements", "Reports")],
    ["dangers", tx("Alertes", "Alerts")],
    ...(canSeeObservations ? [["observations", tx("Observations admin", "Admin observations")] as [keyof Layers, string]] : []),
  ]

  const publicVehicles = (transports.data ?? []).filter((t) => t.visibility === "public" && t.status === "active" && PUBLIC_TRANSPORT_TYPES.has(t.type))
  const dedicatedRefuges = openBuildings.filter((b) => REFUGE_PATTERN.test(`${b.name} ${b.description ?? ""}`))
  const securitySites = openBuildings.filter((b) => b.type === "security")
  const refugeBuildings = dedicatedRefuges.length > 0 ? dedicatedRefuges : securitySites

  const activeModes: { id: RouteMode; label: string; icon: typeof Footprints }[] = [
    { id: "walk", label: tx("À pied", "On foot"), icon: Footprints },
    { id: "bus", label: tx("Bus", "Bus"), icon: Bus },
    { id: "train", label: tx("Train", "Train"), icon: TrainFront },
    { id: "transit", label: tx("Tous", "All"), icon: Radar },
    { id: "mixed", label: tx("Mixte", "Mixed"), icon: Navigation },
  ]

  return (
    <Container className="max-w-[1680px] py-4 sm:py-6">
      <main className="relative isolate overflow-hidden rounded-[2rem] border border-[#36424e] bg-[#090e14] p-4 text-[#edf0f1] shadow-[0_30px_100px_-38px_rgba(3,8,14,.9)] sm:p-6 lg:p-8" data-tour="map">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_0%,rgba(194,164,116,.12),transparent_34%),radial-gradient(ellipse_at_8%_68%,rgba(61,93,119,.14),transparent_35%)]" />
        <div className="relative z-10">
          <header className="mb-6 flex flex-col justify-between gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-medium tracking-[.28em] text-[#d9c49f] uppercase">
                <span className="size-1.5 rounded-full bg-[#d9c49f] shadow-[0_0_12px_#d9c49f]" />
                {tx("Réseau civique · Cartographie orbitale", "Civic network · Orbital cartography")}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-light tracking-[-.045em] text-[#f4efe5] sm:text-5xl">
                {tx("Nova Terra", "Nova Terra")} <span className="text-[#d9c49f]">/</span> {tx("la carte", "the map")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9b3bc] sm:text-base">
                {tx("Explorez les secteurs en 3D, trouvez un itinéraire sûr et signalez un besoin directement depuis la ville.", "Explore districts in 3D, find a safe route and report an issue directly from the city.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge className="border border-white/10 bg-white/[.04] px-3 py-1.5 text-[#d9e0e5]">{sectors.data?.length ?? 0} {tx("secteurs", "sectors")}</Badge>
              <Badge className="border border-white/10 bg-white/[.04] px-3 py-1.5 text-[#d9e0e5]">{publicVehicles.length} {tx("services actifs", "active services")}</Badge>
              <Badge className="border border-[#c78474]/25 bg-[#c78474]/10 px-3 py-1.5 text-[#e7b9ad]">{avoidSectorIds.length} {tx("zones sous alerte", "alert zones")}</Badge>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="grid min-w-0 content-start gap-3">
              {/* Layer toggles */}
              <fieldset className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-white/10 bg-[#111923]/80 px-4 py-3 backdrop-blur-xl">
                <legend className="sr-only">{tx("Couches de la carte", "Map layers")}</legend>
                {layerLabels.map(([key, lbl]) => (
                  <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-[#c0c9cf] sm:text-sm">
                    <input type="checkbox" className="size-4 accent-[#d9c49f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9c49f]" checked={layers[key]} onChange={() => toggle(key)} />
                    {lbl}
                  </label>
                ))}
              </fieldset>

              {/* 3D Map */}
              <div className="relative">
                {/* GRID 01 badge */}
                <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg border border-white/10 bg-[#090e14]/80 px-3 py-2 font-mono text-[9px] tracking-[.18em] text-[#a8b2b9] uppercase backdrop-blur-md">
                  <span className="mb-1 block text-[#e3c994]">NT · GRID 01</span>
                  {tx("Réseau urbain", "Urban network")} · {tx("temps réel", "live feed")}
                </div>

                {/* Hover info card — docked top-left below GRID 01 badge */}
                {hoveredSid && (() => {
                  const sectorReports = mapData.reports.filter(r => r.sector_id === hoveredSid)
                  const sector = mapData.sectors.find(s => s.id === hoveredSid)
                  const r = sectorReports[0]
                  const statusColor: Record<string, string> = {
                    validated: "#4de1ff", received: "#6aa8ff", to_verify: "#ffb020",
                    rejected: "#ff4d6d", assigned: "#4dffb0", in_progress: "#4dffb0", resolved: "#7dff7d",
                  }
                  const col = r ? (statusColor[r.status] ?? "#4de1ff") : "#4de1ff"
                  return (
                    <div
                      className="pointer-events-none absolute top-16 left-4 z-10 w-72 rounded-xl border bg-[#090e14]/90 p-3 font-mono text-[10px] backdrop-blur-md"
                      style={{ borderColor: `${col}55` }}
                    >
                      {/* Sector header */}
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: sector?.color ?? col }}
                        />
                        <span className="font-bold text-white tracking-wide">
                          {sector ? `${sector.code} — ${sector.name}` : hoveredLabel}
                        </span>
                      </div>

                      {/* Report card */}
                      {r && (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[8px] uppercase tracking-[.18em]" style={{ color: col }}>
                              {r.status.replace(/_/g, " ")} · {r.source}
                            </span>
                            {sectorReports.length > 1 && (
                              <span className="rounded bg-white/10 px-1 text-[#a8b2b9]">
                                +{sectorReports.length - 1}
                              </span>
                            )}
                          </div>
                          <div className="mb-1 text-[11px] font-semibold leading-tight text-white">{r.title}</div>
                          {r.description && (
                            <p className="line-clamp-2 leading-relaxed text-[#a8b2b9]">{r.description}</p>
                          )}
                          {r.confidence_score != null && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[#a8b2b9]">conf.</span>
                              <div className="h-1 flex-1 rounded-full bg-white/10">
                                <div
                                  className="h-1 rounded-full transition-all"
                                  style={{ width: `${Math.round(r.confidence_score * 100)}%`, background: col }}
                                />
                              </div>
                              <span style={{ color: col }}>{Math.round(r.confidence_score * 100)}%</span>
                            </div>
                          )}
                        </>
                      )}

                      {!r && sector && (
                        <p className="text-[#a8b2b9]">
                          {tx("Aucun signalement", "No reports")} · act. {sector.activity_level}%
                        </p>
                      )}
                    </div>
                  )
                })()}

                <NovaTerraMap
                  data={mapData}
                  layers={layers}
                  routeIds={routeIds}
                  selectedSectorId={selected?.type === "sector" ? selected.id : null}
                  onSelectSector={(id) => setSelected(id ? { type: "sector", id } : null)}
                  onHover={(label, sid) => { setHoveredLabel(label); setHoveredSid(sid) }}
                  label={tx("Carte holographique 3D de Nova Terra", "Nova Terra 3D holographic map")}
                  className="shadow-[0_18px_60px_-28px_rgba(0,0,0,.9)]"
                />
              </div>

              {sectors.isLoading && <p className="text-sm text-[#a9b3bc]">{tx("Chargement du réseau urbain…", "Loading the city network…")}</p>}
              {!sectors.isLoading && (sectors.data?.length ?? 0) === 0 && (
                <p role="alert" className="rounded-xl border border-[#d97b7d]/30 bg-[#d97b7d]/10 p-3 text-sm text-[#f0b2b0]">
                  {tx("Aucune donnée cartographique disponible.", "No map data is available.")}
                </p>
              )}
            </div>

            <aside className="grid content-start gap-3" aria-label={tx("Détails et navigation", "Details and navigation")}>
              {/* Search */}
              <section className={PANEL} aria-labelledby="map-search">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id="map-search" className="text-sm font-medium tracking-wide text-[#eee9df]">{tx("Explorer la ville", "Explore the city")}</h2>
                  <Radar className="size-4 text-[#d9c49f]" aria-hidden />
                </div>
                <Label htmlFor="b-search" className="sr-only">{tx("Rechercher un bâtiment", "Search a building")}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7e8b95]" aria-hidden />
                  <Input id="b-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tx("Hôpital, mairie, secteur…", "Hospital, city hall, sector…")} className="border-white/10 bg-[#090e14]/80 pl-9 text-[#edf0f1] placeholder:text-[#74818c] focus-visible:ring-[#d9c49f]" />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 grid gap-1" aria-label={tx("Résultats de recherche", "Search results")}>
                    {matches.map((m) => (
                      <li key={`${m.type}-${m.id}`}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-2 py-2 text-left text-sm text-[#c6d0d7] hover:bg-white/[.06] focus-visible:outline-2 focus-visible:outline-[#d9c49f]"
                          onClick={() => setSelected({ type: "sector", id: m.sectorId })}
                        >
                          {m.label}
                          <span className="ml-2 text-xs text-[#8997a2]">{sectorName(m.sectorId)?.code}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim() && matches.length === 0 && <p className="mt-2 text-xs text-[#8997a2]">{tx("Aucun bâtiment ne correspond.", "No buildings match that search.")}</p>}
              </section>

              {/* Selected sector detail */}
              {selSector && (
                <section className={PANEL} aria-labelledby="map-detail" aria-live="polite">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[9px] tracking-[.2em] text-[#d9c49f] uppercase">{tx("Secteur sélectionné", "Selected sector")}</p>
                      <h2 id="map-detail" className="font-medium text-[#f0ece4]">{selSector.code} — {selSector.name}</h2>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-[#bec8ce]">
                    <p className="leading-5 text-[#aab5bd]">
                      {selSector.description}
                      <br />
                      <span className="text-xs">{tx("Activité urbaine", "Urban activity")} · {selSector.activity_level} %</span>
                    </p>
                    {sectorBuildings.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[#e4d2b1]">{tx("Bâtiments", "Buildings")}</p>
                        <ul className="grid gap-1">
                          {sectorBuildings.slice(0, 4).map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="min-w-0 truncate text-[#c6d0d7]">{b.name}</span>
                              <StatusBadge kind="building" value={b.status} />
                            </li>
                          ))}
                          {sectorBuildings.length > 4 && <li className="text-[10px] text-[#8997a2]">+ {sectorBuildings.length - 4} {tx("autres", "more")}</li>}
                        </ul>
                      </div>
                    )}
                    {buildingServices.length > 0 && (
                      <div>
                        <p className="font-medium text-[#e4d2b1]">{tx("Services présents", "Services here")}</p>
                        <ul className="list-disc pl-5 text-xs">
                          {buildingServices.slice(0, 3).map((sv) => (
                            <li key={sv.id}>
                              <Link className="underline decoration-[#d9c49f]/50 underline-offset-4 hover:text-[#f0d6a6]" to={`/services/${sv.slug}`}>{sv.name}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button asChild size="sm" className="w-full bg-[#d9c49f] text-[#18202a] hover:bg-[#ead9b8]">
                      <Link to={`/app/reports/new?sector=${selSector.id}`}>
                        {tx("Signaler dans ce secteur", "Report in this sector")}
                        <ArrowRight className="ml-2 size-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </section>
              )}

              {/* Route planner */}
              <section className={PANEL} aria-labelledby="map-route">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id="map-route" className="text-sm font-medium tracking-wide text-[#eee9df]">{tx("Planifier un itinéraire", "Plan a route")}</h2>
                  <Navigation className="size-4 text-[#d9c49f]" aria-hidden />
                </div>
                <div className="grid grid-cols-5 gap-1 rounded-xl border border-white/10 bg-[#090e14]/70 p-1" role="group" aria-label={tx("Mode de déplacement", "Travel mode")}>
                  {activeModes.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" aria-pressed={routeMode === id} onClick={() => setRouteMode(id)} className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-[#d9c49f] sm:gap-1.5 sm:px-1.5 sm:text-[11px] ${routeMode === id ? "bg-[#d9c49f] text-[#18202a]" : "text-[#aeb8c0] hover:bg-white/[.06]"}`}>
                      <Icon className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  <Select aria-label={tx("Départ", "From")} value={from} onChange={(e) => setFrom(e.target.value)} className="border-white/10 bg-[#090e14]/80 text-[#edf0f1] focus-visible:ring-[#d9c49f]">
                    <option value="">{tx("Choisir un départ…", "Choose a starting point…")}</option>
                    {openBuildings.map((b) => <option key={b.id} value={b.id}>{b.name} · {sectorName(b.sector_id)?.code}</option>)}
                  </Select>
                  <Select aria-label={tx("Destination", "To")} value={to} onChange={(e) => setTo(e.target.value)} className="border-white/10 bg-[#090e14]/80 text-[#edf0f1] focus-visible:ring-[#d9c49f]">
                    <option value="">{tx("Choisir une destination…", "Choose a destination…")}</option>
                    {openBuildings.map((b) => <option key={b.id} value={b.id}>{b.name} · {sectorName(b.sector_id)?.code}</option>)}
                  </Select>
                </div>
                {from && to && !route && (
                  <p role="alert" className="mt-3 rounded-lg border border-[#d97b7d]/25 bg-[#d97b7d]/10 p-2.5 text-xs leading-5 text-[#efb6b2]">
                    {routeMode === "transit"
                      ? tx("Aucune liaison publique active ne relie ces deux points. Essayez le mode combiné.", "No active public line connects these points. Try the mixed mode.")
                      : tx("Aucun itinéraire possible avec les bâtiments ouverts et les alertes actuelles.", "No route is available with open buildings and current alerts.")}
                  </p>
                )}
                {route && (
                  <div className="mt-3 rounded-xl border border-[#d9c49f]/20 bg-[#d9c49f]/[.06] p-3 text-sm" aria-live="polite">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[#f1ddb9]">≈ {estimateMinutes(route.cost)} {tx("min", "min")} · {route.sectorIds.length} {tx("secteurs", "sectors")}</p>
                      {routeTransports.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-[#bdc8ce]"><Bus className="size-3.5" aria-hidden />{routeTransports.length} {tx("ligne(s)", "line(s)")}</span>}
                    </div>
                    <ol className="mt-2 grid gap-1.5 text-xs leading-5 text-[#c2cbd0]">
                      {route.legs.slice(0, 6).map((leg, index) => (
                        <li key={`${leg.fromId}-${leg.toId}-${index}`} className="flex gap-2">
                          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[#d9c49f]">{String(index + 1).padStart(2, "0")}</span>
                          <span>{routeStepLabel(leg, sectors.data, buildings.data, transports.data, locale)}</span>
                        </li>
                      ))}
                      {route.legs.length > 6 && <li className="text-[#8997a2]">+ {route.legs.length - 6} {tx("étapes", "steps")}</li>}
                    </ol>
                    {crossesDanger && <p role="alert" className="mt-2 text-xs text-[#efaaa6]">{tx("Alerte : ce trajet traverse une zone dangereuse faute d'alternative plus sûre.", "Warning: this route crosses an alert area because no safer alternative is available.")}</p>}
                    {routeTransports.length > 0 && <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-4 text-[#9ba8b1]">{tx("Lignes publiques utilisées", "Public lines used")} · {routeTransports.map((t) => `${pickLabel(TRANSPORT_TYPE_LABELS, t.type, locale)} ${t.code}`).join(" · ")}</p>}
                  </div>
                )}
                <p className="mt-3 text-[10px] leading-4 text-[#8997a2]">{tx("Bus/navette et tram · train maglev · Tous : tram, maglev, navette, sky-pod, ferry et drone-taxi public actif.", "Bus/shuttle and tram · maglev train · All: tram, maglev, shuttle, sky-pod, ferry and active public drone taxi.")}</p>
              </section>

              {/* Safe locations */}
              <section className={`${PANEL} border-[#d9c49f]/15`} aria-labelledby="map-refuges">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#d9c49f]" aria-hidden />
                  <h2 id="map-refuges" className="text-sm font-medium text-[#eee9df]">{tx("Bunkers et points de repli", "Bunkers and safe locations")}</h2>
                </div>
                {dedicatedRefuges.length === 0 && securitySites.length > 0 && (
                  <p className="mb-3 text-[11px] leading-5 text-[#9ba8b1]">{tx("Aucun bunker dédié n'est déclaré. Les sites de sécurité ouverts sont proposés comme points de repli.", "No dedicated bunker is registered. Open security sites are shown as safe locations.")}</p>
                )}
                {refugeBuildings.length > 0 ? (
                  <ul className="grid gap-2">
                    {refugeBuildings.map((b) => {
                      const isRefuge = REFUGE_PATTERN.test(`${b.name} ${b.description ?? ""}`)
                      return (
                        <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-[#dbe1e4]">{b.name}</span>
                            <span className="text-[10px] text-[#8997a2]">{isRefuge ? tx("Bunker / refuge", "Bunker / shelter") : tx("Site de sécurité", "Security site")} · {sectorName(b.sector_id)?.code}</span>
                          </span>
                          <Button type="button" size="sm" variant="outline" className={`${ROUTE_BUTTON} h-8 shrink-0 px-2.5 text-[10px]`} aria-pressed={to === b.id} onClick={() => setTo(b.id)}>
                            {to === b.id ? tx("Choisi", "Selected") : tx("Destination", "Destination")}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-[#9ba8b1]">{tx("Aucun bunker ou refuge public n'est encore référencé.", "No public bunker or shelter is registered yet.")}</p>
                )}
              </section>

              {/* Alert zones */}
              {avoidSectorIds.length > 0 && (
                <section className="rounded-2xl border border-[#d97b7d]/25 bg-[#9f454b]/10 p-4 text-xs text-[#efb6b2]" aria-labelledby="map-zones">
                  <div className="mb-2 flex items-center gap-2">
                    <Activity className="size-4" aria-hidden />
                    <h2 id="map-zones" className="font-medium">{tx("Zones sous alerte", "Alert zones")}</h2>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {avoidSectorIds.map((id) => (
                      <li key={id}>
                        <span className="rounded-md border border-[#d97b7d]/20 bg-black/10 px-2 py-1">{sectorName(id)?.code} · {sectorName(id)?.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          {/* Accessible map directory */}
          <details className="mt-5 rounded-2xl border border-white/10 bg-[#111923]/60 p-4">
            <summary className="cursor-pointer text-xs font-medium tracking-wide text-[#b9c3c9]">{tx("Répertoire cartographique accessible", "Accessible map directory")}</summary>
            <ul className="mt-3 grid gap-1.5 text-xs text-[#aeb8c0] sm:grid-cols-2 lg:grid-cols-3">
              {(sectors.data ?? []).map((s) => (
                <li key={s.id}>
                  <button type="button" className="underline decoration-white/20 underline-offset-4 hover:text-[#f0d6a6]" onClick={() => setSelected({ type: "sector", id: s.id })}>
                    {s.code} — {s.name}
                  </button>
                  {" "}· {s.activity_level}% {tx("activité", "activity")}
                </li>
              ))}
            </ul>
          </details>

          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[10px] tracking-[.1em] text-[#778590] uppercase">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#8acac1]" />
              {tx("Réseau civique opérationnel", "Civic network online")}
            </span>
            <span>{tx("Données de simulation · Nova Terra · moteur 3D holographique", "Simulation data · Nova Terra · holographic 3D engine")}</span>
          </footer>
        </div>
      </main>
    </Container>
  )
}
