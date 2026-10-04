import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { BarChart } from "@/components/charts/bar-chart"
import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadAnalyticsDashboard } from "@/features/analytics/analytics-queries"
import { useAuth } from "@/features/auth/auth-context"
import { aggregateStats, statsCards, type ServiceStats } from "@/features/agent/stats"
import { SyncIndicator } from "@/features/agent/sync-indicator"
import { useServices } from "@/features/city/city-queries"
import { needsAction } from "@/features/requests/request-workflow"
import type { RequestRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { formatDateTime, isOverdue, unwrap } from "@/lib/query-helpers"
import { statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

/** D19 — tableau de bord de l'espace agent : chiffres du service, demandes à traiter, retards et synchronisation. */
export function AgentDashboard() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const services = useServices({})
  const serviceIds = user?.isAdmin ? (services.data ?? []).map((s) => s.id) : (user?.serviceIds ?? [])

  const stats = useQuery({
    queryKey: ["agent-stats", serviceIds.join(",")],
    enabled: Boolean(supabase && serviceIds.length > 0),
    queryFn: async () => {
      if (!supabase) return aggregateStats([])
      const results = await Promise.all(serviceIds.map(async (id) => {
        const { data } = await supabase!.rpc("stats_service", { p_service_id: id })
        return data as ServiceStats | null
      }))
      return aggregateStats(results.filter((r): r is ServiceStats => r !== null))
    },
  })

  const requests = useQuery({
    queryKey: ["agent-requests", user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<RequestRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("requests").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(500), []) as RequestRow[]
    },
  })

  const mine = (requests.data ?? []).filter((r) => user && needsAction(r, user.id)).slice(0, 6)
  const late = (requests.data ?? []).filter((r) => isOverdue(r.due_at, r.status)).slice(0, 6)
  const s = stats.data
  const analytics = useQuery({
    queryKey: ["agent-dashboard-analytics", user?.id, serviceIds.join(",")],
    enabled: Boolean(supabase && user && serviceIds.length > 0),
    queryFn: async () => loadAnalyticsDashboard(supabase!, {
      scope: "agent",
      periodDays: 30,
      serviceIds,
      userId: user?.id,
      citizenId: user?.citizenId,
    }),
  })
  const cards = s ? statsCards(s).map((card) => ({
    label: card.key === "openRequests"
      ? tx("Demandes ouvertes", "Open requests")
      : card.key === "overdue"
        ? tx("En retard", "Overdue")
        : card.key === "reportsToVerify"
          ? tx("Signalements à vérifier", "Reports to verify")
          : tx("Délai moyen (h)", "Avg resolution (h)"),
    value: card.value,
  })) : []

  return (
    <Container className="max-w-6xl">
      <title>{tx("Espace agent", "Agent workspace")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Tableau de bord", "Dashboard")} description={tx("Vos demandes à traiter, les retards et l'état de la synchronisation API.", "Your requests to handle, overdue items and the API synchronization state.")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((kpi) => (
          <section key={kpi.label} className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-medium text-muted-foreground">{kpi.label}</h2>
            <p className="mt-2 text-3xl font-semibold">{kpi.value ?? "—"}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="by-status" className="rounded-xl border bg-card p-5">
          <h2 id="by-status" className="mb-3 font-semibold">{tx("Demandes par statut", "Requests by status")}</h2>
          {s && Object.keys(s.byStatus).length > 0
            ? <BarChart data={Object.entries(s.byStatus).map(([status, value]) => ({ label: statusLabel("request", status, locale), value }))} />
            : <p className="text-sm text-muted-foreground">{tx("Pas de données pour le moment.", "No data yet.")}</p>}
        </section>
        <SyncIndicator />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RequestList title={tx("À traiter", "To handle")} rows={mine} empty={tx("Rien à traiter pour le moment.", "Nothing to handle right now.")} />
        <RequestList title={tx("En retard", "Overdue")} rows={late} empty={tx("Aucun retard.", "No overdue item.")} danger />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{tx("Analyse des 30 derniers jours", "Last 30 days analysis")}</h2>
            <p className="text-sm text-muted-foreground">{tx("Vue synthétique de la charge, des urgences et de la performance de vos services.", "Summary view of workload, urgencies and performance for your services.")}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/agent/analytics">{tx("Voir l'analyse complète", "Open full analytics")}</Link>
          </Button>
        </div>

        <DataState
          data={analytics.data}
          isLoading={analytics.isLoading}
          error={analytics.error as Error | null}
          emptyTitle={tx("Aucune donnée analytique.", "No analytics data.")}
          emptyDescription={tx("Ajoutez au moins un service à votre profil pour obtenir des statistiques.", "Add at least one service to your profile to get statistics.")}
          onRetry={() => analytics.refetch()}
        >
          {(data) => (
            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <section className="rounded-lg border p-4">
                <h3 className="font-medium">{tx("Créés vs résolus", "Created vs resolved")}</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <BarChart data={data.breakdowns.requestsByStatus.slice(0, 6).map((row) => ({ label: statusLabel("request", row.key, locale), value: row.current }))} />
                  <BarChart data={data.breakdowns.combinedPriority.slice(0, 6).map((row) => ({ label: statusLabel("priority", row.key, locale), value: row.current }))} />
                </div>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tx("Date", "Date")}</TableHead>
                      <TableHead>{tx("Créés", "Created")}</TableHead>
                      <TableHead>{tx("Résolus", "Resolved")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.trends.combined.slice(-7).map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.created}</TableCell>
                        <TableCell>{row.resolved}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>

              <section className="rounded-lg border p-4">
                <h3 className="font-medium">{tx("Dossiers prioritaires", "Priority workload")}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Kpi title={tx("Backlog", "Backlog")} value={data.totals.openBacklog} />
                  <Kpi title={tx("Non affectés", "Unassigned")} value={data.totals.unassigned} />
                  <Kpi title={tx("Brèches SLA", "SLA breaches")} value={data.totals.slaBreaches} />
                </div>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tx("Réf.", "Ref.")}</TableHead>
                      <TableHead>{tx("Service", "Service")}</TableHead>
                      <TableHead>{tx("Statut", "Status")}</TableHead>
                      <TableHead>{tx("Créé", "Created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tables.criticalOpenItems.slice(0, 5).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.reference}</TableCell>
                        <TableCell>{row.serviceName}</TableCell>
                        <TableCell>{statusLabel(row.kind, row.status, locale)}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt, locale === "fr" ? "fr-FR" : "en-US")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            </div>
          )}
        </DataState>
      </section>
    </Container>
  )
}

function RequestList({ title, rows, empty, danger }: { title: string; rows: RequestRow[]; empty: string; danger?: boolean }) {
  const { tx } = useLocale()
  return (
    <section aria-label={title} className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">{title} {danger && rows.length > 0 && <Badge variant="destructive">{rows.length}</Badge>}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/agent/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-accent">
                <span className="min-w-0"><span className="font-mono text-xs text-muted-foreground">{r.tracking_number}</span> {r.subject}</span>
                <StatusBadge kind="request" value={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/agent/requests" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">{tx("Toutes les demandes", "All requests")}</Link>
    </section>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
