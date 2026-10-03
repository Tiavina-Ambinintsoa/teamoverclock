import { describe, expect, it } from "vitest"

import { changedKeys } from "./admin-extra-pages"

describe("changedKeys", () => {
  it("lists only the keys whose value changed, ignoring updated_at", () => {
    expect(changedKeys({ status: "received", n: 1, updated_at: "a" }, { status: "validated", n: 1, updated_at: "b" })).toEqual(["status"])
  })
  it("detects added and removed keys and handles null sides", () => {
    expect(changedKeys({ a: 1 }, { b: 2 }).sort()).toEqual(["a", "b"])
    expect(changedKeys(null, { role: "agent" })).toEqual(["role"])
    expect(changedKeys(null, null)).toEqual([])
  })
  it("compares nested values structurally", () => {
    expect(changedKeys({ prefs: { a: 1 } }, { prefs: { a: 1 } })).toEqual([])
    expect(changedKeys({ prefs: { a: 1 } }, { prefs: { a: 2 } })).toEqual(["prefs"])
  })
})
