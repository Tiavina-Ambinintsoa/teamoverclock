import { describe, expect, it } from "vitest"

import { ageAtDate, personalizedHeatAdvice } from "@/features/alerts/heatwave-guidance"

describe("ageAtDate", () => {
  it("calculates the age before and after a birthday", () => {
    expect(ageAtDate("1960-10-04", new Date("2026-10-03T12:00:00"))).toBe(65)
    expect(ageAtDate("1960-10-02", new Date("2026-10-03T12:00:00"))).toBe(66)
  })

  it("ignores missing or future birth dates", () => {
    expect(ageAtDate(null, new Date("2026-10-03T12:00:00"))).toBeNull()
    expect(ageAtDate("2027-01-01", new Date("2026-10-03T12:00:00"))).toBeNull()
  })
})

describe("personalizedHeatAdvice", () => {
  it("does not personalize without explicit consent", () => {
    expect(personalizedHeatAdvice(80, ["cardiac"], false)).toEqual([])
  })

  it("offers additional safe guidance to older or medically vulnerable people", () => {
    expect(personalizedHeatAdvice(65, [], true)).toHaveLength(3)
    expect(personalizedHeatAdvice(4, [], true)).toHaveLength(3)
    expect(personalizedHeatAdvice(30, ["respiratory"], true, "en")[0]).toContain("vulnerable to heat")
    expect(personalizedHeatAdvice(30, [], true)).toEqual([])
  })
})
