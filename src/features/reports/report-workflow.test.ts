import { describe, expect, it } from "vitest"

import { canPublish, canValidateReport, groupReports, reportSchema, reportTransitions, transcriptNeedsReview } from "./report-workflow"

describe("reportTransitions", () => {
  it("follows the lifecycle and ends at archived", () => {
    expect(reportTransitions("to_verify")).toEqual(["validated", "rejected"])
    expect(reportTransitions("archived")).toEqual([])
    expect(reportTransitions("rejected")).not.toContain("validated")
  })
})

describe("canPublish", () => {
  it("requires a validator and a validated-or-later status", () => {
    expect(canPublish("validated", "admin")).toBe(true)
    expect(canPublish("resolved", "admin")).toBe(true)
    expect(canPublish("validated", null)).toBe(false)
    expect(canPublish("to_verify", "admin")).toBe(false)
    expect(canPublish("rejected", "admin")).toBe(false)
  })
})

describe("canValidateReport", () => {
  const report = { service_id: "svc-police" }
  it("lets a general admin validate anything", () => {
    expect(canValidateReport({ isAdmin: true, validatorServiceIds: [] }, report)).toBe(true)
  })
  it("only lets validators of the report's own service validate", () => {
    expect(canValidateReport({ isAdmin: false, validatorServiceIds: ["svc-police"] }, report)).toBe(true)
    expect(canValidateReport({ isAdmin: false, validatorServiceIds: ["svc-fire"] }, report)).toBe(false)
    expect(canValidateReport({ isAdmin: false, validatorServiceIds: ["svc-police"] }, { service_id: null })).toBe(false)
  })
})

describe("transcriptNeedsReview", () => {
  it("blocks submission of an unreviewed transcript only", () => {
    expect(transcriptNeedsReview("bonjour", false)).toBe(true)
    expect(transcriptNeedsReview("bonjour", true)).toBe(false)
    expect(transcriptNeedsReview("", false)).toBe(false)
    expect(transcriptNeedsReview(null, false)).toBe(false)
  })
})

describe("groupReports", () => {
  const reports = [
    { id: "1", category: "noise", sector_id: "s2" },
    { id: "2", category: "infrastructure", sector_id: "s4" },
    { id: "3", category: "infrastructure", sector_id: "s2" },
    { id: "4", category: "infrastructure", sector_id: "s4" },
  ]
  it("groups by type, biggest group first", () => {
    const groups = groupReports(reports, "type")
    expect(groups[0].key).toBe("infrastructure")
    expect(groups[0].items).toHaveLength(3)
  })
  it("groups by location", () => {
    const groups = groupReports(reports, "location")
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([["s2", 2], ["s4", 2]])
  })
})

describe("reportSchema", () => {
  const valid = { title: "Lampadaire", description: "Il clignote depuis trois jours", category: "infrastructure", sectorId: "s1", buildingId: "", observedAt: "2026-10-03T10:00", priority: "medium" }
  it("accepts a complete report and an empty building", () => {
    expect(reportSchema.safeParse(valid).success).toBe(true)
  })
  it("rejects short descriptions, missing sectors and unknown categories", () => {
    expect(reportSchema.safeParse({ ...valid, description: "court" }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, sectorId: "" }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, category: "ufo" }).success).toBe(false)
  })
})
