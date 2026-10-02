import { useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

/**
 * "Révéler au défilement" : renvoie une ref à poser sur l'élément et `true` dès qu'il devient visible.
 * Usage : const { ref, visible } = useReveal(); <div ref={ref} className={visible ? "..." : "opacity-0"}>
 * Si l'utilisateur préfère moins d'animations, `visible` vaut `true` immédiatement (rien à révéler).
 */
export function useReveal<T extends HTMLElement>(options: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<T | null>(null)
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(reducedMotion)

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true)
      return
    }
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect() // un aller simple : pas de clignotement si on remonte
        }
      },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? "0px 0px -80px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return { ref, visible }
}
