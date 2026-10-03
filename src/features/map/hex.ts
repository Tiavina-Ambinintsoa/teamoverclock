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
  x: number
  y: number
}

export interface RouteBuilding {
  id: string
  sector_id: string
  x: number
  y: number
  status: "operational" | "temporarily_closed" | "under_maintenance" | "restricted"
}

export interface RouteOptions {
  /** Secteurs à éviter (alertes actives) : traversés seulement si aucune autre voie n'existe. */
  avoidSectorIds?: string[]
}

export interface RouteResult {
  /** Identifiants des nœuds (bâtiments et secteurs) dans l'ordre du trajet. */
  nodes: string[]
  /** Secteurs traversés, dans l'ordre, sans doublon consécutif. */
  sectorIds: string[]
  cost: number
}

const AVOID_PENALTY = 25

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
  if (fromId === toId) return { nodes: [fromId], sectorIds: [from.sector_id], cost: 0 }

  const avoid = new Set(options.avoidSectorIds ?? [])
  const sectorById = new Map(sectors.map((s) => [s.id, s]))
  const adjacency = new Map<string, { to: string; cost: number }[]>()
  const link = (a: string, b: string, cost: number) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), { to: b, cost }])
    adjacency.set(b, [...(adjacency.get(b) ?? []), { to: a, cost }])
  }

  for (const building of buildings) {
    if (!isBuildingOpen(building) && building.id !== fromId && building.id !== toId) continue
    const sector = sectorById.get(building.sector_id)
    if (sector) link(building.id, sector.id, distance(building, sector) + 1)
  }
  for (let i = 0; i < sectors.length; i += 1) {
    for (let j = i + 1; j < sectors.length; j += 1) {
      if (hexDistance(sectors[i], sectors[j]) !== 1) continue
      const base = distance(sectors[i], sectors[j])
      const penalty = (avoid.has(sectors[i].id) ? AVOID_PENALTY : 1) * (avoid.has(sectors[j].id) ? AVOID_PENALTY : 1)
      link(sectors[i].id, sectors[j].id, base * penalty)
    }
  }

  const best = new Map<string, number>([[fromId, 0]])
  const previous = new Map<string, string>()
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
        previous.set(edge.to, node)
        queue.push([next, edge.to])
      }
    }
  }
  if (!best.has(toId)) return null

  const nodes: string[] = []
  for (let at: string | undefined = toId; at !== undefined; at = previous.get(at)) nodes.unshift(at)
  const sectorIds: string[] = []
  for (const id of nodes) {
    const sectorId = sectorById.has(id) ? id : buildings.find((b) => b.id === id)?.sector_id
    if (sectorId && sectorIds[sectorIds.length - 1] !== sectorId) sectorIds.push(sectorId)
  }
  return { nodes, sectorIds, cost: best.get(toId) ?? 0 }
}

/** Durée estimée en minutes (1 unité de carte ≈ 10 m, marche + correspondances à 5 km/h ≈ 83 m/min). */
export function estimateMinutes(cost: number): number {
  return Math.max(1, Math.round((cost * 10) / 83))
}
