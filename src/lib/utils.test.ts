import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-4", "py-2")
    expect(result).toContain("px-4")
    expect(result).toContain("py-2")
  })

  it("should handle conditional classes", () => {
    const result = cn("px-4", false && "py-2", true && "bg-white")
    expect(result).toContain("px-4")
    expect(result).toContain("bg-white")
    expect(result).not.toContain("py-2")
  })

  it("should handle array of classes", () => {
    const result = cn(["px-4", "py-2"])
    expect(result).toContain("px-4")
    expect(result).toContain("py-2")
  })

  it("should handle empty classes", () => {
    const result = cn("")
    expect(result).toBe("")
  })

  it("should handle undefined and null", () => {
    const result = cn("px-4", undefined, null, "py-2")
    expect(result).toContain("px-4")
    expect(result).toContain("py-2")
  })
})
