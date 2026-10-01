import { safeStorage } from "@/lib/storage"

/**
 * Mini "base de données" dans le navigateur : alimente le MODE DÉMO LOCAL.
 * Deux usages : (1) développer l'interface avant que le backend soit prêt,
 * (2) filet de sécurité si le réseau ou Supabase lâche pendant l'évaluation du jury.
 */
const PREFIX = "webcup:db:"

export function writeCollection<T>(name: string, rows: T[]): void {
  safeStorage.set(PREFIX + name, JSON.stringify(rows))
}

export function readCollection<T>(name: string, seed: T[] = []): T[] {
  const raw = safeStorage.get(PREFIX + name)
  if (raw === null) {
    writeCollection(name, seed)
    return seed
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : seed
  } catch {
    return seed
  }
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
