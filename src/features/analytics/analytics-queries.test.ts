import { describe, expect, it } from "vitest"

import { analyticsTestUtils, createAnalyticsPeriod } from "./analytics-queries"

describe("analytics helpers", () => {
  it("creates adjacent comparison periods", () => {
    const period = createAnalyticsPeriod(7, new Date("2026-10-04T12:00:00Z"))
    expect(period.currentStart.toISOString()).toBe("2026-09-28T00:00:00.000Z")
    expect(period.currentEnd.toISOString()).toBe("2026-10-05T00:00:00.000Z")
    expect(period.previousStart.toISOString()).toBe("2026-09-21T00:00:00.000Z")
    expect(period.previousEnd.toISOString()).toBe("2026-09-28T00:00:00.000Z")
  })

  it("builds daily created and resolved trends", () => {
    const period = createAnalyticsPeriod(7, new Date("2026-10-04T12:00:00Z"))
    const rows = analyticsTestUtils.buildDailyTrend(
      [
        { created_at: "2026-10-02T04:00:00Z", resolved_at: null },
        { created_at: "2026-10-03T05:00:00Z", resolved_at: "2026-10-04T07:00:00Z" },
      ],
      period,
      (row) => row.created_at,
      (row) => row.resolved_at,
    )
    expect(rows).toEqual([
      { date: "2026-09-28", created: 0, resolved: 0 },
      { date: "2026-09-29", created: 0, resolved: 0 },
      { date: "2026-09-30", created: 0, resolved: 0 },
      { date: "2026-10-01", created: 0, resolved: 0 },
      { date: "2026-10-02", created: 1, resolved: 0 },
      { date: "2026-10-03", created: 1, resolved: 0 },
      { date: "2026-10-04", created: 0, resolved: 1 },
    ])
  })

  it("computes breakdown deltas and shares", () => {
    const period = createAnalyticsPeriod(7, new Date("2026-10-04T12:00:00Z"))
    const rows = analyticsTestUtils.buildBreakdownRows(
      [
        { created_at: "2026-10-01T10:00:00Z", status: "new" },
        { created_at: "2026-10-02T10:00:00Z", status: "new" },
        { created_at: "2026-09-24T10:00:00Z", status: "new" },
        { created_at: "2026-09-25T10:00:00Z", status: "closed" },
      ],
      period,
      (row) => row.created_at,
      (row) => row.status,
      (key) => key.toUpperCase(),
    )
    expect(rows[0]).toMatchObject({ key: "new", label: "NEW", current: 2, previous: 1, delta: 100, share: 100 })
    expect(rows[1]).toMatchObject({ key: "closed", label: "CLOSED", current: 0, previous: 1, delta: -100, share: 0 })
  })

  it("computes resolution averages and medians", () => {
    const period = createAnalyticsPeriod(30, new Date("2026-10-04T12:00:00Z"))
    const summary = analyticsTestUtils.buildResolutionSummary(
      [
        { created_at: "2026-10-01T00:00:00Z", resolved_at: "2026-10-01T12:00:00Z" },
        { created_at: "2026-10-02T00:00:00Z", resolved_at: "2026-10-03T00:00:00Z" },
        { created_at: "2026-09-01T00:00:00Z", resolved_at: "2026-09-02T00:00:00Z" },
      ],
      period,
      (row) => row.created_at,
      (row) => row.resolved_at,
    )
    expect(summary).toEqual({ averageHours: 18, medianHours: 18, count: 2 })
  })

  it("sorts critical open items by priority, overdue and assignment", () => {
    const rows = analyticsTestUtils.buildCriticalOpenItems(
      [
        {
          id: "rep-1",
          report_number: "REP-1",
          title: "Critical report",
          category: "safety",
          sector_id: "s1",
          service_id: "srv-1",
          assigned_agent_id: null,
          priority: "critical",
          status: "received",
          created_at: "2026-10-01T00:00:00Z",
          updated_at: "2026-10-01T00:00:00Z",
          resolved_at: null,
        },
      ],
      [
        {
          id: "req-1",
          tracking_number: "REQ-1",
          subject: "Late request",
          category: "water",
          service_id: "srv-1",
          assigned_agent_id: "agent-1",
          priority: "high",
          status: "in_progress",
          created_at: "2026-10-02T00:00:00Z",
          updated_at: "2026-10-02T00:00:00Z",
          closed_at: null,
          due_at: "2026-10-03T00:00:00Z",
        },
      ],
      new Map([["srv-1", "Water Service"]]),
      new Date("2026-10-04T12:00:00Z"),
    )
    expect(rows[0]).toMatchObject({ kind: "report", reference: "REP-1", serviceName: "Water Service" })
    expect(rows[1]).toMatchObject({ kind: "request", reference: "REQ-1", overdue: true })
  })
})
