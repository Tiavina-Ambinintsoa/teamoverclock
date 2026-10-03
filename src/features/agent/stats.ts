/** Réponse de la fonction SQL `stats_service(service_id)`. */
export interface ServiceStats {
  requests_by_status: Record<string, number>
  requests_overdue: number
  reports_to_verify: number
  avg_resolution_hours: number | null
}

export interface AggregatedStats {
  byStatus: Record<string, number>
  openRequests: number
  overdue: number
  reportsToVerify: number
  avgResolutionHours: number | null
}

const CLOSED = new Set(["resolved", "closed", "rejected", "cancelled"])

/** Additionne les statistiques de plusieurs services (la moyenne est pondérée par le nombre de demandes closes). */
export function aggregateStats(list: ServiceStats[]): AggregatedStats {
  const byStatus: Record<string, number> = {}
  let overdue = 0
  let reportsToVerify = 0
  let weighted = 0
  let weight = 0
  for (const stats of list) {
    for (const [status, count] of Object.entries(stats.requests_by_status ?? {})) byStatus[status] = (byStatus[status] ?? 0) + Number(count)
    overdue += Number(stats.requests_overdue ?? 0)
    reportsToVerify += Number(stats.reports_to_verify ?? 0)
    if (stats.avg_resolution_hours !== null && stats.avg_resolution_hours !== undefined) {
      const closed = Object.entries(stats.requests_by_status ?? {}).filter(([s]) => CLOSED.has(s)).reduce((n, [, c]) => n + Number(c), 0) || 1
      weighted += Number(stats.avg_resolution_hours) * closed
      weight += closed
    }
  }
  const openRequests = Object.entries(byStatus).filter(([s]) => !CLOSED.has(s)).reduce((n, [, c]) => n + c, 0)
  return { byStatus, openRequests, overdue, reportsToVerify, avgResolutionHours: weight > 0 ? Math.round((weighted / weight) * 10) / 10 : null }
}
