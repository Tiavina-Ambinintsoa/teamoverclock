import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { hexPoints } from "@/features/map/hex"
import type { Building, Sector, Transport } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"

export const HEX_SIZE = 100

export type MapSelection = { type: "sector" | "building" | "transport" | "report"; id: string } | null

export interface MapLayers {
  sectors: boolean
  buildings: boolean
  transports: boolean
  dangers: boolean
  reports: boolean
  observations: boolean
}

export interface MapMarker {
  id: string
  x: number
  y: number
  label: string
}

export interface HexMapProps {
  sectors: Sector[]
  buildings: Building[]
  transports: Transport[]
  layers: MapLayers
  dangerSectorIds?: string[]
  reportMarkers?: MapMarker[]
  observationMarkers?: MapMarker[]
  selected?: MapSelection
  onSelect?: (selection: MapSelection) => void
  /** Points (x, y) du trajet à tracer. */
  routePoints?: { x: number; y: number }[]
  /** Mode édition (administrateur) : glisser-déposer des bâtiments, transports et secteurs. */
  editable?: boolean
  onMove?: (type: "building" | "transport", id: string, x: number, y: number) => void
  className?: string
  mapClassName?: string
}

interface View { x: number; y: number; w: number; h: number }

const BUILDING_FILL: Record<Building["status"], string> = {
  operational: "var(--primary)",
  temporarily_closed: "var(--highlight)",
  under_maintenance: "var(--highlight)",
  restricted: "var(--destructive)",
}

function boundsOf(sectors: Sector[]): View {
  if (sectors.length === 0) return { x: -200, y: -200, w: 400, h: 400 }
  const xs = sectors.flatMap((s) => [s.x - HEX_SIZE, s.x + HEX_SIZE])
  const ys = sectors.flatMap((s) => [s.y - HEX_SIZE, s.y + HEX_SIZE])
  const x = Math.min(...xs) - 20
  const y = Math.min(...ys) - 20
  return { x, y, w: Math.max(...xs) - x + 20, h: Math.max(...ys) - y + 20 }
}

/**
 * Carte en ruche (SVG pur) : secteurs hexagonaux, bâtiments, transports, zones d'alerte, signalements validés.
 * Clavier : Tab pour parcourir les marqueurs, Entrée pour sélectionner. Une liste textuelle équivalente est fournie par la page.
 */
export function HexMap({
  sectors, buildings, transports, layers, dangerSectorIds = [], reportMarkers = [], observationMarkers = [],
  selected = null, onSelect, routePoints, editable = false, onMove, className, mapClassName,
}: HexMapProps) {
  const { tx } = useLocale()
  const hatchId = useId()
  const base = useMemo(() => boundsOf(sectors), [sectors])
  const [view, setView] = useState<View | null>(null)
  const current = view ?? base
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ kind: "pan" | "building" | "transport"; id?: string; startX: number; startY: number; origin: View; moved: boolean; captured: boolean } | null>(null)
  const [dragPos, setDragPos] = useState<{ type: string; id: string; x: number; y: number } | null>(null)

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const p = point.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const zoom = (factor: number) => {
    setView((v) => {
      const c = v ?? base
      const w = Math.min(base.w * 2, Math.max(base.w / 6, c.w * factor))
      const h = (w / c.w) * c.h
      return { x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h }
    })
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { kind: "pan", startX: event.clientX, startY: event.clientY, origin: current, moved: false, captured: false }
  }
  const startItemDrag = (event: ReactPointerEvent, kind: "building" | "transport", id: string) => {
    if (!editable) return
    event.stopPropagation()
    dragRef.current = { kind, id, startX: event.clientX, startY: event.clientY, origin: current, moved: false, captured: false }
    svgRef.current?.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
    if (drag.kind === "pan") {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect || !drag.moved) return
      if (!drag.captured) {
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.captured = true
      }
      setView({ ...drag.origin, x: drag.origin.x - (dx / rect.width) * drag.origin.w, y: drag.origin.y - (dy / rect.height) * drag.origin.h })
    } else if (drag.id && drag.moved) {
      const p = toSvg(event.clientX, event.clientY)
      setDragPos({ type: drag.kind, id: drag.id, x: Math.round(p.x), y: Math.round(p.y) })
    }
  }
  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag && drag.kind !== "pan" && drag.id && dragPos && drag.moved) onMove?.(drag.kind, drag.id, dragPos.x, dragPos.y)
    setDragPos(null)
  }

  const pos = (type: "building" | "transport", item: { id: string; x: number; y: number }) =>
    dragPos && dragPos.type === type && dragPos.id === item.id ? { x: dragPos.x, y: dragPos.y } : { x: item.x, y: item.y }
  const activate = (selection: MapSelection) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect?.(selection)
    }
  }
  const dangerSet = new Set(dangerSectorIds)

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card", className)}>
      <svg
        ref={svgRef}
        viewBox={`${current.x} ${current.y} ${current.w} ${current.h}`}
        className={cn("h-[min(70vh,640px)] w-full touch-none select-none", mapClassName)}
        aria-label={tx("Carte en ruche de Nova Terra", "Nova Terra hive map")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(event) => zoom(event.deltaY > 0 ? 1.15 : 0.87)}
      >
        <defs>
          <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--destructive)" strokeWidth="4" />
          </pattern>
        </defs>

        {layers.sectors && sectors.map((sector) => {
          const isSelected = selected?.type === "sector" && selected.id === sector.id
          return (
            <g
              key={sector.id}
              tabIndex={0}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <button> natif, role + tabIndex + clavier gérés ci-dessous
              role="button"
              aria-label={`${sector.code} ${sector.name}`}
              onClick={() => onSelect?.({ type: "sector", id: sector.id })}
              onKeyDown={activate({ type: "sector", id: sector.id })}
              className="cursor-pointer outline-none focus-visible:[&>polygon]:stroke-[5]"
            >
              <polygon
                points={hexPoints(sector.x, sector.y, HEX_SIZE - 2)}
                fill={sector.color}
                fillOpacity={0.18 + (sector.activity_level / 100) * 0.35}
                stroke={isSelected ? "var(--foreground)" : sector.color}
                strokeWidth={isSelected ? 5 : 2}
              />
              {layers.dangers && dangerSet.has(sector.id) && (
                <polygon points={hexPoints(sector.x, sector.y, HEX_SIZE - 6)} fill={`url(#${hatchId})`} fillOpacity={0.35} pointerEvents="none" />
              )}
              <text x={sector.x} y={sector.y - HEX_SIZE * 0.62} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)" pointerEvents="none">{sector.code}</text>
              <text x={sector.x} y={sector.y + HEX_SIZE * 0.78} textAnchor="middle" fontSize="11" fill="var(--foreground)" pointerEvents="none">{sector.name}</text>
            </g>
          )
        })}

        {routePoints && routePoints.length > 1 && (
          <polyline points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--highlight)" strokeWidth="5" strokeDasharray="10 6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        )}

        {layers.buildings && buildings.map((building) => {
          const p = pos("building", building)
          const isSelected = selected?.type === "building" && selected.id === building.id
          return (
            <g
              key={building.id}
              tabIndex={0}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <button> natif, role + tabIndex + clavier gérés ci-dessous
              role="button"
              aria-label={`${building.name} (${building.status})`}
              onClick={() => onSelect?.({ type: "building", id: building.id })}
              onKeyDown={activate({ type: "building", id: building.id })}
              onPointerDown={(e) => startItemDrag(e, "building", building.id)}
              className={cn("outline-none focus-visible:[&>circle]:stroke-[4]", editable ? "cursor-grab" : "cursor-pointer")}
            >
              <circle cx={p.x} cy={p.y} r={isSelected ? 13 : 10} fill={BUILDING_FILL[building.status]} stroke="var(--background)" strokeWidth={isSelected ? 4 : 2} />
              {building.status !== "operational" && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--background)" pointerEvents="none">{building.status === "restricted" ? "!" : "×"}</text>}
              <title>{building.name}</title>
            </g>
          )
        })}

        {layers.transports && transports.map((t) => {
          const p = pos("transport", t)
          const isSelected = selected?.type === "transport" && selected.id === t.id
          return (
            <g
              key={t.id}
              tabIndex={0}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <button> natif, role + tabIndex + clavier gérés ci-dessous
              role="button"
              aria-label={`${t.code} (${t.status})`}
              onClick={() => onSelect?.({ type: "transport", id: t.id })}
              onKeyDown={activate({ type: "transport", id: t.id })}
              onPointerDown={(e) => startItemDrag(e, "transport", t.id)}
              className={cn("outline-none focus-visible:[&>rect]:stroke-[4]", editable ? "cursor-grab" : "cursor-pointer")}
            >
              <rect x={p.x - 8} y={p.y - 8} width={16} height={16} transform={`rotate(45 ${p.x} ${p.y})`} fill={t.status === "active" ? "var(--chart-2)" : "var(--muted-foreground)"} stroke={isSelected ? "var(--foreground)" : "var(--background)"} strokeWidth={isSelected ? 4 : 2} />
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="9" fill="var(--foreground)" pointerEvents="none">{t.code}</text>
            </g>
          )
        })}

        {layers.reports && reportMarkers.map((m) => {
          const isSelected = selected?.type === "report" && selected.id === m.id
          return (
            <g
              key={m.id}
              tabIndex={0}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : le marqueur est sélectionnable au clavier
              role="button"
              aria-label={m.label}
              onClick={() => onSelect?.({ type: "report", id: m.id })}
              onKeyDown={activate({ type: "report", id: m.id })}
              className="cursor-pointer outline-none focus-visible:[&>path]:stroke-[4]"
            >
              <path d={`M${m.x},${m.y - 12} l8,14 h-16 z`} fill="var(--destructive)" stroke={isSelected ? "var(--foreground)" : "var(--background)"} strokeWidth={isSelected ? 4 : 2} />
              <title>{m.label}</title>
            </g>
          )
        })}
        {layers.observations && observationMarkers.map((m) => (
          <g
            key={m.id}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <img> pour un marqueur
            role="img"
            aria-label={m.label}
          >
            <circle cx={m.x} cy={m.y} r="7" fill="none" stroke="var(--chart-3)" strokeWidth="3" strokeDasharray="3 2" />
            <title>{m.label}</title>
          </g>
        ))}
      </svg>

      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <Button type="button" size="icon-sm" variant="outline" aria-label={tx("Zoom avant", "Zoom in")} onClick={() => zoom(0.8)}><Plus aria-hidden /></Button>
        <Button type="button" size="icon-sm" variant="outline" aria-label={tx("Zoom arrière", "Zoom out")} onClick={() => zoom(1.25)}><Minus aria-hidden /></Button>
        <Button type="button" size="icon-sm" variant="outline" aria-label={tx("Réinitialiser la vue", "Reset view")} onClick={() => setView(null)}><RotateCcw aria-hidden /></Button>
      </div>
    </div>
  )
}
