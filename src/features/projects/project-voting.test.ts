import { describe, expect, it } from "vitest"

import { canParticipateInCivicVoting } from "@/features/projects/project-voting"

describe("civic voting helpers", () => {
  it("requires a verified citizen to participate", () => {
    expect(canParticipateInCivicVoting("verified")).toBe(true)
    expect(canParticipateInCivicVoting("pending")).toBe(false)
    expect(canParticipateInCivicVoting(undefined)).toBe(false)
  })

})
