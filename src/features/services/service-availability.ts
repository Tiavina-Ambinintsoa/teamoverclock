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

export function isWithinServiceHours(
  service: Pick<Service, "opening_hours">,
  localDate: string,
  localTime: string
): boolean {
  const schedules = Object.entries(service.opening_hours ?? {})
  if (schedules.length === 0) return true
  const date = new Date(`${localDate}T12:00:00`)
  const day = date.getDay()
  const selectedMinute = Number(localTime.slice(0, 2)) * 60 + Number(localTime.slice(3, 5))

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

    const ranges = Array.from(hours.matchAll(/(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})/g))
    return ranges.some((range) => {
      const start = Number(range[1]) * 60 + Number(range[2])
      const end = Number(range[3]) * 60 + Number(range[4])
      return selectedMinute >= start && selectedMinute < end
    })
  })
}
