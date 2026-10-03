import { describe, expect, it } from "vitest"

import { createLoginThrottle } from "./login-throttle"

describe("createLoginThrottle", () => {
  it("allows attempts until the failure limit is reached", () => {
    const throttle = createLoginThrottle({ maxFailures: 3, lockMs: 1000 })
    for (let i = 0; i < 2; i++) throttle.recordFailure("a@b.co", 0)
    expect(throttle.remainingMs("a@b.co", 0)).toBe(0)
    throttle.recordFailure("a@b.co", 0)
    expect(throttle.remainingMs("a@b.co", 0)).toBe(1000)
    expect(throttle.remainingMs("a@b.co", 400)).toBe(600)
  })

  it("unlocks after the lock delay and restarts the count", () => {
    const throttle = createLoginThrottle({ maxFailures: 2, lockMs: 1000 })
    throttle.recordFailure("a@b.co", 0)
    throttle.recordFailure("a@b.co", 0)
    expect(throttle.remainingMs("a@b.co", 1500)).toBe(0)
    throttle.recordFailure("a@b.co", 1500)
    expect(throttle.remainingMs("a@b.co", 1500)).toBe(0)
  })

  it("is case-insensitive and resettable, and isolates accounts", () => {
    const throttle = createLoginThrottle({ maxFailures: 1, lockMs: 1000 })
    throttle.recordFailure("A@B.co", 0)
    expect(throttle.remainingMs("a@b.CO", 0)).toBe(1000)
    expect(throttle.remainingMs("other@b.co", 0)).toBe(0)
    throttle.reset("a@b.co")
    expect(throttle.remainingMs("a@b.co", 0)).toBe(0)
  })
})
