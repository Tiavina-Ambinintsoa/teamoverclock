/** Résultat minimal d'une requête supabase-js. */
export interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
}

/** Retourne les données ou lève l'erreur (pour les queryFn de React Query). */
export function unwrap<T>(result: QueryResult<T>, fallback: T): T {
  if (result.error) throw new Error(result.error.message)
  return result.data ?? fallback
}

/** Retire les caractères spéciaux d'un motif ILIKE / de la syntaxe `or()` de PostgREST. */
export function escapeSearch(term: string): string {
  return term.replace(/[\\%_,()*]/g, " ").replace(/\s+/g, " ").trim()
}

/** Formate une date ISO en date/heure locale courte (fuseau de l'appareil). */
export function formatDateTime(iso: string | null | undefined, locale = "fr-FR"): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function formatDate(iso: string | null | undefined, locale = "fr-FR"): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
}

/** true si l'échéance est dépassée et que la demande est encore ouverte. */
export function isOverdue(dueAt: string | null | undefined, status: string, now: Date = new Date()): boolean {
  if (!dueAt) return false
  if (["resolved", "closed", "rejected", "cancelled"].includes(status)) return false
  return new Date(dueAt).getTime() < now.getTime()
}
