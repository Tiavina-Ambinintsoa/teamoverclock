import { useEffect, useState } from "react"

/** Horloge qui se met à jour toutes les `intervalMs` ms (utile pour un chrono). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
