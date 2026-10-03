import { describe, expect, it } from "vitest"

import { callDuration } from "./support-pages"

describe("callDuration", () => {
  it("returns elapsed seconds", () => {
    expect(callDuration("2026-10-03T10:00:00Z", new Date("2026-10-03T10:06:00Z"))).toBe(360)
  })
  it("never returns a negative duration", () => {
    expect(callDuration("2026-10-03T10:10:00Z", new Date("2026-10-03T10:00:00Z"))).toBe(0)
  })
})
