/** Géométrie de la ruche : grille hexagonale en coordonnées axiales (q, r), « pointy-top ». */

export const SQRT3 = Math.sqrt(3)

export interface Point {
  x: number
  y: number
}

export interface Axial {
  q: number
  r: number
}

/** Centre en pixels d'une case : x = size·√3·(q + r/2), y = size·1,5·r (même formule que le seed SQL). */
export function axialToPixel(q: number, r: number, size: number): Point {
  return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r }
}

/** Arrondit des coordonnées axiales fractionnaires vers la case la plus proche (via les coordonnées cubiques). */
export function roundAxial(q: number, r: number): Axial {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  const rs = Math.round(s)
  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return { q: rq + 0, r: rr + 0 }
}

/** Case sous un point en pixels (utile pour déplacer / ajouter un secteur à la souris). */
export function pixelToAxial(x: number, y: number, size: number): Axial {
  const r = y / (size * 1.5)
  const q = x / (size * SQRT3) - r / 2
  return roundAxial(q, r)
}

/** Sommets d'un hexagone sous forme de chaîne `points` SVG. */
export function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    points.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(" ")
}

/** Distance (en cases) entre deux cases. */
export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// ---------------------------------------------------------------------------
// Itinéraires : graphe « bâtiment ↔ centre de secteur ↔ centres voisins », plus court chemin de Dijkstra.
// ---------------------------------------------------------------------------

export interface RouteSector extends Axial {
  id: string
  code?: string
  name?: string
  x: number
  y: number
}

export interface RouteBuilding {
  id: string
  name?: string
  sector_id: string
  x: number
  y: number
  status: "operational" | "temporarily_closed" | "under_maintenance" | "restricted"
}

export interface RouteOptions {
  /** Secteurs à éviter (alertes actives) : traversés seulement si aucune autre voie n'existe. */
  avoidSectorIds?: string[]
  /** Réseau public actif. Les terminus sont déduits du nom de ligne lorsqu'ils sont renseignés. */
  transports?: RouteTransport[]
  /** Les modes bus et train autorisent la marche d'approche, le mode transit calcule les seules lignes publiques. */
  mode?: RouteMode
}

export type RouteMode = "walk" | "bus" | "train" | "transit" | "mixed"

export interface RouteTransport {
  id: string
  code: string
  type: string
  visibility: "public" | "personal"
  status: string
  sector_id: string
  route_name: string | null
}

export interface RouteLeg {
  fromId: string
  toId: string
  mode: "walk" | "transit"
  transportId?: string
  lineName?: string
}

export interface RouteResult {
  /** Identifiants des nœuds (bâtiments et secteurs) dans l'ordre du trajet. */
  nodes: string[]
  /** Secteurs traversés, dans l'ordre, sans doublon consécutif. */
  sectorIds: string[]
  /** Étapes explicites pour afficher les correspondances et les accès à pied. */
  legs: RouteLeg[]
  cost: number
}

const AVOID_PENALTY = 25
const TRANSIT_TYPES = new Set(["hover_tram", "maglev", "sky_pod", "shuttle", "drone_taxi", "ferry"])
const BUS_TYPES = new Set(["hover_tram", "shuttle"])

function routeEndpointSector(endpoint: string, sectors: RouteSector[], buildings: RouteBuilding[]): string | undefined {
  const normalized = endpoint.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()
  if (normalized.length < 3) return undefined
  const sector = sectors.find((item) => {
    const code = item.code?.toLocaleLowerCase() ?? ""
    const name = `${item.code ?? ""} ${item.name ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()
    const words = name.split(/[^a-z0-9-]+/).filter((word) => word.length >= 4)
    return name.includes(normalized) || (code.length > 0 && normalized.includes(code)) || words.some((word) => normalized.includes(word))
  })
  if (sector) return sector.id
  const building = buildings.find((item) => {
    const name = item.name?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase() ?? ""
    return name.length > 0 && (name.includes(normalized) || normalized.includes(name))
  })
  return building?.sector_id
}

function transitSpeed(type: string): number {
  if (type === "maglev") return 0.08
  if (type === "drone_taxi") return 0.14
  if (type === "hover_tram") return 0.16
  if (type === "sky_pod") return 0.18
  return 0.22
}

/** Un bâtiment est utilisable comme départ ou arrivée s'il n'est pas fermé ni en maintenance. */
export function isBuildingOpen(building: Pick<RouteBuilding, "status">): boolean {
  return building.status === "operational"
}

/** Retourne le trajet le plus court entre deux bâtiments, ou null s'il est impossible (bâtiment fermé, secteur isolé…). */
export function findRoute(
  sectors: RouteSector[],
  buildings: RouteBuilding[],
  fromId: string,
  toId: string,
  options: RouteOptions = {}
): RouteResult | null {
  const from = buildings.find((b) => b.id === fromId)
  const to = buildings.find((b) => b.id === toId)
  if (!from || !to || !isBuildingOpen(from) || !isBuildingOpen(to)) return null
  if (fromId === toId) return { nodes: [fromId], sectorIds: [from.sector_id], legs: [], cost: 0 }

  const avoid = new Set(options.avoidSectorIds ?? [])
  const mode = options.mode ?? "walk"
  const sectorById = new Map(sectors.map((s) => [s.id, s]))
  const adjacency = new Map<string, { to: string; cost: number; mode: "walk" | "transit"; transportId?: string; lineName?: string }[]>()
  const link = (a: string, b: string, cost: number, edge: { mode: "walk" | "transit"; transportId?: string; lineName?: string }) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), { to: b, cost, ...edge }])
    adjacency.set(b, [...(adjacency.get(b) ?? []), { to: a, cost, ...edge }])
  }

  for (const building of buildings) {
    if (!isBuildingOpen(building) && building.id !== fromId && building.id !== toId) continue
    const sector = sectorById.get(building.sector_id)
    if (sector) link(building.id, sector.id, distance(building, sector) + 1, { mode: "walk" })
  }

  if (mode !== "transit") {
    for (let i = 0; i < sectors.length; i += 1) {
      for (let j = i + 1; j < sectors.length; j += 1) {
        if (hexDistance(sectors[i], sectors[j]) !== 1) continue
        const base = distance(sectors[i], sectors[j])
        const penalty = (avoid.has(sectors[i].id) ? AVOID_PENALTY : 1) * (avoid.has(sectors[j].id) ? AVOID_PENALTY : 1)
        const approachCost = mode === "bus" || mode === "train" ? base * 4 : base
        link(sectors[i].id, sectors[j].id, approachCost * penalty, { mode: "walk" })
      }
    }
  }

  if (mode !== "walk") {
    for (const transport of options.transports ?? []) {
      if (transport.visibility !== "public" || transport.status !== "active" || !TRANSIT_TYPES.has(transport.type)) continue
      if (mode === "bus" && !BUS_TYPES.has(transport.type)) continue
      if (mode === "train" && transport.type !== "maglev") continue
      const endpoints = transport.route_name?.split(/⇄|↔|→|->|\bvers\b|\bto\b/i).map((part) => part.trim()).filter(Boolean) ?? []
      const stops = endpoints.map((endpoint) => routeEndpointSector(endpoint, sectors, buildings)).filter((id): id is string => Boolean(id && sectorById.has(id)))
      const uniqueStops = Array.from(new Set(stops))
      const connect = (a: string, b: string) => {
        if (a === b) return
        const start = sectorById.get(a)
        const end = sectorById.get(b)
        if (!start || !end) return
        const penalty = (avoid.has(a) ? AVOID_PENALTY : 1) * (avoid.has(b) ? AVOID_PENALTY : 1)
        const cost = distance(start, end) * transitSpeed(transport.type) + 12
        link(a, b, cost * penalty, { mode: "transit", transportId: transport.id, lineName: transport.route_name ?? transport.code })
      }
      for (let i = 0; i < uniqueStops.length - 1; i += 1) connect(uniqueStops[i], uniqueStops[i + 1])

      // The seeded city describes the drone taxi as an on-demand service without fixed termini.
      if (transport.type === "drone_taxi" && uniqueStops.length < 2 && transport.route_name?.toLocaleLowerCase().includes("demande")) {
        for (let i = 0; i < sectors.length; i += 1) {
          for (let j = i + 1; j < sectors.length; j += 1) connect(sectors[i].id, sectors[j].id)
        }
      }
    }
  }

  const best = new Map<string, number>([[fromId, 0]])
  const previous = new Map<string, { from: string; edge: { mode: "walk" | "transit"; transportId?: string; lineName?: string } }>()
  const visited = new Set<string>()
  const queue: [number, string][] = [[0, fromId]]
  while (queue.length > 0) {
    queue.sort((a, b) => a[0] - b[0])
    const [cost, node] = queue.shift() as [number, string]
    if (visited.has(node)) continue
    visited.add(node)
    if (node === toId) break
    for (const edge of adjacency.get(node) ?? []) {
      const next = cost + edge.cost
      if (next < (best.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        best.set(edge.to, next)
        previous.set(edge.to, { from: node, edge })
        queue.push([next, edge.to])
      }
    }
  }
  if (!best.has(toId)) return null

  const legs: RouteLeg[] = []
  for (let at = toId; at !== fromId;) {
    const step = previous.get(at)
    if (!step) return null
    legs.unshift({ fromId: step.from, toId: at, ...step.edge })
    at = step.from
  }
  const nodes = [fromId, ...legs.map((leg) => leg.toId)]
  const sectorIds: string[] = []
  for (const id of nodes) {
    const sectorId = sectorById.has(id) ? id : buildings.find((b) => b.id === id)?.sector_id
    if (sectorId && sectorIds[sectorIds.length - 1] !== sectorId) sectorIds.push(sectorId)
  }
  return { nodes, sectorIds, legs, cost: best.get(toId) ?? 0 }
}

/** Durée estimée en minutes (1 unité de carte ≈ 10 m, marche + correspondances à 5 km/h ≈ 83 m/min). */
export function estimateMinutes(cost: number): number {
  return Math.max(1, Math.round((cost * 10) / 83))
}
