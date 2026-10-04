import { describe, expect, it } from "vitest"

import { buildReportSummary, EMPTY_REPORT_SUMMARY_FILTERS, filterOwnedReports, reportSummaryGrounding } from "@/features/reports/report-summary"
import type { ReportRow } from "@/lib/db-types"

const makeReport = (overrides: Partial<ReportRow> = {}): ReportRow => ({
  id: "report-1",
  report_number: "R-001",
  title: "Broken street light",
  description: "A street light is not working.",
  category: "infrastructure",
  sector_id: "sector-1",
  building_id: null,
  observed_at: "2026-10-01T10:00:00Z",
  source: "citizen",
  reporter_citizen_id: "citizen-1",
  service_id: null,
  assigned_agent_id: null,
  priority: "medium",
  status: "received",
  confidence_score: null,
  facts: {},
  voice_transcript: null,
  transcript_reviewed: false,
  cluster_id: null,
  validated_by: null,
  validated_at: null,
  resolved_at: null,
  is_public: false,
  next_steps: null,
  required_documents: [],
  postponement_reason: null,
  created_at: "2026-10-01T10:00:00Z",
  ...overrides,
})

describe("filterOwnedReports", () => {
  const reports = [
    makeReport(),
    makeReport({ id: "report-2", report_number: "R-002", title: "Water leak", category: "environment", priority: "high", status: "resolved", created_at: "2026-10-03T10:00:00Z" }),
  ]

  it("returns every report with empty filters", () => {
    expect(filterOwnedReports(reports, EMPTY_REPORT_SUMMARY_FILTERS)).toEqual(reports)
  })

  it("combines search, category, priority, status, and inclusive date filters", () => {
    expect(filterOwnedReports(reports, {
      search: "WATER", category: "environment", priority: "high", status: "resolved",
      from: "2026-10-03", to: "2026-10-03",
    })).toEqual([reports[1]])
  })

  it("returns no reports when filters do not match", () => {
    expect(filterOwnedReports(reports, { ...EMPTY_REPORT_SUMMARY_FILTERS, from: "2026-10-04" })).toEqual([])
  })
})

describe("report summary", () => {
  const labels = {
    title: "My report summary", generated: "Generated", total: "Total", open: "Open",
    resolved: "Resolved", archived: "Closed", report: "Report", status: "Status",
    category: "Category", priority: "Priority", date: "Date", description: "Description",
    nextSteps: "Next steps", documents: "Documents", postponement: "Postponed", none: "No reports",
    formatStatus: (value: string) => value,
    formatCategory: (value: string) => value,
    formatPriority: (value: string) => value,
  }

  it("includes counts and follow-up information in the text summary", () => {
    const summary = buildReportSummary([
      makeReport({ next_steps: "Wait for inspection", required_documents: ["Receipt"] }),
      makeReport({ id: "report-2", status: "resolved" }),
      makeReport({ id: "report-3", status: "archived" }),
    ], labels)
    expect(summary).toContain("Total: 3 · Open: 1 · Resolved: 1 · Closed: 1")
    expect(summary).toContain("Next steps: Wait for inspection")
    expect(summary).toContain("Documents: Receipt")
  })

  it("bounds AI grounding and does not send more than 50 report records", () => {
    const grounding = reportSummaryGrounding(Array.from({ length: 60 }, (_, index) =>
      makeReport({ id: `report-${index}`, report_number: `R-${index}`, description: "Details ".repeat(200) }),
    ))
    expect(JSON.parse(grounding).length).toBeLessThanOrEqual(50)
    expect(JSON.parse(grounding).length).toBeGreaterThan(0)
    expect(grounding.length).toBeLessThanOrEqual(11_500)
  })
})
