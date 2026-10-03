import { describe, expect, it } from "vitest"

import { aggregateStats } from "./stats"

describe("aggregateStats", () => {
  it("returns zeros for an empty list", () => {
    expect(aggregateStats([])).toEqual({ byStatus: {}, openRequests: 0, overdue: 0, reportsToVerify: 0, avgResolutionHours: null })
  })

  it("sums statuses, overdue and reports across services", () => {
    const result = aggregateStats([
      { requests_by_status: { new: 2, in_progress: 1, closed: 3 }, requests_overdue: 1, reports_to_verify: 2, avg_resolution_hours: 10 },
      { requests_by_status: { new: 1, resolved: 1 }, requests_overdue: 0, reports_to_verify: 1, avg_resolution_hours: 40 },
    ])
    expect(result.byStatus).toEqual({ new: 3, in_progress: 1, closed: 3, resolved: 1 })
    expect(result.openRequests).toBe(4)
    expect(result.overdue).toBe(1)
    expect(result.reportsToVerify).toBe(3)
  })

  it("weights the average resolution time by closed requests", () => {
    const result = aggregateStats([
      { requests_by_status: { closed: 3 }, requests_overdue: 0, reports_to_verify: 0, avg_resolution_hours: 10 },
      { requests_by_status: { closed: 1 }, requests_overdue: 0, reports_to_verify: 0, avg_resolution_hours: 50 },
    ])
    expect(result.avgResolutionHours).toBe(20)
  })

  it("ignores services without a resolution average", () => {
    expect(aggregateStats([{ requests_by_status: { new: 1 }, requests_overdue: 0, reports_to_verify: 0, avg_resolution_hours: null }]).avgResolutionHours).toBeNull()
  })
})
