import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router"

import { BarChart } from "@/components/charts/bar-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { Sparkline } from "@/components/charts/sparkline"
import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/features/auth/auth-context"
import { formatDate, formatDateTime } from "@/lib/query-helpers"
import { statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import { useLocale } from "@/lib/locale"

import {
  loadAnalyticsDashboard,
  type AnalyticsDashboardData,
  type AnalyticsDelta,
  type AnalyticsPeriodDays,
  type BreakdownRow,
  type CriticalOpenItem,
  type ServiceRatingRow,
  type ServiceVolumeRow,
  type SyncHealthRow,
} from "./analytics-queries"

const PERIODS: AnalyticsPeriodDays[] = [7, 30, 90]

export function AnalyticsPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const { pathname } = useLocation()
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30)
  const scope = pathname.startsWith("/admin") || user?.isAdmin ? "admin" : "agent"
  const serviceIds = useMemo(() => (scope === "agent" ? (user?.serviceIds ?? []) : undefined), [scope, user?.serviceIds])

  const analytics = useQuery({
    queryKey: ["analytics-dashboard", scope, periodDays, user?.id, (serviceIds ?? []).join(",")],
    enabled: Boolean(supabase && user),
    queryFn: async () => loadAnalyticsDashboard(supabase!, {
      scope,
      periodDays,
      serviceIds,
      userId: user?.id,
      citizenId: user?.citizenId,
    }),
  })

  const subtitle = scope === "admin"
    ? tx("Analyse complète des opérations de la ville, des citoyens et des services.", "Full analysis of city operations, citizens and services.")
    : tx("Analyse détaillée de vos services, avec priorités, charge, délais et qualité.", "Detailed analysis for your services, with priorities, workload, lead times and quality.")
  const uiLocale: "fr" | "en" = locale === "en" ? "en" : "fr"

  return (
    <Container className="max-w-7xl">
      <title>{tx("Analytique", "Analytics")}</title>
      <PageHeader
        eyebrow={scope === "admin" ? tx("Administration", "Administration") : tx("Espace agent", "Agent workspace")}
        title={tx("Analytique opérationnelle", "Operational analytics")}
        description={subtitle}
        actions={(
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((days) => (
              <Button key={days} variant={periodDays === days ? "default" : "outline"} size="sm" onClick={() => setPeriodDays(days)}>
                {days}j
              </Button>
            ))}
          </div>
        )}
      />

      <DataState
        data={analytics.data}
        isLoading={analytics.isLoading}
        error={analytics.error as Error | null}
        emptyTitle={tx("Aucune donnée analytique disponible.", "No analytics data available.")}
        emptyDescription={tx("Les tableaux apparaîtront dès que des opérations seront visibles par votre rôle.", "Tables will appear once operations are visible for your role.")}
        onRetry={() => analytics.refetch()}
      >
        {(data) => <AnalyticsContent data={data} locale={uiLocale} />}
      </DataState>
    </Container>
  )
}

function AnalyticsContent({ data, locale }: { data: AnalyticsDashboardData; locale: "fr" | "en" }) {
  const { tx } = useLocale()
  const periodLabel = tx(`${data.periodDays} derniers jours`, `Last ${data.periodDays} days`)
  const liveLabel = tx("Temps réel", "Live")

  return (
    <div className="space-y-6">
      {data.warnings.length > 0 && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <h2 className="font-semibold">{tx("Données partielles", "Partial data")}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            {data.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title={tx("Signalements créés", "Reports created")} delta={data.entities.reports.created} accent="var(--chart-1)" subtitle={periodLabel} />
        <MetricCard title={tx("Demandes créées", "Requests created")} delta={data.entities.requests.created} accent="var(--chart-2)" subtitle={periodLabel} />
        <MetricCard title={tx("Éléments résolus", "Resolved items")} delta={data.totals.resolvedItems} accent="var(--chart-3)" subtitle={periodLabel} />
        <MetricCard title={tx("Appels support", "Support calls")} delta={data.entities.supportCalls} accent="var(--chart-4)" subtitle={periodLabel} />
        <MetricCard title={tx("Votes citoyens", "Citizen votes")} delta={data.entities.votes} accent="var(--chart-5)" subtitle={periodLabel} />
        <MetricCard title={tx("Actualités publiées", "Published news")} delta={data.entities.news} accent="var(--chart-1)" subtitle={periodLabel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LiveCard title={tx("Backlog ouvert", "Open backlog")} value={data.totals.openBacklog} tag={liveLabel} />
        <LiveCard title={tx("Non affectés", "Unassigned")} value={data.totals.unassigned} tag={liveLabel} />
        <LiveCard title={tx("Brèches SLA", "SLA breaches")} value={data.totals.slaBreaches} tag={liveLabel} />
        <LiveCard title={tx("Résolution médiane (h)", "Median resolution (h)")} value={formatHours(data.resolutions.combined.medianHours)} tag={periodLabel} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartSection title={tx("Signalements par statut", "Reports by status")}>
          <DonutChart segments={toSegments(data.breakdowns.reportsByStatus, "report", locale)} centerLabel={String(data.entities.reports.created.current)} />
        </ChartSection>
        <ChartSection title={tx("Demandes par statut", "Requests by status")}>
          <DonutChart segments={toSegments(data.breakdowns.requestsByStatus, "request", locale)} centerLabel={String(data.entities.requests.created.current)} />
        </ChartSection>
        <ChartSection title={tx("Priorités sur la période", "Priorities in period")}>
          <BarChart data={toBars(data.breakdowns.combinedPriority, "priority", locale)} />
        </ChartSection>
        <ChartSection title={tx("Services les plus sollicités", "Top services by volume")}>
          <BarChart data={data.tables.topServices.slice(0, 6).map((row) => ({ label: row.serviceName, value: row.total }))} />
        </ChartSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{tx("Activité quotidienne", "Daily activity")}</h2>
              <p className="text-sm text-muted-foreground">{tx("Créations et résolutions par jour sur la période sélectionnée.", "Creations and resolutions per day for the selected period.")}</p>
            </div>
            <Badge variant="outline">{data.periodDays}j</Badge>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MiniTrend title={tx("Signalements", "Reports")} rows={data.trends.reports} color="var(--chart-1)" />
            <MiniTrend title={tx("Demandes", "Requests")} rows={data.trends.requests} color="var(--chart-2)" />
          </div>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("Date", "Date")}</TableHead>
                  <TableHead>{tx("Créés", "Created")}</TableHead>
                  <TableHead>{tx("Résolus", "Resolved")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.trends.combined.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{formatDate(row.date, locale === "fr" ? "fr-FR" : "en-US")}</TableCell>
                    <TableCell>{row.created}</TableCell>
                    <TableCell>{row.resolved}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{tx("Délais de résolution", "Resolution times")}</h2>
          <p className="text-sm text-muted-foreground">{tx("Moyennes et médianes calculées sur les éléments clôturés pendant la période.", "Averages and medians computed on items closed during the period.")}</p>
          <div className="mt-4 grid gap-3">
            <ResolutionCard title={tx("Signalements", "Reports")} value={data.resolutions.reports} />
            <ResolutionCard title={tx("Demandes", "Requests")} value={data.resolutions.requests} />
            <ResolutionCard title={tx("Total combiné", "Combined total")} value={data.resolutions.combined} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <CriticalOpenItemsTable rows={data.tables.criticalOpenItems} locale={locale} />
        <ServiceVolumeTable rows={data.tables.topServices} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownTable
          title={tx("Signalements — statut / priorité / catégorie / secteur / service", "Reports — status / priority / category / sector / service")}
          groups={[
            { heading: tx("Statuts", "Statuses"), rows: data.breakdowns.reportsByStatus, kind: "report" },
            { heading: tx("Priorités", "Priorities"), rows: data.breakdowns.reportsByPriority, kind: "priority" },
            { heading: tx("Catégories", "Categories"), rows: data.breakdowns.reportsByCategory },
            { heading: tx("Secteurs", "Sectors"), rows: data.breakdowns.reportsBySector },
            { heading: tx("Services", "Services"), rows: data.breakdowns.reportsByService },
          ]}
          locale={locale}
        />
        <BreakdownTable
          title={tx("Demandes — statut / priorité / catégorie / service", "Requests — status / priority / category / service")}
          groups={[
            { heading: tx("Statuts", "Statuses"), rows: data.breakdowns.requestsByStatus, kind: "request" },
            { heading: tx("Priorités", "Priorities"), rows: data.breakdowns.requestsByPriority, kind: "priority" },
            { heading: tx("Catégories", "Categories"), rows: data.breakdowns.requestsByCategory },
            { heading: tx("Services", "Services"), rows: data.breakdowns.requestsByService },
          ]}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{tx("Qualité et engagement citoyen", "Citizen quality and engagement")}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">{tx("Funnel de vérification", "Verification funnel")}</h3>
              <div className="mt-3 flex justify-center">
                <DonutChart segments={toSegments(data.breakdowns.kycFunnel, "kyc", locale)} />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">{tx("Réputation", "Reputation")}</h3>
              <BarChart className="mt-3" data={data.breakdowns.reputationLevels.map((row) => ({ label: titleCase(row.label), value: row.current }))} />
            </div>
          </div>
          <div className="mt-4">
            <ServiceRatingsTable rows={data.breakdowns.ratingsByService} />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{tx("Risques, synchronisations et activité de plateforme", "Risks, synchronizations and platform activity")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">{tx("Dangers actifs", "Active dangers")}</h3>
              {data.breakdowns.dangersBySeverity.length > 0
                ? <div className="mt-3 flex justify-center"><DonutChart segments={toSegments(data.breakdowns.dangersBySeverity, "severity", locale)} /></div>
                : <p className="mt-3 text-sm text-muted-foreground">{tx("Aucun danger actif visible.", "No active visible danger.")}</p>}
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">{tx("Actualités", "News")}</h3>
              {data.breakdowns.newsByStatus.length > 0
                ? <BarChart className="mt-3" data={toBars(data.breakdowns.newsByStatus, "news", locale)} />
                : <p className="mt-3 text-sm text-muted-foreground">{tx("Aucune actualité sur la période.", "No news in the period.")}</p>}
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <SyncHealthTable rows={data.tables.syncHealth} locale={locale} />
            <SimpleBreakdownTable title={tx("Audit par entité", "Audit by entity")} rows={data.breakdowns.auditByEntity} />
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to={data.scope === "admin" ? "/admin" : "/agent"}>{tx("Retour au tableau de bord", "Back to dashboard")}</Link>
        </Button>
      </div>
    </div>
  )
}

function MetricCard({ title, delta, subtitle, accent }: { title: string; delta: AnalyticsDelta; subtitle: string; accent: string }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
          <p className="mt-2 text-3xl font-semibold">{delta.current}</p>
          <p className="text-xs text-muted-foreground">{formatDelta(delta.delta, tx)} · {subtitle}</p>
        </div>
        <Sparkline className="h-12 w-28" values={delta.sparkline.length > 1 ? delta.sparkline : [0, delta.current]} color={accent} />
      </div>
    </section>
  )
}

function LiveCard({ title, value, tag }: { title: string; value: number | string; tag: string }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <Badge variant="outline">{tag}</Badge>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </section>
  )
}

function ChartSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 flex min-h-48 items-center justify-center">{children}</div>
    </section>
  )
}

function MiniTrend({ title, rows, color }: { title: string; rows: AnalyticsDashboardData["trends"]["reports"]; color: string }) {
  const { tx } = useLocale()
  const created = rows.map((row) => row.created)
  const resolved = rows.map((row) => row.resolved)
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{tx("Créés", "Created")}</p>
          <Sparkline className="mt-2 h-10 w-full" values={created.length > 1 ? created : [0, ...created]} color={color} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{tx("Résolus", "Resolved")}</p>
          <Sparkline className="mt-2 h-10 w-full" values={resolved.length > 1 ? resolved : [0, ...resolved]} color="var(--chart-3)" />
        </div>
      </div>
    </div>
  )
}

function ResolutionCard({ title, value }: { title: string; value: AnalyticsDashboardData["resolutions"]["combined"] }) {
  const { tx } = useLocale()
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3"><dt>{tx("Moyenne", "Average")}</dt><dd className="font-medium">{formatHours(value.averageHours)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt>{tx("Médiane", "Median")}</dt><dd className="font-medium">{formatHours(value.medianHours)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt>{tx("Éléments clôturés", "Closed items")}</dt><dd className="font-medium">{value.count}</dd></div>
      </dl>
    </div>
  )
}

function CriticalOpenItemsTable({ rows, locale }: { rows: CriticalOpenItem[]; locale: "fr" | "en" }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{tx("Éléments critiques ouverts", "Critical open items")}</h2>
      <p className="text-sm text-muted-foreground">{tx("Priorités hautes, retards et dossiers non affectés.", "High priorities, delays and unassigned cases.")}</p>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{tx("Réf.", "Ref.")}</TableHead>
            <TableHead>{tx("Type", "Type")}</TableHead>
            <TableHead>{tx("Titre", "Title")}</TableHead>
            <TableHead>{tx("Service", "Service")}</TableHead>
            <TableHead>{tx("Statut", "Status")}</TableHead>
            <TableHead>{tx("Priorité", "Priority")}</TableHead>
            <TableHead>{tx("Créé", "Created")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">{tx("Aucun élément critique visible.", "No visible critical item.")}</TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.reference}</TableCell>
              <TableCell>{row.kind === "report" ? tx("Signalement", "Report") : tx("Demande", "Request")}</TableCell>
              <TableCell className="max-w-72 truncate">{row.title}</TableCell>
              <TableCell>{row.serviceName}</TableCell>
              <TableCell>{statusLabel(row.kind, row.status, locale)}</TableCell>
              <TableCell>{statusLabel("priority", row.priority, locale)}</TableCell>
              <TableCell>{formatDateTime(row.createdAt, locale === "fr" ? "fr-FR" : "en-US")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function ServiceVolumeTable({ rows }: { rows: ServiceVolumeRow[] }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{tx("Top services par volume", "Top services by volume")}</h2>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{tx("Service", "Service")}</TableHead>
            <TableHead>{tx("Signalements", "Reports")}</TableHead>
            <TableHead>{tx("Demandes", "Requests")}</TableHead>
            <TableHead>{tx("Appels", "Calls")}</TableHead>
            <TableHead>{tx("Projets", "Projects")}</TableHead>
            <TableHead>{tx("Note", "Rating")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">{tx("Aucun service visible sur la période.", "No visible service in the period.")}</TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.serviceId}>
              <TableCell>{row.serviceName}</TableCell>
              <TableCell>{row.reports}</TableCell>
              <TableCell>{row.requests}</TableCell>
              <TableCell>{row.supportCalls}</TableCell>
              <TableCell>{row.projects}</TableCell>
              <TableCell>{row.averageRating === null ? "—" : `${row.averageRating} (${row.reviewCount})`}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function ServiceRatingsTable({ rows }: { rows: ServiceRatingRow[] }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium">{tx("Notes moyennes par service", "Average rating by service")}</h3>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{tx("Service", "Service")}</TableHead>
            <TableHead>{tx("Note moyenne", "Average rating")}</TableHead>
            <TableHead>{tx("Avis", "Reviews")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">{tx("Aucune note visible.", "No visible rating.")}</TableCell>
            </TableRow>
          )}
          {rows.slice(0, 8).map((row) => (
            <TableRow key={row.serviceId}>
              <TableCell>{row.serviceName}</TableCell>
              <TableCell>{row.averageRating === null ? "—" : row.averageRating}</TableCell>
              <TableCell>{row.reviewCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function SyncHealthTable({ rows, locale }: { rows: SyncHealthRow[]; locale: "fr" | "en" }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium">{tx("Santé des synchronisations", "Synchronization health")}</h3>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{tx("Source", "Source")}</TableHead>
            <TableHead>{tx("Succès", "Success")}</TableHead>
            <TableHead>{tx("Partiel", "Partial")}</TableHead>
            <TableHead>{tx("Échec", "Failed")}</TableHead>
            <TableHead>{tx("Dernière fin", "Last finished")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">{tx("Aucune synchronisation visible.", "No visible synchronization.")}</TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.source}>
              <TableCell>{row.source}</TableCell>
              <TableCell>{row.success}</TableCell>
              <TableCell>{row.partial}</TableCell>
              <TableCell>{row.failed}</TableCell>
              <TableCell>{formatDateTime(row.lastFinishedAt, locale === "fr" ? "fr-FR" : "en-US")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function BreakdownTable({
  title,
  groups,
  locale,
}: {
  title: string
  groups: { heading: string; rows: BreakdownRow[]; kind?: "report" | "request" | "priority" | "kyc" | "severity" | "news" }[]
  locale: "fr" | "en"
}) {
  const { tx } = useLocale()
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.heading} className="rounded-lg border p-4">
            <h3 className="font-medium">{group.heading}</h3>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("Libellé", "Label")}</TableHead>
                  <TableHead>{tx("Période", "Period")}</TableHead>
                  <TableHead>{tx("Précédente", "Previous")}</TableHead>
                  <TableHead>{tx("Part", "Share")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">{tx("Aucune donnée.", "No data.")}</TableCell>
                  </TableRow>
                )}
                {group.rows.slice(0, 8).map((row) => (
                  <TableRow key={`${group.heading}-${row.key}`}>
                    <TableCell>{translateLabel(row, group.kind, locale)}</TableCell>
                    <TableCell>{row.current}</TableCell>
                    <TableCell>{row.previous}</TableCell>
                    <TableCell>{row.share}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </section>
  )
}

function SimpleBreakdownTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const { tx } = useLocale()
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{tx("Libellé", "Label")}</TableHead>
            <TableHead>{tx("Période", "Period")}</TableHead>
            <TableHead>{tx("Δ %", "Δ %")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">{tx("Aucune donnée.", "No data.")}</TableCell>
            </TableRow>
          )}
          {rows.slice(0, 8).map((row) => (
            <TableRow key={row.key}>
              <TableCell>{row.label}</TableCell>
              <TableCell>{row.current}</TableCell>
              <TableCell>{formatDelta(row.delta, tx)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function toSegments(rows: BreakdownRow[], kind: "report" | "request" | "priority" | "kyc" | "severity" | "news", locale: "fr" | "en") {
  return rows.slice(0, 6).map((row) => ({ label: translateLabel(row, kind, locale), value: row.current }))
}

function toBars(rows: BreakdownRow[], kind: "priority" | "news", locale: "fr" | "en") {
  return rows.slice(0, 6).map((row) => ({ label: translateLabel(row, kind, locale), value: row.current }))
}

function translateLabel(row: BreakdownRow, kind: "report" | "request" | "priority" | "kyc" | "severity" | "news" | undefined, locale: "fr" | "en") {
  return kind ? statusLabel(kind, row.key, locale) : row.label
}

function formatDelta(delta: number | null, tx: (fr: string, en: string) => string) {
  if (delta === null) return "—"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta}% ${tx("vs période précédente", "vs previous period")}`
}

function formatHours(value: number | null) {
  if (value === null) return "—"
  return value
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
