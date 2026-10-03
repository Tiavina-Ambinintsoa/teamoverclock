import { describe, expect, it } from "vitest"

import { ageFromBirthDate, cinSchema, isMinorBirthDate, loginSchema, passwordStrength, signupSchema } from "./schema"

const NOW = new Date("2026-10-03T12:00:00Z")

describe("ageFromBirthDate", () => {
  it("computes full years", () => {
    expect(ageFromBirthDate("2000-10-03", NOW)).toBe(26)
    expect(ageFromBirthDate("2000-10-04", NOW)).toBe(25)
  })
  it("rejects invalid, impossible and future dates", () => {
    expect(ageFromBirthDate("not-a-date", NOW)).toBeNull()
    expect(ageFromBirthDate("2000-02-31", NOW)).toBeNull()
    expect(ageFromBirthDate("2030-01-01", NOW)).toBeNull()
  })
})

describe("isMinorBirthDate", () => {
  it("is true under 18 only", () => {
    expect(isMinorBirthDate("2010-01-01", NOW)).toBe(true)
    expect(isMinorBirthDate("2008-10-03", NOW)).toBe(false)
    expect(isMinorBirthDate("bad", NOW)).toBe(false)
  })
})

describe("passwordStrength", () => {
  it("rejects weak passwords and says what is missing", () => {
    const result = passwordStrength("abc")
    expect(result.ok).toBe(false)
    expect(result.missing).toContain("8 caractères minimum")
    expect(result.missing).toContain("une majuscule")
  })
  it("accepts a compliant password and scores longer ones higher", () => {
    expect(passwordStrength("Abcdefg1").ok).toBe(true)
    expect(passwordStrength("Abcdefg1!xyz").score).toBeGreaterThan(passwordStrength("Abcdefg1").score)
  })
})

describe("loginSchema", () => {
  it("validates credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true)
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false)
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false)
  })
})

describe("signupSchema", () => {
  const valid = {
    firstName: "Elio",
    lastName: "Marchetti",
    email: "elio@novaterra.test",
    birthDate: "1994-12-01",
    sectorId: "sector-1",
    password: "Abcdefg1",
    confirmPassword: "Abcdefg1",
    termsAccepted: true,
    dataConsent: true,
  }
  it("accepts a complete valid form", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true)
  })
  it("requires matching passwords", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "Different1" })
    expect(result.success).toBe(false)
  })
  it("requires both consents", () => {
    expect(signupSchema.safeParse({ ...valid, termsAccepted: false }).success).toBe(false)
    expect(signupSchema.safeParse({ ...valid, dataConsent: false }).success).toBe(false)
  })
  it("rejects a weak password", () => {
    expect(signupSchema.safeParse({ ...valid, password: "abc", confirmPassword: "abc" }).success).toBe(false)
  })
  it("does not require a home sector (plan decision 2)", () => {
    expect(signupSchema.safeParse({ ...valid, sectorId: "" }).success).toBe(true)
  })
})

describe("cinSchema", () => {
  it("accepts only the Nova Terra CIN model", () => {
    expect(cinSchema.safeParse({ cin: "NT-CIN-000123" }).success).toBe(true)
    expect(cinSchema.safeParse({ cin: "NT-CIN-12345" }).success).toBe(false)
    expect(cinSchema.safeParse({ cin: "XX-CIN-000123" }).success).toBe(false)
  })
})
