import { describe, expect, it } from "vitest"

import {
  filterAndSortProfiles,
  formatReputationPoints,
  getReputationProgress,
  toReputationLevel,
  type ReputationProfileRow,
} from "@/features/reputation/reputation-utils"

function profile(overrides: Partial<ReputationProfileRow>): ReputationProfileRow {
  return {
    id: overrides.id ?? "p1",
    display_name: overrides.display_name ?? "Alice",
    avatar_url: overrides.avatar_url ?? null,
    reputation_points: overrides.reputation_points ?? 0,
    reputation_level: overrides.reputation_level ?? "newcomer",
  }
}

describe("getReputationProgress", () => {
  it("uses the documented thresholds", () => {
    expect(getReputationProgress(9)).toMatchObject({ level: "newcomer", nextLevel: "regular", progressPercent: 90 })
    expect(getReputationProgress(50)).toMatchObject({ level: "trusted", nextLevel: "guardian" })
    expect(getReputationProgress(150)).toMatchObject({ level: "guardian", nextLevel: null, progressPercent: 100 })
  })
})

describe("filterAndSortProfiles", () => {
  it("filters by search and level, then sorts by points", () => {
    const rows = [
      profile({ id: "one", display_name: "Alice", reputation_points: 15, reputation_level: "regular" }),
      profile({ id: "two", display_name: "Bob", reputation_points: 90, reputation_level: "trusted" }),
      profile({ id: "three", display_name: "Alicia", reputation_points: 12, reputation_level: "regular" }),
    ]

    const filtered = filterAndSortProfiles(rows, { search: "ali", level: "regular", sort: "points-desc" })

    expect(filtered.map((row) => row.id)).toEqual(["one", "three"])
  })
})

describe("helpers", () => {
  it("normalizes labels", () => {
    expect(toReputationLevel("guardian")).toBe("guardian")
    expect(toReputationLevel("unknown")).toBe("newcomer")
    expect(formatReputationPoints(2)).toBe("+2")
    expect(formatReputationPoints(-1)).toBe("-1")
  })
})
