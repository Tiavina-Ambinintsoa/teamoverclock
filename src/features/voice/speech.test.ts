import { describe, expect, it } from "vitest"

import { collectTranscript, describeRecognitionError, getRecognitionConstructor, isRecognitionSupported } from "./speech"

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

describe("describeRecognitionError", () => {
  it("explains known errors in both languages and falls back for unknown ones", () => {
    expect(describeRecognitionError("not-allowed", "fr")).toContain("microphone")
    expect(describeRecognitionError("not-allowed", "en")).toContain("Microphone")
    expect(describeRecognitionError("weird", "en")).toBe("Speech recognition error.")
  })
})
