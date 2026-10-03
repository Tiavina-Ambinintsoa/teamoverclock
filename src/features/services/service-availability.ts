import type { Service } from "@/lib/db-types"
import type { ServiceStatus } from "@/lib/types"

export function effectiveServiceStatus(service: Pick<Service, "status" | "scheduled_status" | "scheduled_at" | "reopens_at">, now = Date.now()): ServiceStatus {
  const nowMs = now
  const scheduleTime = service.scheduled_at ? new Date(service.scheduled_at).getTime() : Number.NaN
  if (service.scheduled_status && Number.isFinite(scheduleTime) && scheduleTime <= nowMs) {
    return service.scheduled_status
  }

  const reopeningTime = service.reopens_at ? new Date(service.reopens_at).getTime() : Number.NaN
  if (service.status !== "open" && Number.isFinite(reopeningTime) && reopeningTime <= nowMs) {
    return "open"
  }
  return service.status
}

export function isUnexpectedServiceClosure(
  service: Pick<Service, "status" | "scheduled_status" | "scheduled_at" | "reopens_at" | "status_change_type">,
  now = Date.now()
): boolean {
  return service.status_change_type === "unexpected" && effectiveServiceStatus(service, now) !== "open"
}

export function isFutureTimestamp(value: string | null | undefined, now = Date.now()): boolean {
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(timestamp) && timestamp > now
}

export function isFutureLocalDateTime(value: string, now = Date.now()): boolean {
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(timestamp) && timestamp > now
}

const DAY_ALIASES: Record<string, number> = {
  sun: 0, sunday: 0, dimanche: 0,
  mon: 1, monday: 1, lundi: 1,
  tue: 2, tuesday: 2, mardi: 2,
  wed: 3, wednesday: 3, mercredi: 3,
  thu: 4, thursday: 4, jeudi: 4,
  fri: 5, friday: 5, vendredi: 5,
  sat: 6, saturday: 6, samedi: 6,
}

const TIME_RANGE_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi

function toMinutes(hourValue: string, minuteValue: string | undefined, meridiemValue: string | undefined): number | null {
  const hour = Number(hourValue)
  const minute = Number(minuteValue ?? "0")
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null

  if (meridiemValue) {
    if (hour < 1 || hour > 12) return null
    const meridiem = meridiemValue.replaceAll(".", "").toLowerCase()
    return ((hour % 12) + (meridiem === "pm" ? 12 : 0)) * 60 + minute
  }

  if (hour < 0 || hour > 23) return null
  return hour * 60 + minute
}

/** Parses either the native time-input value (24-hour) or a localized 12-hour value. */
export function parseClockTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i)
  if (!match) return null
  return toMinutes(match[1], match[2], match[3])
}

function parseTimeRanges(value: string): [number, number][] {
  const ranges: [number, number][] = []
  for (const match of value.matchAll(TIME_RANGE_PATTERN)) {
    const [, startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem] = match
    const start = toMinutes(startHour, startMinute, startMeridiem)
    const end = toMinutes(endHour, endMinute, endMeridiem)
    if (start !== null && end !== null) ranges.push([start, end])
  }
  return ranges
}

export function isWithinServiceHours(
  service: Pick<Service, "opening_hours">,
  localDate: string,
  localTime: string
): boolean {
  const schedules = Object.entries(service.opening_hours ?? {})
  if (schedules.length === 0) return true
  const date = new Date(`${localDate}T12:00:00`)
  const day = date.getDay()
  const selectedMinute = parseClockTime(localTime)
  if (selectedMinute === null) return false

  return schedules.some(([rawDays, hours]) => {
    const days = rawDays.trim().toLocaleLowerCase()
    if (days === "always" || hours.toLocaleLowerCase().includes("24/7")) return true

    const dayRange = days.split("-").map((part) => DAY_ALIASES[part.trim()])
    const matchesDay = dayRange.length === 2 && dayRange.every((item) => item !== undefined)
      ? dayRange[0]! <= dayRange[1]!
        ? day >= dayRange[0]! && day <= dayRange[1]!
        : day >= dayRange[0]! || day <= dayRange[1]!
      : DAY_ALIASES[days] === day
    if (!matchesDay) return false

    return parseTimeRanges(hours).some(([start, end]) => selectedMinute >= start && selectedMinute < end)
  })
}
