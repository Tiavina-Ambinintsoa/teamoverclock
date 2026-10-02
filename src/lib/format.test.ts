import { describe, it, expect } from "vitest"
import { formatDate, formatAriary, formatDuration } from "./format"

describe("format utilities", () => {
  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2026-10-02")
      const result = formatDate(date)
      expect(result).toBeTruthy()
      expect(typeof result).toBe("string")
    })

    it("should handle different dates", () => {
      const date1 = new Date("2026-01-01")
      const date2 = new Date("2026-12-31")

      const result1 = formatDate(date1)
      const result2 = formatDate(date2)

      expect(result1).not.toBe(result2)
    })

    it("should handle string input", () => {
      const result = formatDate("2026-10-02")
      expect(result).toBeTruthy()
    })

    it("should handle timestamp input", () => {
      const timestamp = new Date("2026-10-02").getTime()
      const result = formatDate(timestamp)
      expect(result).toBeTruthy()
    })
  })

  describe("formatAriary", () => {
    it("should format currency correctly", () => {
      const result = formatAriary(50000)
      expect(result).toContain("Ar")
      expect(typeof result).toBe("string")
    })

    it("should handle zero", () => {
      const result = formatAriary(0)
      expect(result).toBeTruthy()
    })

    it("should handle large amounts", () => {
      const result = formatAriary(1000000)
      expect(result).toContain("Ar")
    })
  })

  describe("formatDuration", () => {
    it("should format milliseconds to HH:MM:SS", () => {
      // 1 hour, 2 minutes, 5 seconds = 3725000 ms
      const result = formatDuration(3725000)
      expect(result).toBe("01:02:05")
    })

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("00:00:00")
    })

    it("should handle negative values", () => {
      expect(formatDuration(-1000)).toBe("00:00:00")
    })

    it("should format minutes correctly", () => {
      // 5 minutes = 300000 ms
      const result = formatDuration(300000)
      expect(result).toBe("00:05:00")
    })

    it("should format seconds correctly", () => {
      // 45 seconds = 45000 ms
      const result = formatDuration(45000)
      expect(result).toBe("00:00:45")
    })
  })
})
