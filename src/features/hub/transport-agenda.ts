import type { TransportScheduleRow } from "@/features/hub/transport-schedule-data"

export interface UpcomingDeparture extends TransportScheduleRow {
  departureAt: Date
  minutesUntil: number
}

export interface TransportLineGroup {
  lineKey: string
  lineCode: string
  lineName: string
  transportType: TransportScheduleRow["transport_type"]
  schedules: TransportScheduleRow[]
}

export function dayNumberFor(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function matchesScheduleDay(schedule: Pick<TransportScheduleRow, "days_of_week">, date: Date): boolean {
  return schedule.days_of_week.includes(dayNumberFor(date))
}

function parseTimeParts(value: string): [number, number, number] {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":")
  return [Number(hours), Number(minutes), Number(seconds)]
}

export function nextDepartureAt(schedule: TransportScheduleRow, now: Date): Date | null {
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now)
    candidate.setHours(0, 0, 0, 0)
    candidate.setDate(candidate.getDate() + offset)
    if (!matchesScheduleDay(schedule, candidate)) continue
    const [hours, minutes, seconds] = parseTimeParts(schedule.departure_time)
    candidate.setHours(hours, minutes, seconds, 0)
    if (candidate.getTime() >= now.getTime()) return candidate
  }
  return null
}

export function buildNextDepartures(
  schedules: readonly TransportScheduleRow[],
  now: Date,
  options: {
    limit?: number
    transportType?: TransportScheduleRow["transport_type"] | "all"
    day?: number | "all"
    includeCancelled?: boolean
  } = {},
): UpcomingDeparture[] {
  const { limit = 6, transportType = "all", day = "all", includeCancelled = false } = options
  return schedules
    .filter((schedule) => (transportType === "all" ? true : schedule.transport_type === transportType))
    .filter((schedule) => (day === "all" ? true : schedule.days_of_week.includes(day)))
    .filter((schedule) => includeCancelled || schedule.status !== "cancelled")
    .map((schedule) => {
      const departureAt = nextDepartureAt(schedule, now)
      if (!departureAt) return null
      return {
        ...schedule,
        departureAt,
        minutesUntil: Math.max(0, Math.round((departureAt.getTime() - now.getTime()) / 60_000)),
      }
    })
    .filter((value): value is UpcomingDeparture => value !== null)
    .sort((left, right) => left.departureAt.getTime() - right.departureAt.getTime() || left.line_code.localeCompare(right.line_code))
    .slice(0, limit)
}

export function groupSchedulesByLine(schedules: readonly TransportScheduleRow[]): TransportLineGroup[] {
  const groups = new Map<string, TransportLineGroup>()
  for (const schedule of schedules) {
    const lineKey = `${schedule.line_code}__${schedule.line_name}`
    const current = groups.get(lineKey)
    if (current) current.schedules.push(schedule)
    else groups.set(lineKey, {
      lineKey,
      lineCode: schedule.line_code,
      lineName: schedule.line_name,
      transportType: schedule.transport_type,
      schedules: [schedule],
    })
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      schedules: [...group.schedules].sort((left, right) => left.departure_time.localeCompare(right.departure_time) || left.from_stop.localeCompare(right.from_stop)),
    }))
    .sort((left, right) => left.lineCode.localeCompare(right.lineCode))
}

export function countdownLabel(minutesUntil: number, locale: "fr" | "en" = "fr"): string {
  if (minutesUntil <= 0) return locale === "fr" ? "Maintenant" : "Now"
  const hours = Math.floor(minutesUntil / 60)
  const minutes = minutesUntil % 60
  if (hours === 0) return locale === "fr" ? `Dans ${minutes} min` : `In ${minutes} min`
  return locale === "fr" ? `Dans ${hours} h ${minutes.toString().padStart(2, "0")}` : `In ${hours} h ${minutes.toString().padStart(2, "0")}`
}
