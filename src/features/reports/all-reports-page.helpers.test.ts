import { describe, expect, it } from "vitest"

import type { ReportRow } from "@/lib/db-types"
import { filterAndSortReports, paginateRows, type AllReportsFilters } from "@/features/reports/all-reports-page.helpers"

const baseFilters: AllReportsFilters = {
  search: "",
  status: "",
  priority: "",
  category: "",
  sectorId: "",
  serviceId: "",
  source: "",
  from: "",
  to: "",
  onlyPublic: false,
  sort: "observed-desc",
}

function report(overrides: Partial<ReportRow>): ReportRow {
  return {
    id: overrides.id ?? "r1",
    report_number: overrides.report_number ?? "NT-REP-0001",
    title: overrides.title ?? "Broken light",
    description: overrides.description ?? "Description",
    category: overrides.category ?? "safety",
    sector_id: overrides.sector_id ?? "sector-a",
    building_id: overrides.building_id ?? null,
    observed_at: overrides.observed_at ?? "2026-10-02T12:00:00.000Z",
    source: overrides.source ?? "citizen",
    reporter_citizen_id: overrides.reporter_citizen_id ?? null,
    service_id: overrides.service_id ?? "service-a",
    assigned_agent_id: overrides.assigned_agent_id ?? null,
    priority: overrides.priority ?? "medium",
    status: overrides.status ?? "received",
    confidence_score: overrides.confidence_score ?? null,
    facts: overrides.facts ?? {},
    voice_transcript: overrides.voice_transcript ?? null,
    transcript_reviewed: overrides.transcript_reviewed ?? false,
    cluster_id: overrides.cluster_id ?? null,
    validated_by: overrides.validated_by ?? null,
    validated_at: overrides.validated_at ?? null,
    resolved_at: overrides.resolved_at ?? null,
    is_public: overrides.is_public ?? false,
    next_steps: overrides.next_steps ?? null,
    required_documents: overrides.required_documents ?? [],
    postponement_reason: overrides.postponement_reason ?? null,
    created_at: overrides.created_at ?? "2026-10-03T12:00:00.000Z",
  }
}

describe("filterAndSortReports", () => {
  it("filters by visible options", () => {
    const rows = [
      report({ id: "one", title: "Leak", report_number: "A-01", is_public: true, priority: "critical", status: "validated", category: "environment", source: "camera", sector_id: "s1", service_id: "svc-1", observed_at: "2026-10-02T10:00:00.000Z" }),
      report({ id: "two", title: "Road", report_number: "B-02", is_public: false, priority: "low", status: "received", category: "transport", source: "citizen", sector_id: "s2", service_id: "svc-2", observed_at: "2026-10-04T10:00:00.000Z" }),
    ]

    const filtered = filterAndSortReports(rows, {
      ...baseFilters,
      search: "a-01",
      status: "validated",
      priority: "critical",
      category: "environment",
      sectorId: "s1",
      serviceId: "svc-1",
      source: "camera",
      from: "2026-10-01",
      to: "2026-10-03",
      onlyPublic: true,
    })

    expect(filtered.map((item) => item.id)).toEqual(["one"])
  })

  it("sorts critical reports first when requested", () => {
    const rows = [
      report({ id: "low", priority: "low", observed_at: "2026-10-04T10:00:00.000Z" }),
      report({ id: "critical", priority: "critical", observed_at: "2026-10-01T10:00:00.000Z" }),
      report({ id: "high", priority: "high", observed_at: "2026-10-03T10:00:00.000Z" }),
    ]

    const filtered = filterAndSortReports(rows, { ...baseFilters, sort: "priority-desc" })

    expect(filtered.map((item) => item.id)).toEqual(["critical", "high", "low"])
  })
})

describe("paginateRows", () => {
  it("clamps the page and returns the visible slice", () => {
    const rows = ["a", "b", "c", "d", "e"]
    const paginated = paginateRows(rows, 4, 2)

    expect(paginated.pageCount).toBe(3)
    expect(paginated.currentPage).toBe(3)
    expect(paginated.rows).toEqual(["e"])
  })
})
