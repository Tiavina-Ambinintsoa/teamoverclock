import { describe, expect, it } from "vitest"

import { escapeSearch, formatDate, formatDateTime, isOverdue, unwrap } from "./query-helpers"

describe("unwrap", () => {
  it("returns data", () => {
    expect(unwrap({ data: [1, 2], error: null }, [])).toEqual([1, 2])
  })
  it("returns the fallback when data is null", () => {
    expect(unwrap({ data: null, error: null }, ["x"])).toEqual(["x"])
  })
  it("throws the supabase error", () => {
    expect(() => unwrap({ data: null, error: { message: "boom" } }, [])).toThrow("boom")
  })
})

describe("escapeSearch", () => {
  it("removes characters that break PostgREST filters", () => {
    expect(escapeSearch("a,b(c)%_*d")).toBe("a b c d")
    expect(escapeSearch("  espace   double ")).toBe("espace double")
  })
})

describe("date formatting", () => {
  it("returns a dash for empty or invalid values", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDateTime("not-a-date")).toBe("—")
  })
  it("formats a valid date", () => {
    expect(formatDate("2026-10-03T10:00:00Z")).toContain("2026")
  })
})

describe("isOverdue", () => {
  const now = new Date("2026-10-03T12:00:00Z")
  it("flags open requests past their due date", () => {
    expect(isOverdue("2026-10-01T00:00:00Z", "in_progress", now)).toBe(true)
  })
  it("ignores closed requests and missing dates", () => {
    expect(isOverdue("2026-10-01T00:00:00Z", "closed", now)).toBe(false)
    expect(isOverdue(null, "new", now)).toBe(false)
    expect(isOverdue("2026-10-05T00:00:00Z", "new", now)).toBe(false)
  })
})
