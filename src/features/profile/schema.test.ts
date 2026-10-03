import { describe, expect, it } from "vitest"

import { profileDetailsSchema, toProfileUpdate } from "./schema"

const valid = { firstName: "Elio", lastName: "Marchetti", phone: "+999 100 0007", locale: "fr" as const, notifyEmail: true, notifyInApp: false }

describe("profileDetailsSchema", () => {
  it("accepts a valid profile and an empty phone", () => {
    expect(profileDetailsSchema.safeParse(valid).success).toBe(true)
    expect(profileDetailsSchema.safeParse({ ...valid, phone: "" }).success).toBe(true)
  })
  it("rejects invalid phones, empty names and unknown locales", () => {
    expect(profileDetailsSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false)
    expect(profileDetailsSchema.safeParse({ ...valid, firstName: " " }).success).toBe(false)
    expect(profileDetailsSchema.safeParse({ ...valid, locale: "de" }).success).toBe(false)
  })
})

describe("toProfileUpdate", () => {
  it("maps the form to profile columns", () => {
    expect(toProfileUpdate(valid)).toEqual({
      first_name: "Elio",
      last_name: "Marchetti",
      phone: "+999 100 0007",
      locale: "fr",
      notification_prefs: { email: true, in_app: false },
      display_name: "Elio Marchetti",
    })
  })
  it("stores an empty phone as null", () => {
    expect(toProfileUpdate({ ...valid, phone: "  " }).phone).toBeNull()
  })
})
