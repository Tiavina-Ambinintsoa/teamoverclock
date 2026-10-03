import { describe, expect, it } from "vitest"

import { publicationPatch } from "./services-manager"

const NOW = new Date("2026-10-03T12:00:00Z")

describe("publicationPatch", () => {
  it("unpublishes a hidden service", () => {
    expect(publicationPatch("hidden", "2026-01-01T00:00:00Z", NOW)).toEqual({ status: "hidden", published_at: null })
  })
  it("publishes an unpublished service that is reopened", () => {
    expect(publicationPatch("open", null, NOW)).toEqual({ status: "open", published_at: NOW.toISOString() })
  })
  it("keeps the original publication date", () => {
    expect(publicationPatch("temporarily_closed", "2026-01-01T00:00:00Z", NOW).published_at).toBe("2026-01-01T00:00:00Z")
  })
})
