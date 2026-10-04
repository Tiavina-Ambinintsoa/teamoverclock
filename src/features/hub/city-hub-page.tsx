import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowRight, Bus, Clock3, ExternalLink, ShieldAlert, Star } from "lucide-react"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { BarChart } from "@/components/charts/bar-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useDangers, useServices } from "@/features/city/city-queries"
import { buildHubKpis, buildHubProjectCards, buildHubReportSummary, buildHubServiceCards, usePublicCityStats, type HubProjectRow } from "@/features/hub/hub-queries"
import { buildNextDepartures, countdownLabel, groupSchedulesByLine } from "@/features/hub/transport-agenda"
import { TRANSPORT_SCHEDULE_FALLBACK, type TransportScheduleRow } from "@/features/hub/transport-schedule-data"
import { localizedField } from "@/features/i18n/content-translations"
import { usePublicReports } from "@/features/reports/report-queries"
import { buildServiceStatsMap, formatAverageRating, type ReviewStat } from "@/features/services/service-reviews-utils"
import { useNow } from "@/hooks/use-now"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { pickLabel, REPORT_CATEGORY_LABELS, statusLabel, TRANSPORT_TYPE_LABELS } from "@/lib/status-labels"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface HubProjectQueryRow extends HubProjectRow {}

interface TransportScheduleQueryResult {
  rows: TransportScheduleRow[]
  usingFallback: boolean
}

interface ReviewStatsResult {
  stats: Record<string, ReviewStat>
  available: boolean
}

function statusBadgeClass(status: TransportScheduleRow["status"]): string {
  if (status === "cancelled") return "bg-destructive text-destructive-foreground"
  if (status === "delayed") return "border-highlight/60 bg-highlight/15 text-foreground"
  return "bg-secondary text-secondary-foreground"
}

export function CityHubPage() {
  const { tx, locale, tag } = useLocale()
  const now = useNow(60_000)
  const nowDate = useMemo(() => new Date(now), [now])
  const [transportType, setTransportType] = useState<TransportScheduleRow["transport_type"] | "all">("all")
  const [transportDay, setTransportDay] = useState<number | "all">("all")

  const services = useServices({})
  const reports = usePublicReports()
  const dangers = useDangers()
  const cityStats = usePublicCityStats()
  const reviewStats = useQuery({
    queryKey: ["hub-service-review-stats", (services.data ?? []).map((service) => service.id).sort().join(",")],
    enabled: Boolean(supabase && services.data?.length),
    staleTime: 60_000,
    queryFn: async (): Promise<ReviewStatsResult> => {
      if (!supabase || !services.data?.length) return { stats: {}, available: false }
      try {
        const rows = unwrap(
          await supabase
            .from("service_review_stats")
            .select("service_id,building_id,average_rating,review_count")
            .in("service_id", services.data.map((service) => service.id))
            .is("building_id", null),
          [],
        ) as ReviewStat[]
        return { stats: buildServiceStatsMap(rows), available: true }
      } catch {
        return { stats: {}, available: false }
      }
    },
  })
  const projects = useQuery({
    queryKey: ["hub-city-projects"],
    enabled: Boolean(supabase),
    staleTime: 60_000,
    queryFn: async (): Promise<HubProjectQueryRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase
          .from("city_projects")
          .select("id,service_id,title,description,status,created_at")
          .in("status", ["published", "closed"])
          .order("created_at", { ascending: false })
          .limit(12),
        [],
      ) as HubProjectQueryRow[]
    },
  })
  const transportSchedules = useQuery({
    queryKey: ["hub-transport-schedules"],
    staleTime: 60_000,
    queryFn: async (): Promise<TransportScheduleQueryResult> => {
      if (!supabase) return { rows: [...TRANSPORT_SCHEDULE_FALLBACK], usingFallback: true }
      try {
        const rows = unwrap(
          await supabase
            .from("transport_schedules")
            .select("id,line_code,line_name,transport_type,from_stop,to_stop,departure_time,days_of_week,duration_min,sector_id,status,notes,created_at")
            .order("line_code")
            .order("departure_time"),
          [],
        ) as TransportScheduleRow[]
        if (rows.length === 0) return { rows: [...TRANSPORT_SCHEDULE_FALLBACK], usingFallback: true }
        return { rows, usingFallback: false }
      } catch {
        return { rows: [...TRANSPORT_SCHEDULE_FALLBACK], usingFallback: true }
      }
    },
  })

  const activeDangers = useMemo(() => (dangers.data ?? []).filter((danger) =>
    danger.status === "active" &&
    new Date(danger.valid_from).getTime() <= nowDate.getTime() &&
    (!danger.valid_until || new Date(danger.valid_until).getTime() >= nowDate.getTime())), [dangers.data, nowDate])

  const reportSummary = useMemo(() => buildHubReportSummary(
    reports.data ?? [],
    cityStats.data ? {
      byCategory: cityStats.data.top_report_categories,
      byStatus: cityStats.data.report_status_counts,
    } : undefined,
  ), [cityStats.data, reports.data])

  const reviewCounts = useMemo(() => Object.fromEntries(
    Object.entries(reviewStats.data?.stats ?? {}).map(([serviceId, stat]) => [serviceId, Number(stat.review_count ?? 0)]),
  ), [reviewStats.data?.stats])

  const rankedServices = useMemo(() => buildHubServiceCards(
    services.data ?? [],
    cityStats.data?.top_services ?? [],
    reviewCounts,
  ), [cityStats.data?.top_services, reviewCounts, services.data])

  const projectCards = useMemo(() => buildHubProjectCards(
    projects.data ?? [],
    cityStats.data?.project_summaries ?? cityStats.data?.top_projects ?? [],
  ), [cityStats.data?.project_summaries, cityStats.data?.top_projects, projects.data])

  const filteredSchedules = useMemo(() => (transportSchedules.data?.rows ?? []).filter((schedule) =>
    (transportType === "all" || schedule.transport_type === transportType) &&
    (transportDay === "all" || schedule.days_of_week.includes(transportDay)),
  ), [transportDay, transportSchedules.data?.rows, transportType])

  const nextDepartures = useMemo(() => buildNextDepartures(
    transportSchedules.data?.rows ?? [],
    nowDate,
    { limit: 6, transportType, day: transportDay },
  ), [nowDate, transportDay, transportSchedules.data?.rows, transportType])

  const timetable = useMemo(() => groupSchedulesByLine(filteredSchedules), [filteredSchedules])

  const kpis = useMemo(() => buildHubKpis({
    serviceCount: cityStats.data?.service_count ?? services.data?.length ?? 0,
    publicReportsCount: cityStats.data?.public_reports_count ?? reportSummary.total,
    publishedProjectsCount: cityStats.data?.published_projects_count ?? projects.data?.length ?? 0,
    totalProjectVotes: cityStats.data?.total_project_votes ?? projectCards.reduce((sum, project) => sum + project.totalVotes, 0),
    activeDangersCount: cityStats.data?.active_dangers_count ?? activeDangers.length,
    upcomingDeparturesCount: nextDepartures.length,
  }), [activeDangers.length, cityStats.data, nextDepartures.length, projectCards, projects.data?.length, reportSummary.total, services.data?.length])

  const transportTypes = useMemo(() => Array.from(new Set((transportSchedules.data?.rows ?? []).map((row) => row.transport_type))).sort(), [transportSchedules.data?.rows])

  return (
    <Container className="max-w-7xl py-10">
      <title>{tx("Vue d'ensemble de la ville", "City overview")}</title>
      <PageHeader
        eyebrow={tx("Nova Terra en un coup d'œil", "Nova Terra at a glance")}
        title={tx("Vue d'ensemble de la ville", "City overview")}
        description={tx("Services, signalements, projets, alertes et mobilités publiques regroupés sur un seul écran clair.", "Services, reports, projects, alerts, and public mobility grouped into one clear screen.")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/welcome">{tx("Découvrir Nova Terra", "Discover Nova Terra")}</Link></Button>
            <Button asChild><Link to="/services">{tx("Voir les services", "Browse services")}</Link></Button>
          </div>
        }
      />

      {activeDangers.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 size-5 text-destructive" aria-hidden />
              <div>
                <h2 className="font-semibold">{tx("Alertes actives dans la ville", "Active city alerts")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tx("Consultez les consignes en cours avant de vous déplacer.", "Check current safety guidance before you travel.")}{" "}
                  <strong>{activeDangers.slice(0, 2).map((danger) => danger.title).join(" · ")}</strong>
                  {activeDangers.length > 2 ? ` ${tx("et plus encore", "and more")}` : ""}
                </p>
              </div>
            </div>
            <Button asChild variant="destructive"><Link to="/dangers">{tx("Voir les alertes", "View alerts")}</Link></Button>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">{tx("Aucune alerte active pour le moment.", "No active alert at the moment.")}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="hub-kpis" className="mb-8">
        <h2 id="hub-kpis" className="sr-only">{tx("Indicateurs clés", "Headline KPIs")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.key}>
              <CardHeader className="pb-0">
                <CardDescription>
                  {kpi.key === "services" && tx("Services publics", "Public services")}
                  {kpi.key === "reports" && tx("Signalements publics", "Public reports")}
                  {kpi.key === "projects" && tx("Projets de ville", "City projects")}
                  {kpi.key === "dangers" && tx("Dangers actifs", "Active dangers")}
                  {kpi.key === "departures" && tx("Départs à venir", "Upcoming departures")}
                </CardDescription>
                <CardTitle className="text-3xl">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 text-sm text-muted-foreground">
                {kpi.key === "projects" && (
                  <span>{kpi.meta ?? 0} {tx("votes publics cumulés", "public votes recorded")}</span>
                )}
                {kpi.key === "departures" && (
                  <span>{tx("prochains passages filtrés", "next filtered departures")}</span>
                )}
                {kpi.key === "dangers" && (
                  <span>{kpi.value > 0 ? tx("surveillance renforcée", "heightened monitoring") : tx("situation normale", "normal conditions")}</span>
                )}
                {kpi.key !== "projects" && kpi.key !== "departures" && kpi.key !== "dangers" && (
                  <span>{tx("données publiques consolidées", "consolidated public data")}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6">
        <section aria-labelledby="hub-services">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle id="hub-services">{tx("Services publics", "Public services")}</CardTitle>
                  <CardDescription>{tx("Services les plus consultés, notes citoyennes et accès rapide aux démarches.", "Most visited services, citizen ratings, and quick access to procedures.")}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm"><Link to="/services">{tx("Tous les services", "All services")} <ArrowRight aria-hidden /></Link></Button>
              </div>
              {!reviewStats.data?.available && (
                <p className="text-xs text-muted-foreground">{tx("Les notes de services seront affichées dès que la vue d'avis sera disponible.", "Service ratings will appear once the review view is available.")}</p>
              )}
            </CardHeader>
            <CardContent className="grid gap-6">
              <DataState
                data={rankedServices.slice(0, 6)}
                isLoading={services.isLoading}
                error={services.error}
                onRetry={() => void services.refetch()}
                emptyTitle={tx("Aucun service public visible", "No public service available")}
              >
                {(items) => (
                  <div className="grid gap-4 md:grid-cols-2">
                    {items.map((card) => {
                      const stats = reviewStats.data?.stats?.[card.service.id]
                      return (
                        <article key={card.service.id} className="rounded-xl border bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold">
                                <Link to={`/services/${card.service.slug}`} className="underline-offset-4 hover:underline">
                                  {localizedField(card.service.translations, "name", locale, card.service.name)}
                                </Link>
                              </h3>
                              <p className="text-sm text-muted-foreground">{localizedField(card.service.translations, "category", locale, card.service.category)}</p>
                            </div>
                            {stats?.review_count ? (
                              <Badge variant="outline">
                                <Star className="size-3.5" aria-hidden />
                                {formatAverageRating(stats.average_rating, tag)} · {stats.review_count}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{tx("Infos publiques", "Public info")}</Badge>
                            )}
                          </div>
                          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                            {localizedField(card.service.translations, "description", locale, card.service.description ?? "")}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">
                              {card.rankingBasis === "usage"
                                ? `${card.usageCount} ${tx("usages", "usages")}`
                                : card.rankingBasis === "reviews"
                                  ? `${reviewCounts[card.service.id] ?? 0} ${tx("avis", "reviews")}`
                                  : tx("Classement alphabétique", "Alphabetical order")}
                            </Badge>
                            {card.requestCount > 0 && <Badge variant="outline">{card.requestCount} {tx("demandes", "requests")}</Badge>}
                            {card.appointmentCount > 0 && <Badge variant="outline">{card.appointmentCount} {tx("rendez-vous", "appointments")}</Badge>}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </DataState>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <caption className="mb-2 text-left text-sm font-medium">{tx("Services les plus utilisés", "Most used services")}</caption>
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">{tx("Service", "Service")}</th>
                      <th className="py-2 pr-3">{tx("Catégorie", "Category")}</th>
                      <th className="py-2 pr-3">{tx("Usages", "Usages")}</th>
                      <th className="py-2">{tx("Avis", "Reviews")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedServices.slice(0, 5).map((card) => {
                      const stats = reviewStats.data?.stats?.[card.service.id]
                      return (
                        <tr key={card.service.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-3 font-medium">{localizedField(card.service.translations, "name", locale, card.service.name)}</td>
                          <td className="py-2 pr-3">{localizedField(card.service.translations, "category", locale, card.service.category)}</td>
                          <td className="py-2 pr-3">{card.rankingBasis === "usage" ? card.usageCount : reviewCounts[card.service.id] ?? 0}</td>
                          <td className="py-2">{stats?.review_count ? `${formatAverageRating(stats.average_rating, tag)} / 5` : "—"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="hub-reports">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle id="hub-reports">{tx("Signalements publics", "Public reports")}</CardTitle>
                  <CardDescription>{tx("Catégories visibles, statuts consolidés et derniers signalements publiés.", "Visible categories, consolidated statuses, and latest published reports.")}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm"><Link to="/reports">{tx("Voir /reports", "Open /reports")} <ExternalLink aria-hidden /></Link></Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <DataState
                data={reportSummary}
                isLoading={reports.isLoading}
                error={reports.error}
                onRetry={() => void reports.refetch()}
                emptyTitle={tx("Aucun signalement public", "No public report yet")}
                isEmpty={(data) => data.total === 0}
              >
                {(summary) => (
                  <>
                    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                      <DonutChart
                        segments={summary.byCategory.slice(0, 5).map((entry) => ({ label: pickLabel(REPORT_CATEGORY_LABELS, entry.key, locale), value: entry.count }))}
                        centerLabel={String(summary.total)}
                      />
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[22rem] text-left text-sm">
                          <caption className="mb-2 text-left text-sm font-medium">{tx("Répartition des signalements", "Report breakdown")}</caption>
                          <thead className="text-muted-foreground">
                            <tr className="border-b">
                              <th className="py-2 pr-3">{tx("Catégorie", "Category")}</th>
                              <th className="py-2 pr-3">{tx("Volume", "Volume")}</th>
                              <th className="py-2">{tx("Statuts dominants", "Top statuses")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.byCategory.slice(0, 5).map((entry) => (
                              <tr key={entry.key} className="border-b last:border-b-0">
                                <td className="py-2 pr-3 font-medium">{pickLabel(REPORT_CATEGORY_LABELS, entry.key, locale)}</td>
                                <td className="py-2 pr-3">{entry.count}</td>
                                <td className="py-2">
                                  {summary.byStatus.slice(0, 2).map((status) => statusLabel("report", status.key, locale)).join(" · ")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <caption className="mb-2 text-left text-sm font-medium">{tx("Derniers signalements publiés", "Latest published reports")}</caption>
                        <thead className="text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-2 pr-3">{tx("Signalement", "Report")}</th>
                            <th className="py-2 pr-3">{tx("Catégorie", "Category")}</th>
                            <th className="py-2 pr-3">{tx("Statut", "Status")}</th>
                            <th className="py-2">{tx("Observé le", "Observed on")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.latest.map((report) => (
                            <tr key={report.id} className="border-b last:border-b-0">
                              <td className="py-2 pr-3">
                                <div className="font-medium">{report.title}</div>
                                <div className="text-xs text-muted-foreground">{report.report_number}</div>
                              </td>
                              <td className="py-2 pr-3">{pickLabel(REPORT_CATEGORY_LABELS, report.category, locale)}</td>
                              <td className="py-2 pr-3">{statusLabel("report", report.status, locale)}</td>
                              <td className="py-2">{formatDateTime(report.observed_at, tag)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </DataState>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="mt-6 grid gap-6">
        <section aria-labelledby="hub-projects">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle id="hub-projects">{tx("Projets de ville", "City projects")}</CardTitle>
                  <CardDescription>{tx("Les initiatives publiées les plus suivies et l'équilibre soutien / opposition.", "The most followed published initiatives and their support / oppose balance.")}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm"><Link to="/projects">{tx("Voir /projects", "Open /projects")} <ExternalLink aria-hidden /></Link></Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <DataState
                data={projectCards}
                isLoading={projects.isLoading}
                error={projects.error}
                onRetry={() => void projects.refetch()}
                emptyTitle={tx("Aucun projet publié", "No published project")}
              >
                {(items) => (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {items.slice(0, 4).map((project) => (
                        <article key={project.id} className="rounded-xl border bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold">{project.title}</h3>
                              <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                            </div>
                            <Badge variant="secondary">{project.totalVotes} {tx("votes", "votes")}</Badge>
                          </div>
                          <div className="mt-4 grid gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>{tx("Soutien", "Support")} · {project.yesVotes}</span>
                              <span>{tx("Opposition", "Oppose")} · {project.noVotes}</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-muted">
                              <div className="flex h-full">
                                <div className="bg-primary" style={{ width: `${project.supportRatio * 100}%` }} />
                                <div className="bg-destructive/80" style={{ width: `${project.opposeRatio * 100}%` }} />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{project.commentCount} {tx("commentaires publics", "public comments")}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <BarChart
                      data={items.slice(0, 5).map((project) => ({ label: project.title, value: project.totalVotes }))}
                      valueFormatter={(value) => `${value}`}
                    />
                  </>
                )}
              </DataState>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="hub-most-used">
          <Card className="h-full">
            <CardHeader>
              <CardTitle id="hub-most-used">{tx("Les plus utilisés", "Most used")}</CardTitle>
              <CardDescription>{tx("Top services, catégories de signalements et projets les plus consultés ou soutenus.", "Top services, report categories, and the most followed or supported projects.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <caption className="mb-2 text-left text-sm font-medium">{tx("Top services", "Top services")}</caption>
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">{tx("Service", "Service")}</th>
                      <th className="py-2 pr-3">{tx("Usage", "Usage")}</th>
                      <th className="py-2">{tx("Détail", "Detail")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cityStats.data?.top_services.length ? cityStats.data.top_services : rankedServices.slice(0, 5).map((card) => ({
                      service_id: card.service.id,
                      name: card.service.name,
                      category: card.service.category,
                      request_count: 0,
                      appointment_count: 0,
                      total_usage: card.rankingBasis === "usage" ? card.usageCount : reviewCounts[card.service.id] ?? 0,
                    }))).slice(0, 5).map((service) => (
                      <tr key={service.service_id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 font-medium">{service.name}</td>
                        <td className="py-2 pr-3">{service.total_usage}</td>
                        <td className="py-2">{service.request_count > 0 || service.appointment_count > 0 ? `${service.request_count} ${tx("demandes", "requests")} · ${service.appointment_count} ${tx("rdv", "appointments")}` : tx("Classement public disponible", "Public ranking available")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <caption className="mb-2 text-left text-sm font-medium">{tx("Catégories de signalements", "Report categories")}</caption>
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">{tx("Catégorie", "Category")}</th>
                      <th className="py-2">{tx("Volume", "Volume")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportSummary.byCategory.slice(0, 5).map((entry) => (
                      <tr key={entry.key} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 font-medium">{pickLabel(REPORT_CATEGORY_LABELS, entry.key, locale)}</td>
                        <td className="py-2">{entry.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <caption className="mb-2 text-left text-sm font-medium">{tx("Projets les plus votés", "Most voted projects")}</caption>
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3">{tx("Projet", "Project")}</th>
                      <th className="py-2 pr-3">{tx("Votes", "Votes")}</th>
                      <th className="py-2">{tx("Commentaires", "Comments")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectCards.slice(0, 5).map((project) => (
                      <tr key={project.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 font-medium">{project.title}</td>
                        <td className="py-2 pr-3">{project.totalVotes}</td>
                        <td className="py-2">{project.commentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section aria-labelledby="hub-transport" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle id="hub-transport">{tx("Agenda des transports", "Transport agenda")}</CardTitle>
                <CardDescription>{tx("Filtres par type et jour, prochains départs avec compte à rebours et grille horaire par ligne.", "Filter by type and day, next departures with countdowns, and the timetable grouped by line.")}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select aria-label={tx("Type de transport", "Transport type")} value={transportType} onChange={(event) => setTransportType(event.target.value as TransportScheduleRow["transport_type"] | "all")}>
                  <option value="all">{tx("Tous les types", "All types")}</option>
                  {transportTypes.map((type) => <option key={type} value={type}>{pickLabel(TRANSPORT_TYPE_LABELS, type, locale)}</option>)}
                </Select>
                <Select aria-label={tx("Jour", "Day")} value={String(transportDay)} onChange={(event) => setTransportDay(event.target.value === "all" ? "all" : Number(event.target.value))}>
                  <option value="all">{tx("Tous les jours", "All days")}</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      {new Intl.DateTimeFormat(tag, { weekday: "long" }).format(new Date(Date.UTC(2026, 9, day + 4)))}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {transportSchedules.data?.usingFallback && (
              <p className="text-xs text-muted-foreground">{tx("Les horaires affichés utilisent le jeu de secours embarqué tant que la migration SQL n'est pas appliquée.", "Displayed schedules use the embedded fallback dataset until the SQL migration is applied.")}</p>
            )}
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {nextDepartures.map((departure) => (
                <article key={departure.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{departure.line_code}</p>
                      <h3 className="font-semibold">{departure.line_name}</h3>
                    </div>
                    <Badge className={cn("border-0", statusBadgeClass(departure.status))}>{tx(
                      departure.status === "cancelled" ? "Annulé" : departure.status === "delayed" ? "Retardé" : "Prévu",
                      departure.status === "cancelled" ? "Cancelled" : departure.status === "delayed" ? "Delayed" : "Scheduled",
                    )}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{departure.from_stop} → {departure.to_stop}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Clock3 className="size-4" aria-hidden />
                    <span>{departure.departure_time.slice(0, 5)} · {countdownLabel(departure.minutesUntil, locale === "en" ? "en" : "fr")}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Bus className="size-3.5" aria-hidden />
                    <span>{pickLabel(TRANSPORT_TYPE_LABELS, departure.transport_type, locale)} · {departure.duration_min} min</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <caption className="mb-2 text-left text-sm font-medium">{tx("Grille horaire", "Timetable")}</caption>
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3">{tx("Ligne", "Line")}</th>
                    <th className="py-2 pr-3">{tx("Trajet", "Route")}</th>
                    <th className="py-2 pr-3">{tx("Départ", "Departure")}</th>
                    <th className="py-2 pr-3">{tx("Jours", "Days")}</th>
                    <th className="py-2 pr-3">{tx("Durée", "Duration")}</th>
                    <th className="py-2">{tx("Statut", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {timetable.flatMap((line) => line.schedules.map((schedule, index) => (
                    <tr key={schedule.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 align-top">
                        {index === 0 && (
                          <div>
                            <div className="font-medium">{line.lineCode}</div>
                            <div className="text-xs text-muted-foreground">{line.lineName}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3">{schedule.from_stop} → {schedule.to_stop}</td>
                      <td className="py-2 pr-3">{schedule.departure_time.slice(0, 5)}</td>
                      <td className="py-2 pr-3">
                        {schedule.days_of_week.map((day) => new Intl.DateTimeFormat(tag, { weekday: "short" }).format(new Date(Date.UTC(2026, 9, day + 4)))).join(", ")}
                      </td>
                      <td className="py-2 pr-3">{schedule.duration_min} min</td>
                      <td className="py-2">
                        <Badge className={cn("border-0", statusBadgeClass(schedule.status))}>{tx(
                          schedule.status === "cancelled" ? "Annulé" : schedule.status === "delayed" ? "Retardé" : "Prévu",
                          schedule.status === "cancelled" ? "Cancelled" : schedule.status === "delayed" ? "Delayed" : "Scheduled",
                        )}</Badge>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="hub-shortcuts" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle id="hub-shortcuts">{tx("Raccourcis utiles", "Useful shortcuts")}</CardTitle>
            <CardDescription>{tx("Accédez rapidement aux principales portes d'entrée publiques et aux espaces compte.", "Quick access to the main public entry points and account spaces.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { to: "/map", fr: "Carte interactive", en: "Interactive map" },
                { to: "/news", fr: "Actualités", en: "News" },
                { to: "/guide", fr: "Guide", en: "Guide" },
                { to: "/contact", fr: "Contact", en: "Contact" },
                { to: "/connexion", fr: "Connexion", en: "Sign in" },
                { to: "/inscription", fr: "Créer un compte", en: "Create account" },
                { to: "/welcome", fr: "Découvrir Nova Terra", en: "Discover Nova Terra" },
                { to: "/dangers", fr: "Alertes et dangers", en: "Alerts and dangers" },
              ].map((shortcut) => (
                <Link key={shortcut.to} to={shortcut.to} className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-accent">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{tx(shortcut.fr, shortcut.en)}</span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </Container>
  )
}
