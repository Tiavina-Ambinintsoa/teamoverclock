import { useEffect, useRef, useState } from "react"
import { RotateCw } from "lucide-react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

import type { Danger, EngineEvents, Layers, MapData, MapReport, Observation } from "./nova-terra-engine"

export type { Danger, Layers, MapData, MapReport, Observation }

export interface NovaTerraMapProps {
  data: MapData
  layers: Layers
  /** Danger ID to highlight (active danger zone overlay). */
  dangerId?: string | null
  /** Sector IDs defining the route to draw. */
  routeIds?: string[] | null
  /** Whether clicking the map picks a coordinate (report placement mode). */
  pickMode?: boolean
  className?: string
  /** Screen-reader label for the 3D canvas (decorative). */
  label?: string
  /** Sector ID to fly the camera to. */
  selectedSectorId?: string | null
  onSelectSector?: (id: string | null) => void
  onPick?: EngineEvents["onPick"]
  onHover?: (label: string, sid: string | null) => void
}

function hasWebGLSupport(): boolean {
  const canvas = document.createElement("canvas")
  return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
}

/**
 * Nova Terra holographic map — Three.js engine wrapped in React.
 *
 * - Dynamically imports the heavy engine (~600 KB) only when this component mounts.
 * - Syncs all props to the engine via its public API without recreating it.
 * - Disposes the engine and cancels the RAF loop on unmount.
 */
export function NovaTerraMap({
  data,
  layers,
  dangerId = null,
  routeIds = null,
  pickMode = false,
  className,
  label = "Nova Terra holographic city map",
  selectedSectorId = null,
  onSelectSector,
  onPick,
  onHover,
}: NovaTerraMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<import("./nova-terra-engine").NovaTerraEngine | null>(null)
  const reducedMotion = useReducedMotion()
  const [webglSupported] = useState(hasWebGLSupport)
  const [ready, setReady] = useState(false)

  // Stable event callbacks stored in a ref to avoid restarting the engine on every re-render
  const evRef = useRef<EngineEvents>({ onSelectSector, onPick, onHover })
  useEffect(() => {
    evRef.current = { onSelectSector, onPick, onHover }
  })

  // Boot the engine once
  useEffect(() => {
    if (!webglSupported) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    import("./nova-terra-engine").then(({ NovaTerraEngine }) => {
      if (cancelled || !containerRef.current) return
      const engine = new NovaTerraEngine(containerRef.current, {
        onSelectSector: (id) => evRef.current.onSelectSector?.(id),
        onPick: (p) => evRef.current.onPick?.(p),
        onHover: (lbl) => evRef.current.onHover?.(lbl),
      })
      engineRef.current = engine
      setReady(true)
    })

    return () => {
      cancelled = true
      engineRef.current?.dispose()
      engineRef.current = null
      setReady(false)
    }
  }, [webglSupported])

  // Sync data
  useEffect(() => {
    engineRef.current?.setData(data)
  }, [data, ready])

  // Sync layers
  useEffect(() => {
    engineRef.current?.setLayers(layers)
  }, [layers, ready])

  // Sync danger highlight
  useEffect(() => {
    engineRef.current?.setDanger(dangerId ?? null)
  }, [dangerId, ready])

  // Sync route
  useEffect(() => {
    engineRef.current?.setRoute(routeIds ?? null)
  }, [routeIds, ready])

  // Sync pick mode
  useEffect(() => {
    engineRef.current?.setPickMode(pickMode)
  }, [pickMode, ready])

  // Sync selected sector (for programmatic flying from sidebar)
  useEffect(() => {
    engineRef.current?.focusSector(selectedSectorId ?? null)
  }, [selectedSectorId, ready])

  // Sync reduced-motion / accessibility prefs
  useEffect(() => {
    engineRef.current?.setPrefs({ reduceMotion: reducedMotion })
  }, [reducedMotion, ready])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050816]",
        className,
      )}
    >
      <span className="sr-only">{label}</span>

      {/* The engine appends its own <canvas> here — purely decorative */}
      <div
        ref={containerRef}
        aria-hidden="true"
        className="h-[min(70vh,680px)] w-full cursor-grab active:cursor-grabbing"
      />

      {webglSupported && !ready && (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm text-[#a9b3bc]"
          aria-hidden
        >
          <RotateCw className="size-5 animate-spin" />
        </div>
      )}

      {!webglSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#a9b3bc]">
          <p>3D (WebGL) is not available on this device or browser.</p>
          <p>The accessible map directory below still lets you navigate all locations.</p>
        </div>
      )}

      {ready && (
        <div
          className="pointer-events-none absolute bottom-3 left-4 rounded-md bg-[#090e14]/75 px-2 py-1 font-mono text-[9px] tracking-[.16em] text-[#9da9b3] uppercase backdrop-blur"
          aria-hidden
        >
          Scroll: zoom · drag: orbit
        </div>
      )}
    </div>
  )
}
