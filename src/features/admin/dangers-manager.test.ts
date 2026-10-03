import { describe, expect, it } from "vitest"

import { activationPatch } from "./dangers-manager"

describe("activationPatch", () => {
  const now = new Date("2026-10-03T12:00:00Z")
  it("validates and activates an alert that has an owner", () => {
    expect(activationPatch("admin-1", "svc-1", now)).toEqual({ status: "active", validated_by: "admin-1", validated_at: now.toISOString() })
  })
  it("refuses to activate an alert without a responsible service", () => {
    expect(activationPatch("admin-1", null, now)).toBeNull()
  })
})
