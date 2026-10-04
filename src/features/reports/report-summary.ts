import type { ReportRow } from "@/lib/db-types"

export interface ReportSummaryFilters {
  search: string
  status: string
  category: string
  priority: string
  from: string
  to: string
}

export const EMPTY_REPORT_SUMMARY_FILTERS: ReportSummaryFilters = {
  search: "",
  status: "",
  category: "",
  priority: "",
  from: "",
  to: "",
}

export function filterOwnedReports(reports: ReportRow[], filters: ReportSummaryFilters): ReportRow[] {
  const term = filters.search.trim().toLocaleLowerCase()
  return reports.filter((report) =>
    (!term || `${report.title} ${report.description} ${report.report_number}`.toLocaleLowerCase().includes(term)) &&
    (!filters.status || report.status === filters.status) &&
    (!filters.category || report.category === filters.category) &&
    (!filters.priority || report.priority === filters.priority) &&
    (!filters.from || report.created_at.slice(0, 10) >= filters.from) &&
    (!filters.to || report.created_at.slice(0, 10) <= filters.to)
  )
}

export function buildReportSummary(reports: ReportRow[], labels: {
  title: string
  generated: string
  total: string
  open: string
  resolved: string
  archived: string
  report: string
  status: string
  category: string
  priority: string
  date: string
  description: string
  nextSteps: string
  documents: string
  postponement: string
  none: string
  formatStatus: (value: string) => string
  formatCategory: (value: string) => string
  formatPriority: (value: string) => string
}): string {
  const open = reports.filter((report) => !["resolved", "rejected", "archived"].includes(report.status)).length
  const resolved = reports.filter((report) => report.status === "resolved").length
  const archived = reports.filter((report) => ["rejected", "archived"].includes(report.status)).length
  const sections = reports.map((report) => [
    `${labels.report} ${report.report_number} — ${report.title}`,
    `${labels.status}: ${labels.formatStatus(report.status)} · ${labels.category}: ${labels.formatCategory(report.category)} · ${labels.priority}: ${labels.formatPriority(report.priority)}`,
    `${labels.date}: ${report.created_at}`,
    `${labels.description}: ${report.description}`,
    report.postponement_reason ? `${labels.postponement}: ${report.postponement_reason}` : "",
    report.next_steps ? `${labels.nextSteps}: ${report.next_steps}` : "",
    (report.required_documents ?? []).length
      ? `${labels.documents}: ${(report.required_documents ?? []).join(", ")}`
      : "",
  ].filter(Boolean).join("\n"))

  return [
    labels.title,
    `${labels.generated}: ${new Date().toISOString()}`,
    `${labels.total}: ${reports.length} · ${labels.open}: ${open} · ${labels.resolved}: ${resolved} · ${labels.archived}: ${archived}`,
    "",
    ...(sections.length ? sections : [labels.none]),
  ].join("\n")
}

export function reportSummaryGrounding(reports: ReportRow[]): string {
  const compact = reports.slice(0, 50).map((report) => ({
    number: report.report_number,
    title: report.title.slice(0, 150),
    description: report.description.slice(0, 500),
    category: report.category,
    status: report.status,
    priority: report.priority,
    created_at: report.created_at,
    next_steps: report.next_steps?.slice(0, 500) ?? null,
    required_documents: (report.required_documents ?? []).slice(0, 20),
    postponement_reason: report.postponement_reason?.slice(0, 500) ?? null,
  }))
  let grounding = JSON.stringify(compact)
  while (grounding.length > 11_500 && compact.length > 1) {
    compact.pop()
    grounding = JSON.stringify(compact)
  }
  return grounding
}
