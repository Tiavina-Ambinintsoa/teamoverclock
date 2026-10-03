import { describe, expect, it } from "vitest"

import { describeClosingDays, describeDays, describeOpeningHours } from "./hours"

describe("describeDays", () => {
  it("formats single days, ranges and 24/7", () => {
    expect(describeDays("sat", "fr")).toBe("samedi")
    expect(describeDays("mon-fri", "fr")).toBe("lundi – vendredi")
    expect(describeDays("mon-fri", "en")).toBe("Monday – Friday")
    expect(describeDays("always", "en")).toBe("24/7")
  })
  it("returns unknown keys unchanged", () => {
    expect(describeDays("whenever")).toBe("whenever")
  })
})

describe("describeOpeningHours", () => {
  it("lists every entry", () => {
    expect(describeOpeningHours({ "mon-fri": "08:00-17:00", sat: "09:00-12:00" }, "fr")).toEqual([
      { days: "lundi – vendredi", hours: "08:00-17:00" },
      { days: "samedi", hours: "09:00-12:00" },
    ])
  })
  it("handles missing data", () => {
    expect(describeOpeningHours(null)).toEqual([])
  })
})

describe("describeClosingDays", () => {
  it("translates stored english day names", () => {
    expect(describeClosingDays(["saturday", "sunday"], "fr")).toBe("samedi, dimanche")
    expect(describeClosingDays([], "fr")).toBe("")
  })
})
