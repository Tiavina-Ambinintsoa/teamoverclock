import { describe, expect, it } from "vitest"

import { slugify, uniqueSlug } from "./slug"

describe("slugify", () => {
  it("removes accents, punctuation and extra dashes", () => {
    expect(slugify("Le dôme Lumen ferme pour travaux !")).toBe("le-dome-lumen-ferme-pour-travaux")
    expect(slugify("  --Hello   World--  ")).toBe("hello-world")
  })
  it("returns an empty string when nothing is usable", () => {
    expect(slugify("???")).toBe("")
  })
  it("limits the length", () => {
    expect(slugify("a".repeat(200)).length).toBe(80)
  })
})

describe("uniqueSlug", () => {
  it("appends a suffix and has a fallback for empty titles", () => {
    expect(uniqueSlug("Mon titre", 1000)).toMatch(/^mon-titre-[a-z0-9]{1,5}$/)
    expect(uniqueSlug("???", 1000)).toMatch(/^actualite-/)
  })
  it("differs for different timestamps", () => {
    expect(uniqueSlug("x", 1_000_000)).not.toBe(uniqueSlug("x", 2_000_000))
  })
})
