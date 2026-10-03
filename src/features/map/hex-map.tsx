import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { hexPoints } from "@/features/map/hex"
import type { Building, Sector, Transport } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"

export const HEX_SIZE = 100

export type MapSelection = { type: "sector" | "building" | "transport"; id: string } | null

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
}

interface View { x: number; y: number; w: number; h: number }

const BUILDING_FILL: Record<Building["status"], string> = {
  operational: "#e1c592",
  temporarily_closed: "#c78c5d",
  under_maintenance: "#c78c5d",
  restricted: "#ef777a",
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
  selected = null, onSelect, routePoints, editable = false, onMove, className,
}: HexMapProps) {
  const { tx } = useLocale()
  const hatchId = useId()
  const base = useMemo(() => boundsOf(sectors), [sectors])
  const [view, setView] = useState<View | null>(null)
  const current = view ?? base
  const svgRef = useRef<SVGSVGElement>(null)
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ kind: "pan" | "building" | "transport"; id?: string; startX: number; startY: number; origin: View; moved: boolean } | null>(null)
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

  const zoom = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    setView((v) => {
      const c = v ?? base
      const w = Math.min(base.w * 2, Math.max(base.w / 6, c.w * factor))
      const h = (w / c.w) * c.h
      const focus = anchor ?? { x: c.x + c.w / 2, y: c.y + c.h / 2 }
      const rx = (focus.x - c.x) / c.w
      const ry = (focus.y - c.y) / c.h
      return { x: focus.x - rx * w, y: focus.y - ry * h, w, h }
    })
  }, [base])

  useEffect(() => {
    const frame = mapFrameRef.current
    if (!frame) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const point = toSvg(event.clientX, event.clientY)
      const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 400 : 1)
      zoom(Math.exp(Math.max(-0.28, Math.min(0.28, delta * 0.0012))), point)
    }
    frame.addEventListener("wheel", onWheel, { passive: false })
    return () => frame.removeEventListener("wheel", onWheel)
  }, [toSvg, zoom])

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { kind: "pan", startX: event.clientX, startY: event.clientY, origin: current, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const startItemDrag = (event: ReactPointerEvent, kind: "building" | "transport", id: string) => {
    if (!editable) return
    event.stopPropagation()
    dragRef.current = { kind, id, startX: event.clientX, startY: event.clientY, origin: current, moved: false }
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
    <div ref={mapFrameRef} className={cn("relative overflow-hidden overscroll-contain rounded-xl border bg-card", className)}>
      <svg
        ref={svgRef}
        viewBox={`${current.x} ${current.y} ${current.w} ${current.h}`}
        className="h-[min(70vh,680px)] w-full touch-none select-none"
        aria-label={tx("Carte en ruche de Nova Terra", "Nova Terra hive map")}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.target !== svgRef.current) return
          if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(0.8) }
          if (event.key === "-") { event.preventDefault(); zoom(1.25) }
          if (event.key === "0") { event.preventDefault(); setView(null) }
        }}
      >
        <defs>
          <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--destructive)" strokeWidth="4" />
          </pattern>
          <pattern id={`${hatchId}-grid`} width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M42 0H0V42" fill="none" stroke="#b5c7d6" strokeOpacity=".055" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill="#e1c592" fillOpacity=".2" />
          </pattern>
          <radialGradient id={`${hatchId}-ambient`} cx="50%" cy="48%" r="72%">
            <stop offset="0%" stopColor="#1e2b38" />
            <stop offset="100%" stopColor="#090e15" />
          </radialGradient>
          <filter id={`${hatchId}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x={current.x} y={current.y} width={current.w} height={current.h} fill={`url(#${hatchId}-ambient)`} />
        <rect x={current.x} y={current.y} width={current.w} height={current.h} fill={`url(#${hatchId}-grid)`} />
        <circle cx={base.x + base.w / 2} cy={base.y + base.h / 2} r={Math.max(base.w, base.h) * 0.36} fill="none" stroke="#d8c29a" strokeOpacity=".1" strokeWidth="1" />
        <circle cx={base.x + base.w / 2} cy={base.y + base.h / 2} r={Math.max(base.w, base.h) * 0.48} fill="none" stroke="#99afbf" strokeOpacity=".08" strokeWidth="1" strokeDasharray="3 10" />

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
                stroke={isSelected ? "#f0d6a6" : sector.color}
                strokeWidth={isSelected ? 5 : 2}
                filter={isSelected ? `url(#${hatchId}-glow)` : undefined}
              />
              {layers.dangers && dangerSet.has(sector.id) && (
                <polygon points={hexPoints(sector.x, sector.y, HEX_SIZE - 6)} fill={`url(#${hatchId})`} fillOpacity={0.35} pointerEvents="none" />
              )}
              <text x={sector.x} y={sector.y - HEX_SIZE * 0.62} textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="1.5" fill="#f0e6d2" pointerEvents="none">{sector.code}</text>
              <text x={sector.x} y={sector.y + HEX_SIZE * 0.78} textAnchor="middle" fontSize="11" fill="#aebac5" pointerEvents="none">{sector.name}</text>
            </g>
          )
        })}

        {routePoints && routePoints.length > 1 && (
          <g pointerEvents="none" filter={`url(#${hatchId}-glow)`}>
            <polyline points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#dfbd83" strokeOpacity=".46" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#f4d9a5" strokeWidth="3" strokeDasharray="8 8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
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
              <circle cx={p.x} cy={p.y} r={isSelected ? 13 : 10} fill={BUILDING_FILL[building.status]} stroke="#0d141c" strokeWidth={isSelected ? 4 : 2} filter={isSelected ? `url(#${hatchId}-glow)` : undefined} />
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
              <rect x={p.x - 8} y={p.y - 8} width={16} height={16} transform={`rotate(45 ${p.x} ${p.y})`} fill={t.status === "active" ? "#8acac1" : "#687482"} stroke={isSelected ? "#f0d6a6" : "#0d141c"} strokeWidth={isSelected ? 4 : 2} />
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="9" fill="#dbe4eb" pointerEvents="none">{t.code}</text>
            </g>
          )
        })}

        {layers.reports && reportMarkers.map((m) => (
          <g
            key={m.id}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <img> pour un marqueur
            role="img"
            aria-label={m.label}
          >
            <path d={`M${m.x},${m.y - 12} l8,14 h-16 z`} fill="#f0797c" stroke="#0d141c" strokeWidth="2" />
            <title>{m.label}</title>
          </g>
        ))}
        {layers.observations && observationMarkers.map((m) => (
          <g
            key={m.id}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG : pas de <img> pour un marqueur
            role="img"
            aria-label={m.label}
          >
            <circle cx={m.x} cy={m.y} r="7" fill="none" stroke="#9f8af2" strokeWidth="3" strokeDasharray="3 2" />
            <title>{m.label}</title>
          </g>
        ))}
      </svg>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <Button type="button" size="icon-sm" variant="outline" className="border-white/15 bg-slate-950/80 text-slate-100 shadow-lg backdrop-blur hover:bg-slate-800" aria-label={tx("Zoom avant", "Zoom in")} onClick={() => zoom(0.8)}><Plus aria-hidden /></Button>
        <Button type="button" size="icon-sm" variant="outline" className="border-white/15 bg-slate-950/80 text-slate-100 shadow-lg backdrop-blur hover:bg-slate-800" aria-label={tx("Zoom arrière", "Zoom out")} onClick={() => zoom(1.25)}><Minus aria-hidden /></Button>
        <Button type="button" size="icon-sm" variant="outline" className="border-white/15 bg-slate-950/80 text-slate-100 shadow-lg backdrop-blur hover:bg-slate-800" aria-label={tx("Réinitialiser la vue", "Reset view")} onClick={() => setView(null)}><RotateCcw aria-hidden /></Button>
      </div>
    </div>
  )
}
