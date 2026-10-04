export interface ReviewStat {
  service_id: string
  building_id: string | null
  average_rating: number | null
  review_count: number | null
}

export function reviewTargetKey(buildingId: string | null | undefined): string {
  return buildingId ?? "__service__"
}

export function formatAverageRating(value: number | null | undefined, locale = "fr-FR"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  const rounded = Math.round(value * 10) / 10
  const hasDecimal = Math.abs(rounded - Math.trunc(rounded)) > Number.EPSILON
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(rounded)
}

export function buildReviewStatsMap(rows: ReviewStat[]): Record<string, ReviewStat> {
  return Object.fromEntries(rows.map((row) => [reviewTargetKey(row.building_id), row]))
}

export function buildServiceStatsMap(rows: ReviewStat[]): Record<string, ReviewStat> {
  return Object.fromEntries(rows.filter((row) => row.building_id === null).map((row) => [row.service_id, row]))
}
