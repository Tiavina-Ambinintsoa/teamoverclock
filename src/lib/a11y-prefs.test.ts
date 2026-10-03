import { beforeEach, describe, expect, it } from "vitest"

import {
  A11Y_STORAGE_KEY,
  DEFAULT_A11Y_PREFS,
  applyA11yPrefs,
  clampFontScale,
  forcedDarkMode,
  isUiTheme,
  normalizePrefs,
  prefsFromRow,
  prefsToRow,
  presetForNeed,
  readStoredPrefs,
  storePrefs,
} from "./a11y-prefs"

describe("clampFontScale", () => {
  it("keeps values inside 0.85–2", () => {
    expect(clampFontScale(1.5)).toBe(1.5)
    expect(clampFontScale(0.5)).toBe(0.85)
    expect(clampFontScale(3)).toBe(2)
  })

  it("falls back to 1 for invalid input", () => {
    expect(clampFontScale("big")).toBe(1)
    expect(clampFontScale(Number.NaN)).toBe(1)
    expect(clampFontScale(undefined)).toBe(1)
  })
})

describe("isUiTheme", () => {
  it("accepts only known themes", () => {
    expect(isUiTheme("high_contrast_dark")).toBe(true)
    expect(isUiTheme("neon")).toBe(false)
    expect(isUiTheme(42)).toBe(false)
  })
})

describe("normalizePrefs", () => {
  it("returns defaults for non-objects", () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_A11Y_PREFS)
    expect(normalizePrefs("x")).toEqual(DEFAULT_A11Y_PREFS)
  })

  it("keeps valid values and repairs invalid ones", () => {
    const prefs = normalizePrefs({ theme: "yellow_on_black", fontScale: 9, lineSpacing: 1.5, ttsRate: 0.1, speechLang: "xx_yy", captions: "yes" })
    expect(prefs.theme).toBe("yellow_on_black")
    expect(prefs.fontScale).toBe(2)
    expect(prefs.lineSpacing).toBe(1.5)
    expect(prefs.ttsRate).toBe(0.5)
    expect(prefs.speechLang).toBe("fr-FR")
    expect(prefs.captions).toBe(false)
  })
})

describe("storage", () => {
  beforeEach(() => window.localStorage.clear())

  it("round-trips preferences", () => {
    const prefs = normalizePrefs({ theme: "high_contrast_light", fontScale: 1.75, readScreenAloud: true, speechVoiceURI: "voice://local-french" })
    storePrefs(prefs)
    expect(readStoredPrefs()).toEqual(prefs)
  })

  it("returns defaults when nothing is stored or JSON is corrupted", () => {
    expect(readStoredPrefs()).toEqual(DEFAULT_A11Y_PREFS)
    window.localStorage.setItem(A11Y_STORAGE_KEY, "{not json")
    expect(readStoredPrefs()).toEqual(DEFAULT_A11Y_PREFS)
  })
})

describe("forcedDarkMode", () => {
  it("maps contrast themes to a color scheme", () => {
    expect(forcedDarkMode("default")).toBeNull()
    expect(forcedDarkMode("high_contrast_light")).toBe(false)
    expect(forcedDarkMode("high_contrast_dark")).toBe(true)
    expect(forcedDarkMode("yellow_on_black")).toBe(true)
  })
})

describe("applyA11yPrefs", () => {
  it("applies contrast, font size and dark class to the root element", () => {
    const root = document.createElement("html")
    applyA11yPrefs(root, { ...DEFAULT_A11Y_PREFS, theme: "high_contrast_dark", fontScale: 1.5, lineSpacing: 1.5, reduceMotion: true })
    expect(root.dataset.contrast).toBe("high_contrast_dark")
    expect(root.style.fontSize).toBe("150%")
    expect(root.dataset.a11yLineSpacing).toBe("on")
    expect(root.dataset.reduceMotion).toBe("true")
    expect(root.classList.contains("dark")).toBe(true)
  })

  it("restores the default state", () => {
    const root = document.createElement("html")
    applyA11yPrefs(root, { ...DEFAULT_A11Y_PREFS, theme: "high_contrast_dark", fontScale: 1.5 })
    applyA11yPrefs(root, DEFAULT_A11Y_PREFS)
    expect(root.dataset.contrast).toBeUndefined()
    expect(root.style.fontSize).toBe("")
    expect(root.dataset.reduceMotion).toBe("false")
  })

  it("does not touch the dark class for the default theme", () => {
    const root = document.createElement("html")
    root.classList.add("dark")
    applyA11yPrefs(root, DEFAULT_A11Y_PREFS)
    expect(root.classList.contains("dark")).toBe(true)
  })
})

describe("database mapping", () => {
  it("converts a database row to preferences, repairing out-of-range numbers", () => {
    const prefs = prefsFromRow({ needs: ["low_vision", "alien"], theme: "high_contrast_dark", font_scale: "1.75", line_spacing: 9, read_screen_aloud: true, tts_rate: "1.20", tour_completed: ["welcome"] })
    expect(prefs.needs).toEqual(["low_vision"])
    expect(prefs.theme).toBe("high_contrast_dark")
    expect(prefs.fontScale).toBe(1.75)
    expect(prefs.lineSpacing).toBe(2)
    expect(prefs.readScreenAloud).toBe(true)
    expect(prefs.ttsRate).toBe(1.2)
    expect(prefs.tourCompleted).toEqual(["welcome"])
  })
  it("falls back to defaults for an empty row", () => {
    expect(prefsFromRow({})).toEqual(DEFAULT_A11Y_PREFS)
  })
  it("round-trips through the row format", () => {
    const prefs = normalizePrefs({ needs: ["hard_of_hearing"], theme: "yellow_on_black", fontScale: 1.5, captions: true, tourCompleted: ["welcome", "map"] })
    expect(prefsFromRow(prefsToRow(prefs))).toEqual({ ...prefs, speechVoiceURI: "" })
  })
})

describe("presetForNeed", () => {
  it("low vision turns on a contrast theme and bigger text without lowering existing values", () => {
    expect(presetForNeed("low_vision", DEFAULT_A11Y_PREFS)).toMatchObject({ theme: "high_contrast_dark", fontScale: 1.5, lineSpacing: 1.25 })
    const custom = normalizePrefs({ theme: "yellow_on_black", fontScale: 1.8, lineSpacing: 1.5 })
    expect(presetForNeed("low_vision", custom)).toMatchObject({ theme: "yellow_on_black", fontScale: 1.8, lineSpacing: 1.5 })
  })
  it("the voice profile enables reading aloud, voice navigation, captions and visual alerts", () => {
    expect(presetForNeed("hard_of_hearing", DEFAULT_A11Y_PREFS)).toEqual({ captions: true, visualAlerts: true })
  })
})
