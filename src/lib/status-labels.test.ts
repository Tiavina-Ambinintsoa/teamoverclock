import { describe, expect, it } from "vitest"

import {
  BUILDING_TYPE_LABELS,
  REPORT_STATUSES,
  REQUEST_STATUSES,
  pickLabel,
  statusLabel,
  statusTone,
} from "./status-labels"

describe("statusLabel / statusTone", () => {
  it("translates known statuses", () => {
    expect(statusLabel("request", "in_progress", "fr")).toBe("En cours")
    expect(statusLabel("request", "in_progress", "en")).toBe("In progress")
    expect(statusLabel("severity", "extreme", "fr")).toBe("Extrême")
  })
  it("falls back to the raw value and a neutral tone for unknown statuses", () => {
    expect(statusLabel("request", "mystery")).toBe("mystery")
    expect(statusTone("request", "mystery")).toBe("outline")
  })
  it("flags problems with a destructive tone", () => {
    expect(statusTone("request", "rejected")).toBe("destructive")
    expect(statusTone("service", "suspended")).toBe("destructive")
  })
})

describe("status lists", () => {
  it("cover every SQL enum value", () => {
    expect(REQUEST_STATUSES).toHaveLength(10)
    expect(REPORT_STATUSES).toHaveLength(9)
  })
})

describe("pickLabel", () => {
  it("picks the label of the active language", () => {
    expect(pickLabel(BUILDING_TYPE_LABELS, "hospital", "en")).toBe("Hospital")
    expect(pickLabel(BUILDING_TYPE_LABELS, "unknown", "fr")).toBe("unknown")
  })
})
