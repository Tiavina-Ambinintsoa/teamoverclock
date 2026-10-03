import { describe, expect, it } from "vitest"

import { generateDescription, isValidDescription } from "./ai-content"

describe("generateDescription", () => {
  it("is deterministic for the same name and mentions the element", () => {
    const a = generateDescription("sectors", "Nexus Core")
    expect(a).toBe(generateDescription("sectors", "Nexus Core"))
    expect(a).toContain("Nexus Core")
    expect(a).toContain("à relire avant publication")
  })
  it("adapts the wording to the target and includes a hint", () => {
    expect(generateDescription("buildings", "Hôpital", "Ouvert 24 h/24.")).toContain("Le bâtiment")
    expect(generateDescription("services", "Police", "Sécurité publique")).toContain("Sécurité publique.")
  })
  it("always produces a valid description", () => {
    expect(isValidDescription(generateDescription("sectors", "X"))).toBe(true)
  })
})

describe("isValidDescription", () => {
  it("rejects too short or too long texts", () => {
    expect(isValidDescription("court")).toBe(false)
    expect(isValidDescription("x".repeat(601))).toBe(false)
    expect(isValidDescription("Une description suffisante pour un citoyen.")).toBe(true)
  })
})
