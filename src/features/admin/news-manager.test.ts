import { describe, expect, it } from "vitest"

import { newsTransition } from "./news-manager"

const NOW = new Date("2026-10-03T12:00:00Z")

describe("newsTransition", () => {
  it("stamps the reviewer and publication date when publishing", () => {
    expect(newsTransition("published", "admin-1", NOW)).toEqual({ status: "published", reviewed_by: "admin-1", published_at: NOW.toISOString() })
  })
  it("only changes the status for other transitions", () => {
    expect(newsTransition("archived", "admin-1", NOW)).toEqual({ status: "archived" })
    expect(newsTransition("draft", "admin-1", NOW)).toEqual({ status: "draft" })
  })
})
