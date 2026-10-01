import { useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

/** Anime un nombre de 0 jusqu'à `target` quand `start` devient vrai (typiquement : entrée dans le viewport). */
export function useCountUp(target: number, start: boolean, durationMs = 1200): number {
  const [animated, setAnimated] = useState(0)
  const reducedMotion = useReducedMotion()
  const done = useRef(false)

  useEffect(() => {
    // Sans animation : la valeur finale est dérivée directement au rendu (voir plus bas), rien à faire ici.
    if (!start || done.current || reducedMotion) return
    done.current = true

    let frame: number
    const startTime = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs)
      const eased = 1 - (1 - progress) ** 3 // ease-out cubique : rapide puis se pose
      setAnimated(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [start, target, durationMs, reducedMotion])

  if (reducedMotion) return start ? target : 0
  return animated
}
