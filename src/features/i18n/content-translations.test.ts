import { describe, expect, it } from "vitest"

import { localizedField, localizedStructuredField } from "@/features/i18n/content-translations"

describe("localizedField", () => {
  it("returns saved locale copy and falls back to the source when it is missing", () => {
    const translations = { title: { fr: "Service public", mg: "Serivisy ho an’ny daholobe" } }
    expect(localizedField(translations, "title", "mg", "Public service")).toBe("Serivisy ho an’ny daholobe")
    expect(localizedField(translations, "title", "rcf", "Public service")).toBe("Public service")
  })

  it("uses the source value for empty saved translations", () => {
    expect(localizedField({ summary: { en: " " } }, "summary", "en", "Original")).toBe("Original")
  })

  it("uses valid JSON-encoded translations and safely falls back for malformed data", () => {
    const translations = {
      procedures: { mg: '[{"step":1,"text":"Dingana iray"}]', en: "not-json" },
    }
    const original = [{ step: 1, text: "Step one" }]
    const isProcedures = (value: unknown): value is typeof original =>
      Array.isArray(value) && value.every((step) =>
        typeof step === "object" && step !== null &&
        "step" in step && typeof step.step === "number" &&
        "text" in step && typeof step.text === "string"
      )

    expect(localizedStructuredField(translations, "procedures", "mg", original, isProcedures)).toEqual([
      { step: 1, text: "Dingana iray" },
    ])
    expect(localizedStructuredField(translations, "procedures", "en", original, isProcedures)).toBe(original)
  })
})
