import { describe, expect, it } from "vitest"

import type { Service } from "@/lib/db-types"
import { effectiveServiceStatus, isUnexpectedServiceClosure, isWithinServiceHours, parseClockTime } from "@/features/services/service-availability"

const service = (patch: Partial<Service> = {}): Service => ({
  id: "service-1",
  department_id: "department-1",
  building_id: "building-1",
  name: "City service",
  slug: "city-service",
  category: "public",
  description: null,
  address: null,
  phone: null,
  email: null,
  opening_hours: {},
  closing_days: [],
  languages: ["fr"],
  procedures: [],
  required_documents: [],
  fees: null,
  booking_url: null,
  default_sla_hours: 72,
  status: "open",
  status_reason: null,
  status_change_type: "manual",
  scheduled_status: null,
  scheduled_at: null,
  reopens_at: null,
  published_at: "2026-01-01T00:00:00.000Z",
  is_emergency: false,
  updated_at: "2026-01-01T00:00:00.000Z",
  ...patch,
})

describe("effectiveServiceStatus", () => {
  it("applies a scheduled service status at its start time", () => {
    expect(effectiveServiceStatus(service({
      scheduled_status: "temporarily_closed",
      scheduled_at: "2026-10-03T10:00:00.000Z",
    }), Date.parse("2026-10-03T10:01:00.000Z"))).toBe("temporarily_closed")
  })

  it("reopens a manually closed service when its reopening time passes", () => {
    expect(effectiveServiceStatus(service({
      status: "temporarily_closed",
      reopens_at: "2026-10-03T10:00:00.000Z",
    }), Date.parse("2026-10-03T10:01:00.000Z"))).toBe("open")
  })

  it("surfaces only active unexpected closures", () => {
    const closed = service({ status: "temporarily_closed", status_change_type: "unexpected" })
    expect(isUnexpectedServiceClosure(closed)).toBe(true)
    expect(isUnexpectedServiceClosure(service({ status: "temporarily_closed", status_change_type: "scheduled" }))).toBe(false)
  })

  it("allows appointment times only inside the service's opening hours", () => {
    const weekdays = service({ opening_hours: { "mon-fri": "08:00-17:00" } })
    expect(isWithinServiceHours(weekdays, "2026-10-05", "09:00")).toBe(true)
    expect(isWithinServiceHours(weekdays, "2026-10-05", "17:00")).toBe(false)
    expect(isWithinServiceHours(weekdays, "2026-10-03", "10:00")).toBe(false)
  })

  it("validates opening hours written in 12-hour or 24-hour format", () => {
    const weekdays12Hour = service({ opening_hours: { "mon-fri": "8:00 AM - 5:00 PM" } })
    const weekdays24Hour = service({ opening_hours: { "mon-fri": "08:00–17:00" } })

    expect(isWithinServiceHours(weekdays12Hour, "2026-10-05", "09:00")).toBe(true)
    expect(isWithinServiceHours(weekdays12Hour, "2026-10-05", "4:30 PM")).toBe(true)
    expect(isWithinServiceHours(weekdays12Hour, "2026-10-05", "17:00")).toBe(false)
    expect(isWithinServiceHours(weekdays24Hour, "2026-10-05", "1:00 PM")).toBe(true)
  })

  it("converts noon and midnight correctly when parsing 12-hour times", () => {
    expect(parseClockTime("12:00 AM")).toBe(0)
    expect(parseClockTime("12:00 PM")).toBe(12 * 60)
    expect(parseClockTime("1:30 PM")).toBe(13 * 60 + 30)
    expect(parseClockTime("24:00")).toBeNull()
    expect(parseClockTime("13:00 PM")).toBeNull()
  })
})
