import { useQuery } from "@tanstack/react-query"
import { Bot, ClipboardList, FilePlus2, FileWarning, MapPin, ShieldCheck } from "lucide-react"
import { Link } from "react-router"

import { BarChart } from "@/components/charts/bar-chart"
import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { loadAnalyticsDashboard } from "@/features/analytics/analytics-queries"
import { useAuth } from "@/features/auth/auth-context"
import { useDangers } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { formatDateTime } from "@/lib/query-helpers"
import { statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

interface Counts {
  openRequests: number
  reports: number
}

/** Tableau de bord citoyen : actions rapides, statut d'identité et chiffres clés de mes démarches. */
export function CitizenDashboard() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const dangers = useDangers()
  const activeAlerts = (dangers.data ?? []).filter((danger) => danger.status === "active" && ["high", "extreme"].includes(danger.severity))
  const uiLocale: "fr" | "en" = locale === "en" ? "en" : "fr"

  const counts = useQuery({
    queryKey: ["citizen-counts", user?.id],
    enabled: Boolean(user && !user.isDemo && supabase),
    queryFn: async (): Promise<Counts> => {
      if (!supabase || !user) return { openRequests: 0, reports: 0 }
      const [requests, reports] = await Promise.all([
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("requester_id", user.id)
          .not("status", "in", "(resolved,closed,rejected,cancelled)"),
        user.citizenId
          ? supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_citizen_id", user.citizenId)
          : Promise.resolve({ count: 0 }),
      ])
      return { openRequests: requests.count ?? 0, reports: reports.count ?? 0 }
    },
  })
  const analytics = useQuery({
    queryKey: ["citizen-dashboard-analytics", user?.id, user?.citizenId],
    enabled: Boolean(user && supabase),
    queryFn: async () => loadAnalyticsDashboard(supabase!, {
      scope: "citizen",
      periodDays: 30,
      userId: user?.id,
      citizenId: user?.citizenId,
    }),
  })

  const canReport = user?.kycStatus === "verified"

  return (
    <Container className="max-w-5xl">
      <title>{tx("Mon espace", "My space")}</title>
      <PageHeader
        eyebrow={tx("Mon espace", "My space")}
        title={`${tx("Bonjour", "Hello")} ${user?.firstName ?? user?.displayName ?? ""}`.trim()}
        description={tx("Retrouvez vos démarches, vos signalements et les informations de la ville.", "Find your requests, your reports and the city's information.")}
      />

      {activeAlerts.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-semibold">{tx("Alerte officielle en cours", "Official alert in progress")}</p>
          <ul className="mt-1 list-inside list-disc">
            {activeAlerts.map((alert) => (
              <li key={alert.id}><Link className="underline underline-offset-4" to={`/dangers/${alert.slug}`}>{alert.title}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border bg-card p-5" aria-labelledby="kyc-card">
          <h2 id="kyc-card" className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ShieldCheck className="size-4" aria-hidden />{tx("Identité", "Identity")}</h2>
          <div className="mt-3">{user?.kycStatus ? <StatusBadge kind="kyc" value={user.kycStatus} /> : <StatusBadge kind="kyc" value="none" />}</div>
          {!canReport && (
            <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/app/verification">{tx("Vérifier mon identité", "Verify my identity")}</Link></Button>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5" aria-labelledby="req-card">
          <h2 id="req-card" className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ClipboardList className="size-4" aria-hidden />{tx("Demandes en cours", "Open requests")}</h2>
          <p className="mt-3 text-3xl font-semibold">{counts.data?.openRequests ?? "—"}</p>
          <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/app/requests">{tx("Voir mes demandes", "View my requests")}</Link></Button>
        </section>
        <section className="rounded-xl border bg-card p-5" aria-labelledby="rep-card">
          <h2 id="rep-card" className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><FileWarning className="size-4" aria-hidden />{tx("Mes signalements", "My reports")}</h2>
          <p className="mt-3 text-3xl font-semibold">{counts.data?.reports ?? "—"}</p>
          <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/app/reports">{tx("Voir mes signalements", "View my reports")}</Link></Button>
        </section>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">{tx("Que souhaitez-vous faire ?", "What would you like to do?")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild size="lg" variant="soft" className="h-auto justify-start py-4"><Link to="/app/requests/new"><FilePlus2 aria-hidden />{tx("Contacter un service", "Contact a service")}</Link></Button>
        <Button asChild size="lg" variant="soft" className="h-auto justify-start py-4" aria-disabled={!canReport}><Link to={canReport ? "/app/reports/new" : "/app/verification"}><FileWarning aria-hidden />{tx("Signaler un problème", "Report a problem")}</Link></Button>
        <Button asChild size="lg" variant="soft" className="h-auto justify-start py-4"><Link to="/map"><MapPin aria-hidden />{tx("Ouvrir la carte", "Open the map")}</Link></Button>
        <Button asChild size="lg" variant="soft" className="h-auto justify-start py-4"><Link to="/app?assistant=open"><Bot aria-hidden />{tx("Poser une question", "Ask a question")}</Link></Button>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{tx("Mon activité récente", "My recent activity")}</h2>
            <p className="text-sm text-muted-foreground">{tx("Vue légère de vos demandes et signalements sur 30 jours.", "Light overview of your requests and reports over 30 days.")}</p>
          </div>
        </div>

        <DataState
          data={analytics.data}
          isLoading={analytics.isLoading}
          error={analytics.error as Error | null}
          emptyTitle={tx("Aucune activité récente.", "No recent activity.")}
          emptyDescription={tx("Vos démarches apparaîtront ici dès la première demande ou le premier signalement.", "Your actions will appear here after your first request or report.")}
          onRetry={() => analytics.refetch()}
        >
          {(data) => (
            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <section className="rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniCard title={tx("Demandes créées", "Requests created")} value={data.entities.requests.created.current} />
                  <MiniCard title={tx("Signalements créés", "Reports created")} value={data.entities.reports.created.current} />
                  <MiniCard title={tx("Éléments ouverts", "Open items")} value={data.totals.openBacklog} />
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <BarChart data={data.breakdowns.requestsByStatus.slice(0, 6).map((row) => ({ label: statusLabel("request", row.key, uiLocale), value: row.current }))} />
                  <BarChart data={data.breakdowns.reportsByStatus.slice(0, 6).map((row) => ({ label: statusLabel("report", row.key, uiLocale), value: row.current }))} />
                </div>
              </section>
              <section className="rounded-lg border p-4">
                <h3 className="font-medium">{tx("Mes éléments ouverts", "My open items")}</h3>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tx("Réf.", "Ref.")}</TableHead>
                      <TableHead>{tx("Type", "Type")}</TableHead>
                      <TableHead>{tx("Statut", "Status")}</TableHead>
                      <TableHead>{tx("Créé", "Created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tables.criticalOpenItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">{tx("Aucun élément ouvert visible.", "No visible open item.")}</TableCell>
                      </TableRow>
                    )}
                    {data.tables.criticalOpenItems.slice(0, 6).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.reference}</TableCell>
                        <TableCell>{row.kind === "report" ? tx("Signalement", "Report") : tx("Demande", "Request")}</TableCell>
                        <TableCell>{statusLabel(row.kind, row.status, uiLocale)}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt, uiLocale === "fr" ? "fr-FR" : "en-US")}</TableCell>
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

function MiniCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
