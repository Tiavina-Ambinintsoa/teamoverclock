import { describe, expect, it } from "vitest"

import type { PublicReport } from "@/features/reports/report-queries"
import type { Service } from "@/lib/db-types"

import { buildHubKpis, buildHubProjectCards, buildHubReportSummary, buildHubServiceCards, normalizePublicCityStats } from "./hub-queries"

const service = (id: string, name: string): Service => ({
  id,
  department_id: "dept",
  building_id: "building",
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  category: "Citizen care",
  description: `${name} description`,
  address: null,
  phone: null,
  email: null,
  opening_hours: {},
  closing_days: [],
  languages: [],
  procedures: [],
  required_documents: [],
  fees: null,
  booking_url: null,
  default_sla_hours: 24,
  status: "open",
  published_at: "2026-10-01T08:00:00Z",
  is_emergency: false,
  updated_at: "2026-10-01T08:00:00Z",
})

const report = (id: string, category: string, status: PublicReport["status"]): PublicReport => ({
  id,
  report_number: id,
  title: id,
  description: id,
  category,
  sector_id: "sector",
  building_id: null,
  x: null,
  y: null,
  observed_at: `2026-10-0${id}T09:00:00Z`,
  status,
  priority: "high",
  cluster_id: null,
  resolved_at: null,
  reporter_citizen_id: null,
  reporter_name: null,
  reporter_reputation: null,
})

describe("normalizePublicCityStats", () => {
  it("sanitizes payloads into predictable arrays and numbers", () => {
    expect(normalizePublicCityStats({
      service_count: "8",
      public_reports_count: 12,
      top_services: [{ service_id: "svc", request_count: "4", appointment_count: 2, total_usage: "6" }],
      top_report_categories: [{ category: "transport", count: "5" }],
    })).toMatchObject({
      service_count: 8,
      public_reports_count: 12,
      top_services: [{ service_id: "svc", request_count: 4, appointment_count: 2, total_usage: 6 }],
      top_report_categories: [{ key: "transport", count: 5 }],
    })
  })
})

describe("buildHubKpis", () => {
  it("creates the five headline KPI cards", () => {
    expect(buildHubKpis({
      serviceCount: 9,
      publicReportsCount: 14,
      publishedProjectsCount: 3,
      totalProjectVotes: 58,
      activeDangersCount: 2,
      upcomingDeparturesCount: 6,
    })).toEqual([
      { key: "services", value: 9 },
      { key: "reports", value: 14 },
      { key: "projects", value: 3, meta: 58 },
      { key: "dangers", value: 2 },
      { key: "departures", value: 6 },
    ])
  })
})

describe("buildHubReportSummary", () => {
  it("aggregates category and status counts and keeps the latest reports first", () => {
    const summary = buildHubReportSummary([
      report("1", "transport", "validated"),
      report("2", "transport", "resolved"),
      report("3", "health", "resolved"),
    ])
    expect(summary.byCategory).toEqual([
      { key: "transport", count: 2 },
      { key: "health", count: 1 },
    ])
    expect(summary.byStatus).toEqual([
      { key: "resolved", count: 2 },
      { key: "validated", count: 1 },
    ])
    expect(summary.latest.map((entry) => entry.id)).toEqual(["3", "2", "1"])
  })
})

describe("buildHubServiceCards", () => {
  it("ranks services by secured usage when available", () => {
    const cards = buildHubServiceCards(
      [service("a", "Alpha"), service("b", "Beta")],
      [
        { service_id: "b", name: "Beta", category: "Citizen care", request_count: 4, appointment_count: 2, total_usage: 6 },
        { service_id: "a", name: "Alpha", category: "Citizen care", request_count: 3, appointment_count: 0, total_usage: 3 },
      ],
      { a: 10, b: 1 },
    )
    expect(cards.map((card) => card.service.id)).toEqual(["b", "a"])
    expect(cards[0]?.rankingBasis).toBe("usage")
  })

  it("falls back to review counts when usage is unavailable", () => {
    const cards = buildHubServiceCards(
      [service("a", "Alpha"), service("b", "Beta")],
      [],
      { a: 2, b: 9 },
    )
    expect(cards.map((card) => card.service.id)).toEqual(["b", "a"])
    expect(cards[0]?.rankingBasis).toBe("reviews")
  })
})

describe("buildHubProjectCards", () => {
  it("merges vote summaries and computes support ratios", () => {
    const cards = buildHubProjectCards(
      [
        { id: "p1", service_id: "svc", title: "Project 1", description: "A", status: "published", created_at: "2026-10-03T09:00:00Z" },
        { id: "p2", service_id: "svc", title: "Project 2", description: "B", status: "published", created_at: "2026-10-02T09:00:00Z" },
      ],
      [
        { project_id: "p2", service_id: "svc", title: "Project 2", status: "published", created_at: "2026-10-02T09:00:00Z", yes_votes: 9, no_votes: 3, comment_count: 1, total_votes: 12 },
      ],
    )
    expect(cards[0]).toMatchObject({ id: "p2", totalVotes: 12, supportRatio: 0.75, opposeRatio: 0.25 })
    expect(cards[1]).toMatchObject({ id: "p1", totalVotes: 0, supportRatio: 0, opposeRatio: 0 })
  })
})
