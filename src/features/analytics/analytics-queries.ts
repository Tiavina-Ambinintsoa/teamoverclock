import type { SupabaseClient } from "@supabase/supabase-js"

import type { DangerSeverity, PriorityLevel, ReportStatus, RequestStatus } from "@/lib/types"

export type AnalyticsScope = "admin" | "agent" | "citizen"
export type AnalyticsPeriodDays = 7 | 30 | 90

export interface AnalyticsOptions {
  scope: AnalyticsScope
  periodDays: AnalyticsPeriodDays
  serviceIds?: string[]
  userId?: string | null
  citizenId?: string | null
  now?: Date
}

export interface AnalyticsPeriod {
  days: AnalyticsPeriodDays
  now: Date
  currentStart: Date
  currentEnd: Date
  previousStart: Date
  previousEnd: Date
}

export interface AnalyticsDelta {
  current: number
  previous: number
  delta: number | null
  sparkline: number[]
}

export interface AnalyticsEntitySummary {
  created: AnalyticsDelta
  resolved: AnalyticsDelta
  openTotal: number
  unassignedOpen: number
}

export interface ResolutionSummary {
  averageHours: number | null
  medianHours: number | null
  count: number
}

export interface BreakdownRow {
  key: string
  label: string
  current: number
  previous: number
  delta: number | null
  share: number
}

export interface DailyTrendRow {
  date: string
  created: number
  resolved: number
}

export interface CriticalOpenItem {
  id: string
  kind: "report" | "request"
  reference: string
  title: string
  serviceName: string
  status: string
  priority: string
  category: string
  createdAt: string
  dueAt: string | null
  overdue: boolean
  assigned: boolean
  ageHours: number
}

export interface ServiceVolumeRow {
  serviceId: string
  serviceName: string
  reports: number
  requests: number
  supportCalls: number
  projects: number
  news: number
  total: number
  averageRating: number | null
  reviewCount: number
}

export interface ServiceRatingRow {
  serviceId: string
  serviceName: string
  averageRating: number | null
  reviewCount: number
}

export interface SyncHealthRow {
  source: string
  running: number
  success: number
  partial: number
  failed: number
  imported: number
  pendingValidation: number
  failedItems: number
  lastFinishedAt: string | null
}

export interface AnalyticsDashboardData {
  scope: AnalyticsScope
  periodDays: AnalyticsPeriodDays
  generatedAt: string
  warnings: string[]
  entities: {
    reports: AnalyticsEntitySummary
    requests: AnalyticsEntitySummary
    supportCalls: AnalyticsDelta
    projects: AnalyticsDelta
    votes: AnalyticsDelta
    news: AnalyticsDelta
  }
  totals: {
    openBacklog: number
    unassigned: number
    slaBreaches: number
    resolvedItems: AnalyticsDelta
  }
  resolutions: {
    reports: ResolutionSummary
    requests: ResolutionSummary
    combined: ResolutionSummary
  }
  trends: {
    reports: DailyTrendRow[]
    requests: DailyTrendRow[]
    combined: DailyTrendRow[]
  }
  breakdowns: {
    reportsByStatus: BreakdownRow[]
    reportsByPriority: BreakdownRow[]
    reportsByCategory: BreakdownRow[]
    reportsBySector: BreakdownRow[]
    reportsByService: BreakdownRow[]
    requestsByStatus: BreakdownRow[]
    requestsByPriority: BreakdownRow[]
    requestsByCategory: BreakdownRow[]
    requestsByService: BreakdownRow[]
    combinedPriority: BreakdownRow[]
    dangersBySeverity: BreakdownRow[]
    kycFunnel: BreakdownRow[]
    reputationLevels: BreakdownRow[]
    ratingsByService: ServiceRatingRow[]
    newsByStatus: BreakdownRow[]
    auditByEntity: BreakdownRow[]
  }
  tables: {
    criticalOpenItems: CriticalOpenItem[]
    topServices: ServiceVolumeRow[]
    syncHealth: SyncHealthRow[]
  }
}

interface ReportAnalyticsRow {
  id: string
  report_number: string
  title: string
  category: string
  sector_id: string
  service_id: string | null
  assigned_agent_id: string | null
  priority: PriorityLevel
  status: ReportStatus
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface RequestAnalyticsRow {
  id: string
  tracking_number: string
  subject: string
  category: string
  service_id: string
  assigned_agent_id: string | null
  priority: PriorityLevel
  status: RequestStatus
  created_at: string
  updated_at: string
  closed_at: string | null
  due_at: string | null
}

interface SupportCallRow {
  id: string
  service_id: string
  status: string
  created_at: string
}

interface CityProjectRow {
  id: string
  service_id: string
  status: string
  created_at: string
}

interface CityProjectVoteRow {
  id: string
  project_id: string
  support: boolean
  created_at: string
}

interface CitizenRow {
  id: string
  kyc_status: string
  reputation_level: string
}

interface DangerRow {
  id: string
  severity: DangerSeverity
  status: string
}

interface NewsRow {
  id: string
  service_id: string | null
  status: string
  importance: string
  created_at: string
  published_at: string | null
}

interface ApiSyncRow {
  id: string
  source: string
  status: "running" | "success" | "partial" | "failed"
  started_at: string
  finished_at: string | null
  items_imported: number
  items_pending_validation: number
  items_failed: number
}

interface AuditLogRow {
  id: string
  entity_type: string
  action: string
  created_at: string
}

interface ServiceNameRow {
  id: string
  name: string
}

interface SectorNameRow {
  id: string
  name: string
}

interface ServiceReviewStatsRow {
  service_id: string
  average_rating: number | null
  review_count: number
}

interface ServiceReviewRow {
  service_id: string
  rating: number
}

const MAX_RANGE_ROWS = 5000
const MAX_OPEN_ROWS = 1500
const MAX_AUX_ROWS = 1000
const REQUEST_CLOSED = new Set<RequestStatus>(["resolved", "closed", "rejected", "cancelled"])
const REPORT_CLOSED = new Set<ReportStatus>(["resolved", "archived", "rejected"])
const PRIORITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }

function startOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function diffPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100
  return round(((current - previous) / previous) * 100, 1)
}

function inRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false
  const time = new Date(iso).getTime()
  return time >= start.getTime() && time < end.getTime()
}

function hoursBetween(startIso: string | null | undefined, endIso: string | null | undefined): number | null {
  if (!startIso || !endIso) return null
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return (end - start) / 3_600_000
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? round((sorted[middle - 1] + sorted[middle]) / 2, 1) : round(sorted[middle], 1)
}

function buildSparkline(rows: DailyTrendRow[], key: "created" | "resolved"): number[] {
  return rows.map((row) => row[key])
}

function buildDelta(current: number, previous: number, sparkline: number[]): AnalyticsDelta {
  return { current, previous, delta: diffPercent(current, previous), sparkline }
}

function buildPeriod(days: AnalyticsPeriodDays, now = new Date()): AnalyticsPeriod {
  const currentEnd = startOfDay(addDays(now, 1))
  const currentStart = addDays(currentEnd, -days)
  const previousEnd = currentStart
  const previousStart = addDays(previousEnd, -days)
  return { days, now, currentStart, currentEnd, previousStart, previousEnd }
}

export function createAnalyticsPeriod(days: AnalyticsPeriodDays, now = new Date()): AnalyticsPeriod {
  return buildPeriod(days, now)
}

function buildDailyTrend<T>(
  items: T[],
  period: AnalyticsPeriod,
  getCreatedAt: (item: T) => string | null | undefined,
  getResolvedAt: (item: T) => string | null | undefined,
): DailyTrendRow[] {
  const rows = new Map<string, DailyTrendRow>()
  for (let cursor = new Date(period.currentStart); cursor < period.currentEnd; cursor = addDays(cursor, 1)) {
    const key = isoDay(cursor)
    rows.set(key, { date: key, created: 0, resolved: 0 })
  }

  for (const item of items) {
    const createdAt = getCreatedAt(item)
    if (inRange(createdAt, period.currentStart, period.currentEnd) && createdAt) {
      const row = rows.get(isoDay(new Date(createdAt)))
      if (row) row.created += 1
    }
    const resolvedAt = getResolvedAt(item)
    if (inRange(resolvedAt, period.currentStart, period.currentEnd) && resolvedAt) {
      const row = rows.get(isoDay(new Date(resolvedAt)))
      if (row) row.resolved += 1
    }
  }

  return [...rows.values()]
}

function buildEntitySummary<T>(
  rangeItems: T[],
  openItems: T[],
  period: AnalyticsPeriod,
  getCreatedAt: (item: T) => string | null | undefined,
  getResolvedAt: (item: T) => string | null | undefined,
  isOpen: (item: T) => boolean,
  isAssigned: (item: T) => boolean,
): AnalyticsEntitySummary {
  const createdCurrent = rangeItems.filter((item) => inRange(getCreatedAt(item), period.currentStart, period.currentEnd)).length
  const createdPrevious = rangeItems.filter((item) => inRange(getCreatedAt(item), period.previousStart, period.previousEnd)).length
  const resolvedCurrent = rangeItems.filter((item) => inRange(getResolvedAt(item), period.currentStart, period.currentEnd)).length
  const resolvedPrevious = rangeItems.filter((item) => inRange(getResolvedAt(item), period.previousStart, period.previousEnd)).length
  const spark = buildDailyTrend(rangeItems, period, getCreatedAt, getResolvedAt)

  return {
    created: buildDelta(createdCurrent, createdPrevious, buildSparkline(spark, "created")),
    resolved: buildDelta(resolvedCurrent, resolvedPrevious, buildSparkline(spark, "resolved")),
    openTotal: openItems.filter(isOpen).length,
    unassignedOpen: openItems.filter((item) => isOpen(item) && !isAssigned(item)).length,
  }
}

function buildResolutionSummary<T>(
  items: T[],
  period: AnalyticsPeriod,
  getCreatedAt: (item: T) => string | null | undefined,
  getResolvedAt: (item: T) => string | null | undefined,
): ResolutionSummary {
  const durations = items
    .filter((item) => inRange(getResolvedAt(item), period.currentStart, period.currentEnd))
    .map((item) => hoursBetween(getCreatedAt(item), getResolvedAt(item)))
    .filter((value): value is number => value !== null)

  if (durations.length === 0) return { averageHours: null, medianHours: null, count: 0 }
  return {
    averageHours: round(durations.reduce((sum, value) => sum + value, 0) / durations.length, 1),
    medianHours: median(durations),
    count: durations.length,
  }
}

function buildBreakdownRows<T>(
  items: T[],
  period: AnalyticsPeriod,
  getCreatedAt: (item: T) => string | null | undefined,
  getKey: (item: T) => string | null | undefined,
  getLabel: (key: string) => string,
): BreakdownRow[] {
  const current = new Map<string, number>()
  const previous = new Map<string, number>()

  for (const item of items) {
    const key = getKey(item) ?? "unknown"
    const createdAt = getCreatedAt(item)
    if (inRange(createdAt, period.currentStart, period.currentEnd)) current.set(key, (current.get(key) ?? 0) + 1)
    if (inRange(createdAt, period.previousStart, period.previousEnd)) previous.set(key, (previous.get(key) ?? 0) + 1)
  }

  const totalCurrent = [...current.values()].reduce((sum, value) => sum + value, 0)
  const keys = new Set([...current.keys(), ...previous.keys()])
  return [...keys]
    .map((key) => {
      const currentCount = current.get(key) ?? 0
      const previousCount = previous.get(key) ?? 0
      return {
        key,
        label: getLabel(key),
        current: currentCount,
        previous: previousCount,
        delta: diffPercent(currentCount, previousCount),
        share: totalCurrent > 0 ? round((currentCount / totalCurrent) * 100, 1) : 0,
      }
    })
    .sort((left, right) => right.current - left.current || right.previous - left.previous || left.label.localeCompare(right.label))
}

function buildStaticBreakdownRows<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
  getLabel: (key: string) => string,
): BreakdownRow[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item) ?? "unknown"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0)
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: getLabel(key),
      current: count,
      previous: 0,
      delta: null,
      share: total > 0 ? round((count / total) * 100, 1) : 0,
    }))
    .sort((left, right) => right.current - left.current || left.label.localeCompare(right.label))
}

function requestResolvedAt(row: RequestAnalyticsRow): string | null {
  if (row.closed_at) return row.closed_at
  return row.status === "resolved" || row.status === "closed" ? row.updated_at : null
}

function reportResolvedAt(row: ReportAnalyticsRow): string | null {
  if (row.resolved_at) return row.resolved_at
  return row.status === "resolved" ? row.updated_at : null
}

function isRequestOpen(row: RequestAnalyticsRow): boolean {
  return !REQUEST_CLOSED.has(row.status)
}

function isReportOpen(row: ReportAnalyticsRow): boolean {
  return !REPORT_CLOSED.has(row.status)
}

function countSlaBreaches(items: RequestAnalyticsRow[], now: Date): number {
  return items.filter((item) => {
    if (!item.due_at) return false
    const dueTime = new Date(item.due_at).getTime()
    if (!Number.isFinite(dueTime)) return false
    const closedAt = requestResolvedAt(item)
    if (closedAt) return new Date(closedAt).getTime() > dueTime
    return isRequestOpen(item) && dueTime < now.getTime()
  }).length
}

function buildCriticalOpenItems(
  reports: ReportAnalyticsRow[],
  requests: RequestAnalyticsRow[],
  serviceNames: Map<string, string>,
  now: Date,
): CriticalOpenItem[] {
  const reportItems = reports.filter(isReportOpen).map<CriticalOpenItem>((item) => ({
    id: item.id,
    kind: "report",
    reference: item.report_number,
    title: item.title,
    serviceName: item.service_id ? (serviceNames.get(item.service_id) ?? item.service_id) : "Unassigned",
    status: item.status,
    priority: item.priority,
    category: item.category,
    createdAt: item.created_at,
    dueAt: null,
    overdue: false,
    assigned: Boolean(item.assigned_agent_id),
    ageHours: hoursBetween(item.created_at, now.toISOString()) ?? 0,
  }))

  const requestItems = requests.filter(isRequestOpen).map<CriticalOpenItem>((item) => ({
    id: item.id,
    kind: "request",
    reference: item.tracking_number,
    title: item.subject,
    serviceName: serviceNames.get(item.service_id) ?? item.service_id,
    status: item.status,
    priority: item.priority,
    category: item.category,
    createdAt: item.created_at,
    dueAt: item.due_at,
    overdue: Boolean(item.due_at && new Date(item.due_at).getTime() < now.getTime()),
    assigned: Boolean(item.assigned_agent_id),
    ageHours: hoursBetween(item.created_at, now.toISOString()) ?? 0,
  }))

  return [...reportItems, ...requestItems]
    .filter((item) => item.priority === "critical" || item.priority === "high" || item.overdue || !item.assigned)
    .sort((left, right) => {
      const priorityGap = (PRIORITY_WEIGHT[right.priority] ?? 0) - (PRIORITY_WEIGHT[left.priority] ?? 0)
      if (priorityGap !== 0) return priorityGap
      if (left.overdue !== right.overdue) return left.overdue ? -1 : 1
      if (left.assigned !== right.assigned) return left.assigned ? 1 : -1
      return right.ageHours - left.ageHours
    })
    .slice(0, 10)
}

function buildServiceRatings(rows: ServiceReviewStatsRow[], serviceNames: Map<string, string>): ServiceRatingRow[] {
  return rows
    .map((row) => ({
      serviceId: row.service_id,
      serviceName: serviceNames.get(row.service_id) ?? row.service_id,
      averageRating: row.average_rating === null ? null : round(row.average_rating, 2),
      reviewCount: row.review_count,
    }))
    .sort((left, right) => right.reviewCount - left.reviewCount || (right.averageRating ?? 0) - (left.averageRating ?? 0))
}

function buildTopServices(
  reports: ReportAnalyticsRow[],
  requests: RequestAnalyticsRow[],
  supportCalls: SupportCallRow[],
  projects: CityProjectRow[],
  news: NewsRow[],
  ratings: ServiceRatingRow[],
  serviceNames: Map<string, string>,
): ServiceVolumeRow[] {
  const rows = new Map<string, ServiceVolumeRow>()
  const ensure = (serviceId: string | null | undefined) => {
    if (!serviceId) return null
    const existing = rows.get(serviceId)
    if (existing) return existing
    const rating = ratings.find((entry) => entry.serviceId === serviceId)
    const created: ServiceVolumeRow = {
      serviceId,
      serviceName: serviceNames.get(serviceId) ?? serviceId,
      reports: 0,
      requests: 0,
      supportCalls: 0,
      projects: 0,
      news: 0,
      total: 0,
      averageRating: rating?.averageRating ?? null,
      reviewCount: rating?.reviewCount ?? 0,
    }
    rows.set(serviceId, created)
    return created
  }

  for (const item of reports) {
    const row = ensure(item.service_id)
    if (row) row.reports += 1
  }
  for (const item of requests) {
    const row = ensure(item.service_id)
    if (row) row.requests += 1
  }
  for (const item of supportCalls) {
    const row = ensure(item.service_id)
    if (row) row.supportCalls += 1
  }
  for (const item of projects) {
    const row = ensure(item.service_id)
    if (row) row.projects += 1
  }
  for (const item of news) {
    const row = ensure(item.service_id)
    if (row) row.news += 1
  }

  return [...rows.values()]
    .map((row) => ({ ...row, total: row.reports + row.requests + row.supportCalls + row.projects + row.news }))
    .sort((left, right) => right.total - left.total || left.serviceName.localeCompare(right.serviceName))
    .slice(0, 10)
}

function buildSyncHealth(rows: ApiSyncRow[]): SyncHealthRow[] {
  const grouped = new Map<string, SyncHealthRow>()
  for (const row of rows) {
    const current = grouped.get(row.source) ?? {
      source: row.source,
      running: 0,
      success: 0,
      partial: 0,
      failed: 0,
      imported: 0,
      pendingValidation: 0,
      failedItems: 0,
      lastFinishedAt: null,
    }
    current[row.status] += 1
    current.imported += row.items_imported
    current.pendingValidation += row.items_pending_validation
    current.failedItems += row.items_failed
    if (row.finished_at && (!current.lastFinishedAt || row.finished_at > current.lastFinishedAt)) current.lastFinishedAt = row.finished_at
    grouped.set(row.source, current)
  }
  return [...grouped.values()].sort((left, right) => left.source.localeCompare(right.source))
}

function mapNames<T extends { id: string; name: string }>(items: T[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, item.name]))
}

type QueryLike<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

async function queryRequired<T>(promise: QueryLike<T>, warnings: string[], label?: string): Promise<T[]> {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  const rows = data ?? []
  if (label && rows.length >= MAX_RANGE_ROWS) warnings.push(`${label}: result limited to ${MAX_RANGE_ROWS} rows.`)
  return rows
}

async function queryOptional<T>(promise: QueryLike<T>, warnings: string[], label: string): Promise<T[]> {
  const { data, error } = await promise
  if (error) {
    warnings.push(`${label}: ${error.message}`)
    return []
  }
  return data ?? []
}

async function fetchReviewStats(client: SupabaseClient, warnings: string[], serviceIds?: string[]): Promise<ServiceReviewStatsRow[]> {
  let statsQuery = client.from("service_review_stats").select("service_id,average_rating,review_count").limit(MAX_AUX_ROWS)
  if (serviceIds && serviceIds.length > 0) statsQuery = statsQuery.in("service_id", serviceIds)
  const statsResult = await statsQuery
  if (!statsResult.error) return statsResult.data ?? []

  warnings.push(`service_review_stats unavailable: ${statsResult.error.message}`)
  let reviewQuery = client.from("service_reviews").select("service_id,rating").limit(MAX_RANGE_ROWS)
  if (serviceIds && serviceIds.length > 0) reviewQuery = reviewQuery.in("service_id", serviceIds)
  const raw = await reviewQuery
  if (raw.error) {
    warnings.push(`service_reviews unavailable: ${raw.error.message}`)
    return []
  }

  const grouped = new Map<string, { total: number; count: number }>()
  for (const row of (raw.data ?? []) as ServiceReviewRow[]) {
    const current = grouped.get(row.service_id) ?? { total: 0, count: 0 }
    current.total += row.rating
    current.count += 1
    grouped.set(row.service_id, current)
  }

  return [...grouped.entries()].map(([service_id, value]) => ({
    service_id,
    average_rating: round(value.total / value.count, 2),
    review_count: value.count,
  }))
}

export async function loadAnalyticsDashboard(client: SupabaseClient, options: AnalyticsOptions): Promise<AnalyticsDashboardData> {
  const warnings: string[] = []
  const period = buildPeriod(options.periodDays, options.now)
  const scopedServiceIds = options.scope === "agent" ? (options.serviceIds ?? []) : options.serviceIds
  const compareSince = period.previousStart.toISOString()

  let servicesQuery = client.from("services").select("id,name").order("name").limit(MAX_AUX_ROWS)
  if (scopedServiceIds && scopedServiceIds.length > 0) servicesQuery = servicesQuery.in("id", scopedServiceIds)

  let reportsRangeQuery = client
    .from("reports")
    .select("id,report_number,title,category,sector_id,service_id,assigned_agent_id,priority,status,created_at,updated_at,resolved_at")
    .gte("created_at", compareSince)
    .order("created_at", { ascending: false })
    .limit(MAX_RANGE_ROWS)

  let requestsRangeQuery = client
    .from("requests")
    .select("id,tracking_number,subject,category,service_id,assigned_agent_id,priority,status,created_at,updated_at,closed_at,due_at")
    .gte("created_at", compareSince)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_RANGE_ROWS)

  let openReportsQuery = client
    .from("reports")
    .select("id,report_number,title,category,sector_id,service_id,assigned_agent_id,priority,status,created_at,updated_at,resolved_at")
    .not("status", "in", "(resolved,archived,rejected)")
    .order("created_at", { ascending: false })
    .limit(MAX_OPEN_ROWS)

  let openRequestsQuery = client
    .from("requests")
    .select("id,tracking_number,subject,category,service_id,assigned_agent_id,priority,status,created_at,updated_at,closed_at,due_at")
    .not("status", "in", "(resolved,closed,rejected,cancelled)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_OPEN_ROWS)

  let supportCallsQuery = client
    .from("support_calls")
    .select("id,service_id,status,created_at")
    .gte("created_at", compareSince)
    .order("created_at", { ascending: false })
    .limit(MAX_RANGE_ROWS)

  let projectsQuery = client
    .from("city_projects")
    .select("id,service_id,status,created_at")
    .gte("created_at", compareSince)
    .order("created_at", { ascending: false })
    .limit(MAX_RANGE_ROWS)

  let newsQuery = client
    .from("news")
    .select("id,service_id,status,importance,created_at,published_at")
    .gte("created_at", compareSince)
    .order("created_at", { ascending: false })
    .limit(MAX_RANGE_ROWS)

  if (options.scope === "citizen") {
    reportsRangeQuery = options.citizenId ? reportsRangeQuery.eq("reporter_citizen_id", options.citizenId) : reportsRangeQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    openReportsQuery = options.citizenId ? openReportsQuery.eq("reporter_citizen_id", options.citizenId) : openReportsQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    requestsRangeQuery = options.userId ? requestsRangeQuery.eq("requester_id", options.userId) : requestsRangeQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    openRequestsQuery = options.userId ? openRequestsQuery.eq("requester_id", options.userId) : openRequestsQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    supportCallsQuery = options.userId ? supportCallsQuery.eq("caller_id", options.userId) : supportCallsQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    projectsQuery = projectsQuery.eq("id", "00000000-0000-0000-0000-000000000000")
    newsQuery = newsQuery.eq("id", "00000000-0000-0000-0000-000000000000")
  } else if (scopedServiceIds && scopedServiceIds.length > 0) {
    reportsRangeQuery = reportsRangeQuery.in("service_id", scopedServiceIds)
    requestsRangeQuery = requestsRangeQuery.in("service_id", scopedServiceIds)
    openReportsQuery = openReportsQuery.in("service_id", scopedServiceIds)
    openRequestsQuery = openRequestsQuery.in("service_id", scopedServiceIds)
    supportCallsQuery = supportCallsQuery.in("service_id", scopedServiceIds)
    projectsQuery = projectsQuery.in("service_id", scopedServiceIds)
    newsQuery = newsQuery.in("service_id", scopedServiceIds)
  }

  const [
    services,
    sectors,
    reportsRange,
    requestsRange,
    openReports,
    openRequests,
    supportCalls,
    projects,
    news,
    syncs,
    dangers,
    citizens,
    auditLogs,
    reviewStats,
  ] = await Promise.all([
    queryRequired<ServiceNameRow>(servicesQuery, warnings),
    queryRequired<SectorNameRow>(client.from("sectors").select("id,name").order("name").limit(MAX_AUX_ROWS), warnings),
    queryRequired<ReportAnalyticsRow>(reportsRangeQuery, warnings, "reports"),
    queryRequired<RequestAnalyticsRow>(requestsRangeQuery, warnings, "requests"),
    queryRequired<ReportAnalyticsRow>(openReportsQuery, warnings),
    queryRequired<RequestAnalyticsRow>(openRequestsQuery, warnings),
    queryRequired<SupportCallRow>(supportCallsQuery, warnings, "support_calls"),
    queryRequired<CityProjectRow>(projectsQuery, warnings, "city_projects"),
    queryRequired<NewsRow>(newsQuery, warnings, "news"),
    options.scope === "citizen"
      ? Promise.resolve([] as ApiSyncRow[])
      : queryOptional<ApiSyncRow>(client.from("api_synchronizations").select("id,source,status,started_at,finished_at,items_imported,items_pending_validation,items_failed").gte("started_at", compareSince).order("started_at", { ascending: false }).limit(MAX_RANGE_ROWS), warnings, "api_synchronizations"),
    options.scope === "citizen"
      ? Promise.resolve([] as DangerRow[])
      : queryOptional<DangerRow>(client.from("dangers").select("id,severity,status").eq("status", "active").limit(MAX_AUX_ROWS), warnings, "dangers"),
    options.scope === "citizen"
      ? Promise.resolve([] as CitizenRow[])
      : queryOptional<CitizenRow>(client.from("citizens").select("id,kyc_status,reputation_level").limit(MAX_RANGE_ROWS), warnings, "citizens"),
    options.scope === "citizen"
      ? Promise.resolve([] as AuditLogRow[])
      : queryOptional<AuditLogRow>(client.from("audit_logs").select("id,entity_type,action,created_at").gte("created_at", compareSince).order("created_at", { ascending: false }).limit(MAX_RANGE_ROWS), warnings, "audit_logs"),
    options.scope === "citizen" ? Promise.resolve([] as ServiceReviewStatsRow[]) : fetchReviewStats(client, warnings, scopedServiceIds),
  ])

  const projectIds = projects.map((project) => project.id)
  const votes = projectIds.length === 0
    ? [] as CityProjectVoteRow[]
    : await queryOptional<CityProjectVoteRow>(
      client.from("city_project_votes").select("id,project_id,support,created_at").in("project_id", projectIds).gte("created_at", compareSince).order("created_at", { ascending: false }).limit(MAX_RANGE_ROWS),
      warnings,
      "city_project_votes",
    )

  const serviceNames = mapNames(services)
  const sectorNames = mapNames(sectors)
  const ratingsByService = buildServiceRatings(reviewStats, serviceNames)

  const reportSummary = buildEntitySummary(reportsRange, openReports, period, (row) => row.created_at, reportResolvedAt, isReportOpen, (row) => Boolean(row.assigned_agent_id))
  const requestSummary = buildEntitySummary(requestsRange, openRequests, period, (row) => row.created_at, requestResolvedAt, isRequestOpen, (row) => Boolean(row.assigned_agent_id))

  const reportTrend = buildDailyTrend(reportsRange, period, (row) => row.created_at, reportResolvedAt)
  const requestTrend = buildDailyTrend(requestsRange, period, (row) => row.created_at, requestResolvedAt)
  const combinedTrend = reportTrend.map((row, index) => ({
    date: row.date,
    created: row.created + (requestTrend[index]?.created ?? 0),
    resolved: row.resolved + (requestTrend[index]?.resolved ?? 0),
  }))

  const supportCallTrend = buildDailyTrend(supportCalls, period, (row) => row.created_at, () => null)
  const projectTrend = buildDailyTrend(projects, period, (row) => row.created_at, () => null)
  const voteTrend = buildDailyTrend(votes, period, (row) => row.created_at, () => null)
  const newsTrend = buildDailyTrend(news, period, (row) => row.created_at, (row) => row.published_at)

  const supportCallsDelta = buildDelta(
    supportCalls.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)).length,
    supportCalls.filter((row) => inRange(row.created_at, period.previousStart, period.previousEnd)).length,
    buildSparkline(supportCallTrend, "created"),
  )
  const projectsDelta = buildDelta(
    projects.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)).length,
    projects.filter((row) => inRange(row.created_at, period.previousStart, period.previousEnd)).length,
    buildSparkline(projectTrend, "created"),
  )
  const votesDelta = buildDelta(
    votes.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)).length,
    votes.filter((row) => inRange(row.created_at, period.previousStart, period.previousEnd)).length,
    buildSparkline(voteTrend, "created"),
  )
  const newsDelta = buildDelta(
    news.filter((row) => inRange(row.published_at, period.currentStart, period.currentEnd)).length,
    news.filter((row) => inRange(row.published_at, period.previousStart, period.previousEnd)).length,
    buildSparkline(newsTrend, "resolved"),
  )

  const reportResolution = buildResolutionSummary(reportsRange, period, (row) => row.created_at, reportResolvedAt)
  const requestResolution = buildResolutionSummary(requestsRange, period, (row) => row.created_at, requestResolvedAt)
  const combinedResolution = buildResolutionSummary(
    [
      ...reportsRange.map((row) => ({ created_at: row.created_at, resolved_at: reportResolvedAt(row) })),
      ...requestsRange.map((row) => ({ created_at: row.created_at, resolved_at: requestResolvedAt(row) })),
    ],
    period,
    (row) => row.created_at,
    (row) => row.resolved_at,
  )

  return {
    scope: options.scope,
    periodDays: options.periodDays,
    generatedAt: period.now.toISOString(),
    warnings,
    entities: {
      reports: reportSummary,
      requests: requestSummary,
      supportCalls: supportCallsDelta,
      projects: projectsDelta,
      votes: votesDelta,
      news: newsDelta,
    },
    totals: {
      openBacklog: reportSummary.openTotal + requestSummary.openTotal,
      unassigned: reportSummary.unassignedOpen + requestSummary.unassignedOpen,
      slaBreaches: countSlaBreaches(openRequests, period.now),
      resolvedItems: buildDelta(
        reportSummary.resolved.current + requestSummary.resolved.current,
        reportSummary.resolved.previous + requestSummary.resolved.previous,
        buildSparkline(combinedTrend, "resolved"),
      ),
    },
    resolutions: {
      reports: reportResolution,
      requests: requestResolution,
      combined: combinedResolution,
    },
    trends: {
      reports: reportTrend,
      requests: requestTrend,
      combined: combinedTrend,
    },
    breakdowns: {
      reportsByStatus: buildBreakdownRows(reportsRange, period, (row) => row.created_at, (row) => row.status, (key) => key),
      reportsByPriority: buildBreakdownRows(reportsRange, period, (row) => row.created_at, (row) => row.priority, (key) => key),
      reportsByCategory: buildBreakdownRows(reportsRange, period, (row) => row.created_at, (row) => row.category, (key) => key),
      reportsBySector: buildBreakdownRows(reportsRange, period, (row) => row.created_at, (row) => row.sector_id, (key) => sectorNames.get(key) ?? key),
      reportsByService: buildBreakdownRows(reportsRange, period, (row) => row.created_at, (row) => row.service_id, (key) => serviceNames.get(key) ?? (key === "unknown" ? "Unassigned" : key)),
      requestsByStatus: buildBreakdownRows(requestsRange, period, (row) => row.created_at, (row) => row.status, (key) => key),
      requestsByPriority: buildBreakdownRows(requestsRange, period, (row) => row.created_at, (row) => row.priority, (key) => key),
      requestsByCategory: buildBreakdownRows(requestsRange, period, (row) => row.created_at, (row) => row.category, (key) => key),
      requestsByService: buildBreakdownRows(requestsRange, period, (row) => row.created_at, (row) => row.service_id, (key) => serviceNames.get(key) ?? key),
      combinedPriority: buildStaticBreakdownRows(
        [
          ...reportsRange.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)).map((row) => ({ priority: row.priority })),
          ...requestsRange.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)).map((row) => ({ priority: row.priority })),
        ],
        (row) => row.priority,
        (key) => key,
      ),
      dangersBySeverity: buildStaticBreakdownRows(dangers, (row) => row.severity, (key) => key),
      kycFunnel: buildStaticBreakdownRows(citizens, (row) => row.kyc_status, (key) => key),
      reputationLevels: buildStaticBreakdownRows(citizens, (row) => row.reputation_level, (key) => key),
      ratingsByService,
      newsByStatus: buildBreakdownRows(news, period, (row) => row.created_at, (row) => row.status, (key) => key),
      auditByEntity: buildBreakdownRows(auditLogs, period, (row) => row.created_at, (row) => row.entity_type, (key) => key),
    },
    tables: {
      criticalOpenItems: buildCriticalOpenItems(openReports, openRequests, serviceNames, period.now),
      topServices: buildTopServices(
        reportsRange.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)),
        requestsRange.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)),
        supportCalls.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)),
        projects.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)),
        news.filter((row) => inRange(row.created_at, period.currentStart, period.currentEnd)),
        ratingsByService,
        serviceNames,
      ),
      syncHealth: buildSyncHealth(syncs),
    },
  }
}

export const analyticsTestUtils = {
  buildBreakdownRows,
  buildCriticalOpenItems,
  buildDailyTrend,
  buildResolutionSummary,
  diffPercent,
  median,
}
