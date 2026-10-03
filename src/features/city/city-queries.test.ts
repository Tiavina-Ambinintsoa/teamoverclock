import { describe, expect, it } from "vitest"

import { isNewsActive } from "./city-queries"

describe("isNewsActive", () => {
  const now = new Date("2026-10-03T12:00:00Z")

  it("is true for a published item without an end date", () => {
    expect(isNewsActive({ status: "published", valid_until: null }, now)).toBe(true)
  })
  it("is true until the validity ends, then false", () => {
    expect(isNewsActive({ status: "published", valid_until: "2026-10-04T00:00:00Z" }, now)).toBe(true)
    expect(isNewsActive({ status: "published", valid_until: "2026-10-01T00:00:00Z" }, now)).toBe(false)
  })
  it("is false for archived items and drafts", () => {
    expect(isNewsActive({ status: "archived", valid_until: null }, now)).toBe(false)
    expect(isNewsActive({ status: "draft", valid_until: null }, now)).toBe(false)
  })
})
