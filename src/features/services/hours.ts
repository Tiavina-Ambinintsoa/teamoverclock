const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
const DAY_LABELS: Record<(typeof DAYS)[number], { fr: string; en: string }> = {
  mon: { fr: "lundi", en: "Monday" },
  tue: { fr: "mardi", en: "Tuesday" },
  wed: { fr: "mercredi", en: "Wednesday" },
  thu: { fr: "jeudi", en: "Thursday" },
  fri: { fr: "vendredi", en: "Friday" },
  sat: { fr: "samedi", en: "Saturday" },
  sun: { fr: "dimanche", en: "Sunday" },
}

type Locale = "fr" | "en"

function isDay(value: string): value is (typeof DAYS)[number] {
  return (DAYS as readonly string[]).includes(value)
}

/** "mon-fri" -> "lundi – vendredi", "sat" -> "samedi", "always" -> "24 h/24, 7 j/7". */
export function describeDays(key: string, locale: Locale = "fr"): string {
  if (key === "always" || key === "mon-sun") return locale === "en" ? "24/7" : "24 h/24, 7 j/7"
  const parts = key.split("-")
  if (parts.length === 1 && isDay(parts[0])) return DAY_LABELS[parts[0]][locale]
  if (parts.length === 2 && isDay(parts[0]) && isDay(parts[1])) return `${DAY_LABELS[parts[0]][locale]} – ${DAY_LABELS[parts[1]][locale]}`
  return key
}

/** Liste lisible des horaires d'ouverture : [{ days, hours }]. "24/7" est affiché tel quel. */
export function describeOpeningHours(hours: Record<string, string> | null | undefined, locale: Locale = "fr"): { days: string; hours: string }[] {
  if (!hours) return []
  return Object.entries(hours).map(([key, value]) => ({
    days: describeDays(key, locale),
    hours: value === "24/7" ? (locale === "en" ? "24/7" : "24 h/24") : value,
  }))
}

/** Jours de fermeture (valeurs anglaises stockées en base) -> libellés. */
export function describeClosingDays(days: string[] | null | undefined, locale: Locale = "fr"): string {
  return (days ?? [])
    .map((day) => {
      const key = day.slice(0, 3).toLowerCase()
      return isDay(key) ? DAY_LABELS[key][locale] : day
    })
    .join(", ")
}
