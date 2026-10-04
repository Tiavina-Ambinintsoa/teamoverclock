import { describe, expect, it } from "vitest"

import { LOCALES } from "@/lib/locale"
import { BUILT_IN_TOURS, currentPageTour, mergeTours, pendingWelcome, popoverPosition, stepsFor, tourDescription, tourTitle, toursForRole, type GuideTour } from "./guide-tours"

describe("built-in tours", () => {
  it("creates a keyboard-guided tour for the current route and signup form", () => {
    expect(currentPageTour("/inscription", "Create an account", "en").steps[0]).toMatchObject({
      route: "/inscription",
      target_selector: '[data-tour="signup-form"]',
      body: expect.stringContaining("Tab"),
    })
    expect(currentPageTour("/admin/users", "Users", "fr").steps[0].target_selector).toBe('[data-tour="page-content"]')
  })

  it("has a 10-step welcome tour in French and English", () => {
    const welcome = BUILT_IN_TOURS.find((t) => t.code === "welcome") as GuideTour
    expect(stepsFor(welcome, "fr")).toHaveLength(10)
    expect(stepsFor(welcome, "en")).toHaveLength(10)
    expect(stepsFor(welcome, "fr").map((s) => s.step_order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
  it("localizes tours and the current-page help for every supported language", () => {
    const welcome = BUILT_IN_TOURS.find((tour) => tour.code === "welcome") as GuideTour
    const translatedWelcome = new Map([
      ["mg", ["Tongasoa", "Tanànan'ny hoavy i Nova Terra. Ity torolalana ity dia mampahafantatra anao ny vavahady amin'ny dingana vitsivitsy."]],
      ["mfe", ["Bienveni", "Nova Terra se lavil fitir. Sa gid-la montre ou portal-la an detrwa letap."]],
      ["rcf", ["Bienvenue", "Nova Terra sé la vil du fitir. Sa gid i fé découvr lo portay an kèk letap."]],
      ["x-nova", ["Nexa-vexa", "Nova Terra future-city. Nexa-guide portal walk, several steps."]],
    ])
    for (const locale of LOCALES) {
      const step = stepsFor(welcome, locale)[0]
      expect(step).toBeDefined()
      expect(step.locale).toBe(locale)
      expect(tourTitle(welcome, locale)).not.toBe("")
      expect(tourDescription(welcome, locale)).not.toBe("")
      expect(currentPageTour("/", "Reports", locale).steps[0].body).not.toBe("")
      if (locale !== "fr" && locale !== "en") {
        const [title, body] = translatedWelcome.get(locale) ?? []
        expect(step.title).toBe(title)
        expect(step.body).toBe(body)
      }
    }
  })
  it("gives every step a spoken script", () => {
    for (const tour of BUILT_IN_TOURS) for (const s of tour.steps) expect(s.voice_script).toBeTruthy()
  })
})

describe("mergeTours", () => {
  const dbTour: GuideTour = { ...BUILT_IN_TOURS[0], title: "DB welcome" }
  it("lets database tours override built-ins with the same code", () => {
    const merged = mergeTours([dbTour])
    expect(merged.find((t) => t.code === "welcome")?.title).toBe("DB welcome")
    expect(merged.length).toBe(BUILT_IN_TOURS.length)
  })
  it("ignores database tours without steps and adds new codes", () => {
    expect(mergeTours([{ ...dbTour, steps: [] }]).find((t) => t.code === "welcome")?.title).not.toBe("DB welcome")
    expect(mergeTours([{ ...dbTour, code: "extra" }]).some((t) => t.code === "extra")).toBe(true)
  })
})

describe("toursForRole / stepsFor / pendingWelcome", () => {
  it("filters by audience and treats visitors as citizens", () => {
    const tours = [{ ...BUILT_IN_TOURS[0], code: "a", audience: ["agent" as const] }, { ...BUILT_IN_TOURS[0], code: "b", audience: ["citizen" as const] }]
    expect(toursForRole(tours, "agent").map((t) => t.code)).toEqual(["a"])
    expect(toursForRole(tours, null).map((t) => t.code)).toEqual(["b"])
  })
  it("falls back to French when a language has no steps", () => {
    const tour = { ...BUILT_IN_TOURS[0], steps: BUILT_IN_TOURS[0].steps.filter((s) => s.locale === "fr") }
    expect(stepsFor(tour, "en")).toHaveLength(10)
  })
  it("proposes the welcome tour until it is completed", () => {
    expect(pendingWelcome(BUILT_IN_TOURS, [])?.code).toBe("welcome")
    expect(pendingWelcome(BUILT_IN_TOURS, ["welcome"])).toBeNull()
  })
})

describe("popoverPosition", () => {
  const viewport = { width: 1000, height: 700 }
  const target = { top: 300, left: 400, width: 100, height: 40 }
  it("centers when there is no target or placement is center", () => {
    expect(popoverPosition(null, "bottom", viewport)).toEqual({ top: 240, left: 330 })
    expect(popoverPosition(target, "center", viewport)).toEqual({ top: 240, left: 330 })
  })
  it("places the card below or above the target", () => {
    expect(popoverPosition(target, "bottom", viewport).top).toBe(352)
    expect(popoverPosition(target, "top", viewport).top).toBe(68)
  })
  it("stays inside the viewport and flips when there is no room", () => {
    const edge = { top: 10, left: 0, width: 50, height: 30 }
    const pos = popoverPosition(edge, "top", viewport)
    expect(pos.top).toBeGreaterThanOrEqual(12)
    expect(pos.left).toBeGreaterThanOrEqual(12)
    const bottom = popoverPosition({ top: 650, left: 400, width: 100, height: 30 }, "bottom", viewport)
    expect(bottom.top + 220).toBeLessThanOrEqual(700 - 12)
  })
})
