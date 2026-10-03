import { describe, expect, it } from "vitest"

import { collectTranscript, describeRecognitionError, filterSpeechVoices, getRecognitionConstructor, isRecognitionSupported, selectSpeechVoice } from "./speech"

describe("recognition support", () => {
  it("detects the standard and the webkit constructors", () => {
    class Fake {
      start() {}
    }
    expect(isRecognitionSupported({})).toBe(false)
    expect(isRecognitionSupported({ SpeechRecognition: Fake as never })).toBe(true)
    expect(getRecognitionConstructor({ webkitSpeechRecognition: Fake as never })).toBe(Fake)
  })
})

describe("collectTranscript", () => {
  it("separates final and interim results from the result index", () => {
    const results = [
      { isFinal: true, 0: { transcript: "ignoré " } },
      { isFinal: true, 0: { transcript: "bonjour " } },
      { isFinal: false, 0: { transcript: "tout le mon" } },
    ]
    expect(collectTranscript({ resultIndex: 1, results })).toEqual({ final: "bonjour", interim: "tout le mon" })
  })
})

describe("selectSpeechVoice", () => {
  const frenchFrance = { lang: "fr-FR", default: false }
  const frenchCanada = { lang: "fr-CA", default: true }
  const englishUk = { lang: "en-GB", default: true }

  it("prefers an exact locale match over the browser default voice", () => {
    expect(selectSpeechVoice([frenchCanada, frenchFrance, englishUk], "fr-FR")).toBe(frenchFrance)
  })

  it("falls back to a voice in the requested language", () => {
    expect(selectSpeechVoice([frenchCanada, englishUk], "fr-FR")).toBe(frenchCanada)
  })

  it("does not assign a voice from another language", () => {
    expect(selectSpeechVoice([englishUk], "fr-FR")).toBeNull()
  })
})

describe("filterSpeechVoices", () => {
  const voices = [
    { name: "Google français", lang: "fr-FR" },
    { name: "English voice", lang: "en-GB" },
  ]

  it("searches voice names and preferred language tags without case sensitivity", () => {
    expect(filterSpeechVoices(voices, "GOOGLE")).toEqual([voices[0]])
    expect(filterSpeechVoices(voices, "en-gb")).toEqual([voices[1]])
  })

  it("returns every voice when the search is blank", () => {
    expect(filterSpeechVoices(voices, "  ")).toEqual(voices)
  })
})

describe("describeRecognitionError", () => {
  it("explains known errors in both languages and falls back for unknown ones", () => {
    expect(describeRecognitionError("not-allowed", "fr")).toContain("microphone")
    expect(describeRecognitionError("not-allowed", "en")).toContain("Microphone")
    expect(describeRecognitionError("network", "fr")).toContain("Google AI Studio")
    expect(describeRecognitionError("network", "en")).toContain("Google AI Studio")
    expect(describeRecognitionError("weird", "en")).toBe("Speech recognition error.")
  })
})
