import type { ReportRow } from "@/lib/db-types"

export const REPORT_SOURCE_OPTIONS = ["citizen", "agent", "chatbot", "camera", "satellite", "external_api", "import"] as const
export type ReportSortOption = "observed-desc" | "observed-asc" | "created-desc" | "created-asc" | "priority-desc" | "title-asc"

export interface AllReportsFilters {
  search: string
  status: string
  priority: string
  category: string
  sectorId: string
  serviceId: string
  source: string
  from: string
  to: string
  onlyPublic: boolean
  sort: ReportSortOption
}

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function compareIso(left: string, right: string) {
  return left.localeCompare(right)
}

function matchesDateRange(value: string, from: string, to: string) {
  const day = value.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

export function filterAndSortReports(reports: ReportRow[], filters: AllReportsFilters) {
  const term = filters.search.trim().toLowerCase()
  const filtered = reports.filter((report) => {
    const haystack = `${report.title} ${report.report_number}`.toLowerCase()
    return (!term || haystack.includes(term))
      && (!filters.status || report.status === filters.status)
      && (!filters.priority || report.priority === filters.priority)
      && (!filters.category || report.category === filters.category)
      && (!filters.sectorId || report.sector_id === filters.sectorId)
      && (!filters.serviceId || report.service_id === filters.serviceId)
      && (!filters.source || report.source === filters.source)
      && (!filters.onlyPublic || report.is_public)
      && matchesDateRange(report.observed_at, filters.from, filters.to)
  })

  return filtered.sort((left, right) => {
    switch (filters.sort) {
      case "observed-asc":
        return compareIso(left.observed_at, right.observed_at)
      case "created-desc":
        return compareIso(right.created_at, left.created_at)
      case "created-asc":
        return compareIso(left.created_at, right.created_at)
      case "priority-desc":
        return (PRIORITY_WEIGHT[right.priority] ?? 0) - (PRIORITY_WEIGHT[left.priority] ?? 0)
          || compareIso(right.observed_at, left.observed_at)
      case "title-asc":
        return left.title.localeCompare(right.title)
      case "observed-desc":
      default:
        return compareIso(right.observed_at, left.observed_at)
    }
  })
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const start = (currentPage - 1) * pageSize
  return {
    pageCount,
    currentPage,
    rows: rows.slice(start, start + pageSize),
  }
}
