export type ReputationLevel = "newcomer" | "regular" | "trusted" | "guardian"
export type ReputationSort = "points-desc" | "points-asc" | "name-asc" | "name-desc" | "level-desc"

export interface ReputationProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  reputation_points: number | null
  reputation_level: string | null
}

export interface ReputationFilterOptions {
  search: string
  level: "" | ReputationLevel
  sort: ReputationSort
}

const LEVEL_ORDER: ReputationLevel[] = ["newcomer", "regular", "trusted", "guardian"]
const THRESHOLDS: Record<ReputationLevel, number> = {
  newcomer: 0,
  regular: 10,
  trusted: 50,
  guardian: 100,
}

export function toReputationLevel(value: string | null | undefined): ReputationLevel {
  return LEVEL_ORDER.includes((value ?? "") as ReputationLevel) ? value as ReputationLevel : "newcomer"
}

export function getReputationProgress(points: number | null | undefined) {
  const safePoints = Math.max(points ?? 0, 0)
  const level = toReputationLevel(
    safePoints >= THRESHOLDS.guardian ? "guardian"
      : safePoints >= THRESHOLDS.trusted ? "trusted"
        : safePoints >= THRESHOLDS.regular ? "regular"
          : "newcomer",
  )

  if (level === "guardian") {
    return {
      points: safePoints,
      level,
      nextLevel: null,
      currentThreshold: THRESHOLDS.guardian,
      nextThreshold: null,
      progressPercent: 100,
    }
  }

  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1]
  const currentThreshold = THRESHOLDS[level]
  const nextThreshold = THRESHOLDS[nextLevel]
  const progressPercent = Math.round(((safePoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100)

  return {
    points: safePoints,
    level,
    nextLevel,
    currentThreshold,
    nextThreshold,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  }
}

function levelWeight(level: string | null | undefined) {
  return LEVEL_ORDER.indexOf(toReputationLevel(level))
}

export function filterAndSortProfiles(rows: ReputationProfileRow[], options: ReputationFilterOptions) {
  const term = options.search.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    const matchesSearch = !term || (row.display_name ?? "").toLowerCase().includes(term)
    const matchesLevel = !options.level || toReputationLevel(row.reputation_level) === options.level
    return matchesSearch && matchesLevel
  })

  return filtered.sort((left, right) => {
    switch (options.sort) {
      case "points-asc":
        return (left.reputation_points ?? 0) - (right.reputation_points ?? 0)
          || (left.display_name ?? "").localeCompare(right.display_name ?? "")
      case "name-asc":
        return (left.display_name ?? "").localeCompare(right.display_name ?? "")
      case "name-desc":
        return (right.display_name ?? "").localeCompare(left.display_name ?? "")
      case "level-desc":
        return levelWeight(right.reputation_level) - levelWeight(left.reputation_level)
          || (right.reputation_points ?? 0) - (left.reputation_points ?? 0)
      case "points-desc":
      default:
        return (right.reputation_points ?? 0) - (left.reputation_points ?? 0)
          || (left.display_name ?? "").localeCompare(right.display_name ?? "")
    }
  })
}

export function formatReputationPoints(points: number) {
  return points > 0 ? `+${points}` : `${points}`
}
