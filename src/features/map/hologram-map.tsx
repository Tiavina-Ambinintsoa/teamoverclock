import { useEffect, useRef, useState, type ReactNode } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { NovaTerraEngine, type Anchor, type Layers, type MapData, type Pick } from "@/features/map/engine"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"

export type { Layers, MapData, Pick }

interface HologramMapProps {
  data: MapData
  layers: Layers
  selected: Pick | null
  onSelect: (pick: Pick | null) => void
  routeSectorIds: string[] | null
  /** Zone d'alerte à isoler ; null = toutes les alertes actives. */
  dangerId: string | null
  /** Contenu du panneau holographique, affiché près de l'objet sélectionné. */
  panel?: ReactNode
  onUnsupported?: () => void
  className?: string
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Carte 3D holographique : le moteur Three.js dessine la ville, le panneau HTML suit l'objet sélectionné. */
export function HologramMap({ data, layers, selected, onSelect, routeSectorIds, dangerId, panel, onUnsupported, className }: HologramMapProps) {
  const { tx } = useLocale()
  const reduceMotion = useReducedMotion()
  const boxRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const engineRef = useRef<NovaTerraEngine | null>(null)
  const panelSize = useRef({ w: 352, h: 320 })
  const dockedRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  const onUnsupportedRef = useRef(onUnsupported)
  const dataRef = useRef(data)
  const [docked, setDocked] = useState(false)
  const [hover, setHover] = useState("")
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
    onUnsupportedRef.current = onUnsupported
    dataRef.current = data
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const placePanel = (anchor: Anchor | null) => {
      const wrap = panelRef.current
      const box = boxRef.current
      const line = lineRef.current
      const dot = dotRef.current
      if (!box) return
      if (!anchor || dockedRef.current || !wrap) {
        line?.setAttribute("opacity", "0")
        dot?.setAttribute("opacity", "0")
        if (wrap) wrap.style.transform = ""
        return
      }
      const W = box.clientWidth
      const H = box.clientHeight
      const { w, h } = panelSize.current
      const toRight = anchor.x < W / 2
      const x = clamp(toRight ? anchor.x + 72 : anchor.x - 72 - w, 8, Math.max(8, W - w - 8))
      const y = clamp(anchor.y - h / 2, 8, Math.max(8, H - h - 8))
      wrap.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      const opacity = anchor.visible ? "1" : "0"
      const edgeX = toRight ? x : x + w
      const edgeY = clamp(anchor.y, y + 18, y + h - 18)
      line?.setAttribute("x1", anchor.x.toFixed(1))
      line?.setAttribute("y1", anchor.y.toFixed(1))
      line?.setAttribute("x2", edgeX.toFixed(1))
      line?.setAttribute("y2", edgeY.toFixed(1))
      line?.setAttribute("opacity", opacity)
      dot?.setAttribute("cx", anchor.x.toFixed(1))
      dot?.setAttribute("cy", anchor.y.toFixed(1))
      dot?.setAttribute("opacity", opacity)
    }
    let engine: NovaTerraEngine
    try {
      engine = new NovaTerraEngine(host, {
        onSelect: (pick) => onSelectRef.current(pick),
        onAnchor: placePanel,
        onHover: setHover,
      })
    } catch {
      onUnsupportedRef.current?.()
      return
    }
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => {
      const next = box.clientWidth < 640
      dockedRef.current = next
      setDocked(next)
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === boxRef.current)
    document.addEventListener("fullscreenchange", syncFullscreen)
    return () => document.removeEventListener("fullscreenchange", syncFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    const box = boxRef.current
    if (!box) return
    setFullscreenError(null)
    try {
      if (document.fullscreenElement === box) await document.exitFullscreen()
      else await box.requestFullscreen()
    } catch {
      setFullscreenError(tx("Le mode plein écran n’est pas disponible.", "Fullscreen mode is unavailable."))
    }
  }

  const showPanel = selected !== null && panel !== undefined

  useEffect(() => {
    const wrap = panelRef.current
    if (!wrap) return
    const observer = new ResizeObserver(() => {
      panelSize.current = { w: wrap.offsetWidth, h: wrap.offsetHeight }
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [showPanel, docked])

  useEffect(() => { engineRef.current?.setPrefs({ reduceMotion }) }, [reduceMotion])
  useEffect(() => { engineRef.current?.setLayers(layers) }, [layers])
  useEffect(() => { engineRef.current?.setData(dataRef.current) }, [data.sectors, data.buildings, data.transports, data.observations])
  useEffect(() => { engineRef.current?.setReports(data.reports) }, [data.reports])
  useEffect(() => { engineRef.current?.setDangers(data.dangers) }, [data.dangers])
  useEffect(() => { engineRef.current?.setDanger(dangerId) }, [dangerId])
  useEffect(() => { engineRef.current?.setRoute(routeSectorIds) }, [routeSectorIds])
  useEffect(() => { engineRef.current?.select(selected) }, [selected, data.sectors.length, data.buildings.length, data.reports.length])

  return (
    <section
      ref={boxRef}
      className={cn("holo-map relative isolate min-h-[28rem] overflow-hidden rounded-2xl border border-primary/30 bg-[oklch(0.08_0.03_272)] shadow-[0_0_40px_-24px_var(--primary)]", className)}
      aria-label={tx("Carte holographique 3D de Nova Terra. Une version texte et des filtres sont disponibles autour de la carte.", "3D holographic map of Nova Terra. A text version and filters are available around the map.")}
    >
      <div ref={hostRef} className="absolute inset-0 [&>canvas]:size-full" />

      <svg className="pointer-events-none absolute inset-0 z-10 size-full" aria-hidden="true">
        <line ref={lineRef} className="holo-link-line" opacity="0" />
        <circle ref={dotRef} className="holo-link-dot" r="4" opacity="0" />
      </svg>

      <div className="holo-hud pointer-events-none absolute top-3 left-4 z-10" aria-hidden="true">Nova Terra // Holo survey</div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute top-2 right-2 z-30"
        aria-label={fullscreen ? tx("Quitter le plein écran", "Exit fullscreen") : tx("Plein écran", "Enter fullscreen")}
        title={fullscreen ? tx("Quitter le plein écran", "Exit fullscreen") : tx("Plein écran", "Fullscreen")}
        onClick={() => void toggleFullscreen()}
      >
        {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      </Button>
      {fullscreenError && (
        <p className="absolute right-3 bottom-3 z-30 rounded-md bg-background/90 px-3 py-2 text-sm text-destructive" role="alert">
          {fullscreenError}
        </p>
      )}
      {(!showPanel || hover) && (
        <div className="holo-hud pointer-events-none absolute bottom-3 left-4 z-10 hidden sm:block" aria-hidden="true">
          {hover || tx("Glisser : pivoter · Molette : zoom · Clic : détails", "Drag: rotate · Wheel: zoom · Click: details")}
        </div>
      )}

      {showPanel && (
        <div
          ref={panelRef}
          className={cn(
            "absolute z-20 will-change-transform",
            docked ? "inset-x-2 bottom-2 max-h-[62%]" : "top-0 left-0 w-[min(22rem,calc(100%-1rem))] max-h-[calc(100%-1rem)]"
          )}
        >
          {panel}
        </div>
      )}
    </section>
  )
}
