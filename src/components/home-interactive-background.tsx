import { useEffect, useRef, type CSSProperties } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { HOME_BACKGROUND_CONFIG } from "@/lib/home-background-config"

type HomeBackgroundStyle = CSSProperties & {
  "--home-orb-color": string
  "--home-orb-size": string
  "--home-orb-opacity": number
  "--home-orb-x": string
  "--home-orb-y": string
}

/** Decorative homepage backdrop. Values are updated on the next animation frame. */
export function HomeInteractiveBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const root = rootRef.current
    const config = HOME_BACKGROUND_CONFIG
    if (!root || !config.enabled || reducedMotion) return

    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)")
    const pointer = { x: 0, y: 0 }
    let scrollY = window.scrollY
    let frame = 0

    const updateLayers = () => {
      frame = 0
      const maxScroll = config.scroll.maxOffset
      const scrollOffset = config.scroll.enabled
        ? Math.max(-maxScroll, Math.min(maxScroll, scrollY * config.scroll.intensity))
        : 0
      const pointerIntensity = config.pointer.enabled && pointerQuery.matches ? config.pointer.intensity : 0

      config.layers.forEach((layer, index) => {
        const element = root.querySelector<HTMLElement>(`[data-home-orb="${index}"]`)
        if (!element) return

        const x = pointer.x * pointerIntensity * layer.pointerDepth
        const y = pointer.y * pointerIntensity * layer.pointerDepth - scrollOffset * layer.scrollDepth
        element.style.setProperty("--home-orb-x", `${x.toFixed(1)}px`)
        element.style.setProperty("--home-orb-y", `${y.toFixed(1)}px`)
      })
    }

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateLayers)
    }

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2
      pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2
      scheduleUpdate()
    }

    const onScroll = () => {
      scrollY = window.scrollY
      scheduleUpdate()
    }

    const onPointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        pointer.x = 0
        pointer.y = 0
        scheduleUpdate()
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerout", onPointerLeave, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", scheduleUpdate, { passive: true })
    scheduleUpdate()

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerout", onPointerLeave)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  if (!HOME_BACKGROUND_CONFIG.enabled) return null

  return (
    <div ref={rootRef} className="home-atmosphere" aria-hidden="true">
      {HOME_BACKGROUND_CONFIG.layers.map((layer, index) => {
        const style: HomeBackgroundStyle = {
          "--home-orb-color": layer.color,
          "--home-orb-size": layer.size,
          "--home-orb-opacity": layer.opacity,
          "--home-orb-x": "0px",
          "--home-orb-y": "0px",
          top: layer.top,
          left: layer.left,
        }

        return <span key={index} data-home-orb={index} className="home-atmosphere__orb" style={style} />
      })}
    </div>
  )
}
