import { describe, expect, it } from "vitest"

import { TRANSPORT_SCHEDULE_FALLBACK } from "@/features/hub/transport-schedule-data"

import { buildNextDepartures, countdownLabel, groupSchedulesByLine, matchesScheduleDay, nextDepartureAt } from "./transport-agenda"

describe("matchesScheduleDay", () => {
  it("matches monday-based values where sunday is 7", () => {
    expect(matchesScheduleDay({ days_of_week: [1, 3, 5] }, new Date("2026-10-05T08:00:00"))).toBe(true)
    expect(matchesScheduleDay({ days_of_week: [1, 3, 5] }, new Date("2026-10-06T08:00:00"))).toBe(false)
    expect(matchesScheduleDay({ days_of_week: [7] }, new Date("2026-10-04T08:00:00"))).toBe(true)
  })
})

describe("nextDepartureAt", () => {
  it("returns the next slot on the same day when still upcoming", () => {
    const schedule = TRANSPORT_SCHEDULE_FALLBACK[0]
    const next = nextDepartureAt(schedule, new Date(2026, 9, 5, 5, 30, 0))
    expect(next?.getFullYear()).toBe(2026)
    expect(next?.getMonth()).toBe(9)
    expect(next?.getDate()).toBe(5)
    expect(next?.getHours()).toBe(6)
    expect(next?.getMinutes()).toBe(15)
  })

  it("rolls to the next valid weekday when today's departure has passed", () => {
    const schedule = TRANSPORT_SCHEDULE_FALLBACK[0]
    const next = nextDepartureAt(schedule, new Date(2026, 9, 5, 7, 0, 0))
    expect(next?.getFullYear()).toBe(2026)
    expect(next?.getMonth()).toBe(9)
    expect(next?.getDate()).toBe(6)
    expect(next?.getHours()).toBe(6)
    expect(next?.getMinutes()).toBe(15)
  })
})

describe("buildNextDepartures", () => {
  it("sorts imminent departures and excludes cancelled services by default", () => {
    const departures = buildNextDepartures(TRANSPORT_SCHEDULE_FALLBACK, new Date("2026-10-05T05:00:00"), { limit: 4 })
    expect(departures).toHaveLength(4)
    expect(departures.map((departure) => departure.id)).not.toContain("10000000-0000-4000-8000-000000000018")
    expect(departures[0]?.id).toBe("10000000-0000-4000-8000-000000000008")
  })

  it("filters by transport type and day", () => {
    const departures = buildNextDepartures(TRANSPORT_SCHEDULE_FALLBACK, new Date("2026-10-10T09:00:00"), {
      transportType: "ferry",
      day: 6,
      limit: 10,
    })
    expect(departures.map((departure) => departure.line_code)).toEqual(["FY-08", "FY-14"])
  })
})

describe("groupSchedulesByLine", () => {
  it("groups multiple rows under a single line with sorted departure times", () => {
    const groups = groupSchedulesByLine(TRANSPORT_SCHEDULE_FALLBACK)
    const hoverTram = groups.find((group) => group.lineCode === "HT-01")
    expect(hoverTram?.schedules.map((schedule) => schedule.departure_time)).toEqual(["06:15:00", "08:45:00", "18:10:00"])
  })
})

describe("countdownLabel", () => {
  it("formats immediate, minute, and hour countdowns", () => {
    expect(countdownLabel(0, "fr")).toBe("Maintenant")
    expect(countdownLabel(12, "en")).toBe("In 12 min")
    expect(countdownLabel(125, "fr")).toBe("Dans 2 h 05")
  })
})
