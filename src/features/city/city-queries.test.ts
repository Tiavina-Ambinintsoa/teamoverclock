import { describe, expect, it } from "vitest"

import { filterBuildingsForService, filterFacilities, isNewsActive } from "./city-queries"

const building = (id: string, service_id: string | null): Parameters<typeof filterBuildingsForService>[0][number] => ({
  id,
  name: id,
  type: "public_place",
  facility_type: null,
  service_id,
  offerings: id === "clinic" ? ["Emergency care", "Surgery"] : [],
  sector_id: "sector",
  x: 0,
  y: 0,
  address: null,
  phone: null,
  email: null,
  opening_hours: {},
  accessibility: {},
  status: "operational",
  description: null,
})

describe("filterBuildingsForService", () => {
  const buildings = [
    building("main", null),
    building("clinic", "health"),
    building("pharmacy", "health"),
    building("school", "education"),
  ]

  it("returns only the requested service facilities", () => {
    expect(filterBuildingsForService(buildings, "health").map(({ id }) => id)).toEqual(["clinic", "pharmacy"])
  })
  it("keeps all buildings when the main map has no service filter", () => {
    expect(filterBuildingsForService(buildings).map(({ id }) => id)).toEqual(["main", "clinic", "pharmacy", "school"])
  })
})

describe("filterFacilities", () => {
  const facilities = [
    { ...building("clinic", "health"), facility_type: "clinic", address: "Vitalis" },
    { ...building("pharmacy", "health"), facility_type: "pharmacy", offerings: ["Medicine advice"] },
    { ...building("dentist", "health"), facility_type: "dentist", description: "Urgent dental care" },
  ]

  it("filters by facility type", () => {
    expect(filterFacilities(facilities, "", "pharmacy").map(({ id }) => id)).toEqual(["pharmacy"])
  })
  it("searches names, descriptions, addresses, and offered services case-insensitively", () => {
    expect(filterFacilities(facilities, "surgery").map(({ id }) => id)).toEqual(["clinic"])
    expect(filterFacilities(facilities, "VITALIS").map(({ id }) => id)).toEqual(["clinic"])
    expect(filterFacilities(facilities, "urgent").map(({ id }) => id)).toEqual(["dentist"])
  })
  it("combines the search term and facility type", () => {
    expect(filterFacilities(facilities, "emergency", "pharmacy")).toEqual([])
    expect(filterFacilities(facilities, "medicine", "pharmacy").map(({ id }) => id)).toEqual(["pharmacy"])
  })
})

describe("isNewsActive", () => {
  const now = new Date("2026-10-03T12:00:00Z")

  it("is true for a published item without an end date", () => {
    expect(isNewsActive({ status: "published", valid_until: null }, now)).toBe(true)
  })
  it("is true until the validity ends, then false", () => {
    expect(isNewsActive({ status: "published", valid_until: "2026-10-04T00:00:00Z" }, now)).toBe(true)
    expect(isNewsActive({ status: "published", valid_until: "2026-10-01T00:00:00Z" }, now)).toBe(false)
  })
  it("is false for archived items and drafts", () => {
    expect(isNewsActive({ status: "archived", valid_until: null }, now)).toBe(false)
    expect(isNewsActive({ status: "draft", valid_until: null }, now)).toBe(false)
  })
})
