import { useEffect, useState } from "react"

/**
 * `false` au premier rendu, `true` juste après (un frame plus tard). Sert à déclencher une
 * transition CSS "depuis zéro" au montage (ex. une barre de graphique qui grandit) : les
 * transitions CSS ne se déclenchent pas sur l'état initial, il faut un aller-retour d'état.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return mounted
}
