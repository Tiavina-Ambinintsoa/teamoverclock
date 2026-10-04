import { useQuery } from "@tanstack/react-query"

import type { PublicReport } from "@/features/reports/report-queries"
import type { Service } from "@/lib/db-types"
import { supabase } from "@/lib/supabase"

export interface HubServiceUsageRow {
  service_id: string
  name: string
  category: string
  request_count: number
  appointment_count: number
  total_usage: number
}

export interface HubProjectUsageRow {
  project_id: string
  service_id: string | null
  title: string
  status: string
  created_at: string
  yes_votes: number
  no_votes: number
  comment_count: number
  total_votes: number
}

export interface HubCountRow {
  key: string
  count: number
}

export interface PublicCityStatsSnapshot {
  service_count: number
  public_reports_count: number
  published_projects_count: number
  total_project_votes: number
  active_dangers_count: number
  top_services: HubServiceUsageRow[]
  top_report_categories: HubCountRow[]
  report_status_counts: HubCountRow[]
  project_summaries: HubProjectUsageRow[]
  top_projects: HubProjectUsageRow[]
}

export interface HubServiceCard {
  service: Service
  usageCount: number
  requestCount: number
  appointmentCount: number
  rankingBasis: "usage" | "reviews" | "alphabetical"
}

export interface HubProjectRow {
  id: string
  service_id: string
  title: string
  description: string
  status: "published" | "closed"
  created_at: string
}

export interface HubProjectCard extends HubProjectRow {
  yesVotes: number
  noVotes: number
  commentCount: number
  totalVotes: number
  supportRatio: number
  opposeRatio: number
}

export interface HubReportSummary {
  total: number
  byCategory: HubCountRow[]
  byStatus: HubCountRow[]
  latest: PublicReport[]
}

export interface HubKpi {
  key: "services" | "reports" | "projects" | "dangers" | "departures"
  value: number
  meta?: number
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asCountRows(value: unknown): HubCountRow[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => ({
    key: asText((entry as Record<string, unknown>).key ?? (entry as Record<string, unknown>).category ?? (entry as Record<string, unknown>).status),
    count: asNumber((entry as Record<string, unknown>).count),
  })).filter((entry) => entry.key)
}

function asServiceUsageRows(value: unknown): HubServiceUsageRow[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const row = entry as Record<string, unknown>
    return {
      service_id: asText(row.service_id),
      name: asText(row.name),
      category: asText(row.category),
      request_count: asNumber(row.request_count),
      appointment_count: asNumber(row.appointment_count),
      total_usage: asNumber(row.total_usage),
    }
  }).filter((entry) => entry.service_id)
}

function asProjectUsageRows(value: unknown): HubProjectUsageRow[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const row = entry as Record<string, unknown>
    return {
      project_id: asText(row.project_id),
      service_id: asText(row.service_id) || null,
      title: asText(row.title),
      status: asText(row.status),
      created_at: asText(row.created_at),
      yes_votes: asNumber(row.yes_votes),
      no_votes: asNumber(row.no_votes),
      comment_count: asNumber(row.comment_count),
      total_votes: asNumber(row.total_votes),
    }
  }).filter((entry) => entry.project_id)
}

export function normalizePublicCityStats(payload: unknown): PublicCityStatsSnapshot {
  const row = (payload ?? {}) as Record<string, unknown>
  return {
    service_count: asNumber(row.service_count),
    public_reports_count: asNumber(row.public_reports_count),
    published_projects_count: asNumber(row.published_projects_count),
    total_project_votes: asNumber(row.total_project_votes),
    active_dangers_count: asNumber(row.active_dangers_count),
    top_services: asServiceUsageRows(row.top_services),
    top_report_categories: asCountRows(row.top_report_categories),
    report_status_counts: asCountRows(row.report_status_counts),
    project_summaries: asProjectUsageRows(row.project_summaries),
    top_projects: asProjectUsageRows(row.top_projects),
  }
}

export function usePublicCityStats() {
  return useQuery({
    queryKey: ["public-city-stats"],
    staleTime: 60_000,
    queryFn: async (): Promise<PublicCityStatsSnapshot | null> => {
      if (!supabase) return null
      try {
        const { data, error } = await supabase.rpc("public_city_stats")
        if (error) return null
        return normalizePublicCityStats(data)
      } catch {
        return null
      }
    },
  })
}

export function buildHubKpis(input: {
  serviceCount: number
  publicReportsCount: number
  publishedProjectsCount: number
  totalProjectVotes: number
  activeDangersCount: number
  upcomingDeparturesCount: number
}): HubKpi[] {
  return [
    { key: "services", value: input.serviceCount },
    { key: "reports", value: input.publicReportsCount },
    { key: "projects", value: input.publishedProjectsCount, meta: input.totalProjectVotes },
    { key: "dangers", value: input.activeDangersCount },
    { key: "departures", value: input.upcomingDeparturesCount },
  ]
}

export function buildHubReportSummary(
  reports: PublicReport[],
  overrides?: { byCategory?: HubCountRow[]; byStatus?: HubCountRow[] },
): HubReportSummary {
  const byCategoryMap = new Map<string, number>()
  const byStatusMap = new Map<string, number>()
  for (const report of reports) {
    byCategoryMap.set(report.category, (byCategoryMap.get(report.category) ?? 0) + 1)
    byStatusMap.set(report.status, (byStatusMap.get(report.status) ?? 0) + 1)
  }
  const toRows = (source: Map<string, number>) => [...source.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  return {
    total: reports.length,
    byCategory: overrides?.byCategory?.length ? overrides.byCategory : toRows(byCategoryMap),
    byStatus: overrides?.byStatus?.length ? overrides.byStatus : toRows(byStatusMap),
    latest: [...reports].sort((left, right) => right.observed_at.localeCompare(left.observed_at)).slice(0, 6),
  }
}

export function buildHubServiceCards(
  services: Service[],
  usageRows: HubServiceUsageRow[],
  reviewCounts: Record<string, number>,
): HubServiceCard[] {
  const usageMap = new Map(usageRows.map((row) => [row.service_id, row]))
  const hasUsage = usageRows.some((row) => row.total_usage > 0)
  const hasReviews = Object.values(reviewCounts).some((count) => count > 0)
  const rankingBasis: HubServiceCard["rankingBasis"] = hasUsage ? "usage" : hasReviews ? "reviews" : "alphabetical"
  return [...services]
    .map((service) => {
      const usage = usageMap.get(service.id)
      return {
        service,
        usageCount: usage?.total_usage ?? 0,
        requestCount: usage?.request_count ?? 0,
        appointmentCount: usage?.appointment_count ?? 0,
        rankingBasis,
      }
    })
    .sort((left, right) => {
      if (rankingBasis === "usage") return right.usageCount - left.usageCount || (reviewCounts[right.service.id] ?? 0) - (reviewCounts[left.service.id] ?? 0) || left.service.name.localeCompare(right.service.name)
      if (rankingBasis === "reviews") return (reviewCounts[right.service.id] ?? 0) - (reviewCounts[left.service.id] ?? 0) || left.service.name.localeCompare(right.service.name)
      return left.service.name.localeCompare(right.service.name)
    })
}

export function buildHubProjectCards(projects: HubProjectRow[], stats: HubProjectUsageRow[]): HubProjectCard[] {
  const statsMap = new Map(stats.map((row) => [row.project_id, row]))
  return [...projects]
    .map((project) => {
      const summary = statsMap.get(project.id)
      const yesVotes = summary?.yes_votes ?? 0
      const noVotes = summary?.no_votes ?? 0
      const totalVotes = summary?.total_votes ?? yesVotes + noVotes
      const denominator = Math.max(1, totalVotes)
      return {
        ...project,
        yesVotes,
        noVotes,
        commentCount: summary?.comment_count ?? 0,
        totalVotes,
        supportRatio: yesVotes / denominator,
        opposeRatio: noVotes / denominator,
      }
    })
    .sort((left, right) => right.totalVotes - left.totalVotes || right.created_at.localeCompare(left.created_at))
}
