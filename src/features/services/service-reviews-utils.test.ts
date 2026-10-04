import { describe, expect, it } from "vitest"

import { buildReviewStatsMap, formatAverageRating } from "@/features/services/service-reviews-utils"

describe("formatAverageRating", () => {
  it("formats nullable averages consistently", () => {
    expect(formatAverageRating(null, "fr-FR")).toBe("—")
    expect(formatAverageRating(4, "fr-FR")).toBe("4")
    expect(formatAverageRating(4.25, "en-US")).toBe("4.3")
  })
})

describe("buildReviewStatsMap", () => {
  it("keys service and facility stats by target", () => {
    expect(buildReviewStatsMap([
      { service_id: "s1", building_id: null, average_rating: 4.2, review_count: 3 },
      { service_id: "s1", building_id: "b1", average_rating: 5, review_count: 1 },
    ])).toMatchObject({
      __service__: { review_count: 3 },
      b1: { average_rating: 5 },
    })
  })
})
