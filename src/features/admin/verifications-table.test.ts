import { describe, expect, it } from "vitest"

import { countByStatus, EMPTY_FILTERS, filterVerifications, sortVerifications, type VerificationItem } from "./verifications-table"

const base: VerificationItem = {
  id: "1", status: "pending", ai_model: "m", ai_score: 0.5, rejection_reason: null, submitted_at: "2026-10-01T10:00:00Z",
  decided_at: null, cin_image_path: null, citizen_id: "c1", cin_number: "NT-123", display_name: "Alice",
}
const items: VerificationItem[] = [
  base,
  { ...base, id: "2", status: "validated", display_name: "Bob", cin_number: "NT-999", submitted_at: "2026-10-03T10:00:00Z", ai_score: 0.9 },
  { ...base, id: "3", status: "rejected", display_name: "Chloé", cin_number: null, submitted_at: "2026-10-02T10:00:00Z", ai_score: 0.2 },
]

describe("verifications table helpers", () => {
  it("filters by search, status and dates", () => {
    expect(filterVerifications(items, { ...EMPTY_FILTERS, search: "bob" }).map((i) => i.id)).toEqual(["2"])
    expect(filterVerifications(items, { ...EMPTY_FILTERS, search: "nt-123" }).map((i) => i.id)).toEqual(["1"])
    expect(filterVerifications(items, { ...EMPTY_FILTERS, status: "rejected" }).map((i) => i.id)).toEqual(["3"])
    expect(filterVerifications(items, { ...EMPTY_FILTERS, from: "2026-10-02", to: "2026-10-02" }).map((i) => i.id)).toEqual(["3"])
  })
  it("sorts and counts", () => {
    expect(sortVerifications(items, "submitted_at", "desc").map((i) => i.id)).toEqual(["2", "3", "1"])
    expect(sortVerifications(items, "ai_score", "asc").map((i) => i.id)).toEqual(["3", "1", "2"])
    expect(countByStatus(items)).toEqual({ pending: 1, validated: 1, rejected: 1 })
  })
})
