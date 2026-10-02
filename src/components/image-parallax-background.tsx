import { useEffect, useRef } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

interface ImageParallaxBackgroundProps {
  src: string
  className?: string
  pointerDistance?: number
  scrollDistance?: number
}

/** Décor image réutilisable : léger déplacement au pointeur et au scroll, sans dépendance externe. */
export function ImageParallaxBackground({
  src,
  className,
  pointerDistance = 22,
  scrollDistance = 0.12,
}: ImageParallaxBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const root = rootRef.current
    const image = imageRef.current
    if (!root || !image || reducedMotion) return

    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)")
    const pointer = { x: 0, y: 0 }
    let frame = 0

    const render = () => {
      frame = 0
      const scrollOffset = Math.max(-88, Math.min(88, -root.getBoundingClientRect().top * scrollDistance))
      const pointerX = pointerQuery.matches ? pointer.x * pointerDistance : 0
      const pointerY = pointerQuery.matches ? pointer.y * pointerDistance : 0
      image.style.setProperty("--parallax-x", `${pointerX.toFixed(1)}px`)
      image.style.setProperty("--parallax-y", `${(pointerY - scrollOffset).toFixed(1)}px`)
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render)
    }
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2
      pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2
      schedule()
    }
    const onScroll = () => schedule()
    const onPointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        pointer.x = 0
        pointer.y = 0
        schedule()
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerout", onPointerLeave, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", schedule, { passive: true })
    schedule()

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerout", onPointerLeave)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [pointerDistance, reducedMotion, scrollDistance])

  return (
    <div ref={rootRef} className={cn("image-parallax-background", className)} aria-hidden="true">
      <img ref={imageRef} src={src} alt="" className="image-parallax-background__image" draggable={false} />
      <span className="image-parallax-background__veil" />
    </div>
  )
}
