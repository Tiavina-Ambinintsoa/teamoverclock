/**
 * Limite côté navigateur des tentatives de connexion répétées (D03). Elle complète, sans la remplacer,
 * la limitation de débit de Supabase Auth : après `maxFailures` échecs consécutifs, le formulaire se verrouille.
 */
export interface ThrottleOptions {
  maxFailures: number
  lockMs: number
}

interface Entry {
  failures: number
  lockedUntil: number
}

export function createLoginThrottle(options: ThrottleOptions = { maxFailures: 5, lockMs: 60_000 }) {
  const entries = new Map<string, Entry>()
  const keyOf = (email: string) => email.trim().toLowerCase()

  return {
    /** Millisecondes restantes avant de pouvoir réessayer (0 = autorisé). */
    remainingMs(email: string, now: number = Date.now()): number {
      const entry = entries.get(keyOf(email))
      if (!entry) return 0
      if (entry.lockedUntil > now) return entry.lockedUntil - now
      return 0
    },
    recordFailure(email: string, now: number = Date.now()): void {
      const key = keyOf(email)
      const entry = entries.get(key) ?? { failures: 0, lockedUntil: 0 }
      // Un verrouillage expiré repart de zéro.
      if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) {
        entry.failures = 0
        entry.lockedUntil = 0
      }
      entry.failures += 1
      if (entry.failures >= options.maxFailures) entry.lockedUntil = now + options.lockMs
      entries.set(key, entry)
    },
    reset(email: string): void {
      entries.delete(keyOf(email))
    },
  }
}

export const loginThrottle = createLoginThrottle()
