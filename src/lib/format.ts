/** Formats adaptés à Madagascar : fuseau d'Antananarivo, Ariary (MGA), français. */
const TIME_ZONE = "Indian/Antananarivo"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
})

const ariaryFormatter = new Intl.NumberFormat("fr-MG", {
  style: "currency",
  currency: "MGA",
  maximumFractionDigits: 0,
})

export function formatDate(value: string | number | Date): string {
  return dateFormatter.format(new Date(value))
}

/** 50000 -> "50 000 Ar" */
export function formatAriary(amount: number): string {
  return ariaryFormatter.format(amount)
}

/** 3725000 (ms) -> "01:02:05" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":")
}
