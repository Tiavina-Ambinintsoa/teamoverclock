export type VerificationStatus = "pending" | "validated" | "rejected"

export interface VerificationItem {
  id: string
  status: VerificationStatus
  ai_model: string | null
  ai_score: number | null
  rejection_reason: string | null
  submitted_at: string
  decided_at: string | null
  cin_image_path: string | null
  citizen_id: string
  cin_number: string | null
  display_name: string | null
}

export interface VerificationFilters {
  search: string
  status: VerificationStatus | "all"
  from: string
  to: string
}

export type SortKey = "submitted_at" | "display_name" | "status" | "ai_score"

export const EMPTY_FILTERS: VerificationFilters = { search: "", status: "all", from: "", to: "" }

export function filterVerifications(items: VerificationItem[], f: VerificationFilters): VerificationItem[] {
  const q = f.search.trim().toLowerCase()
  const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null
  const to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null
  return items.filter((item) => {
    if (f.status !== "all" && item.status !== f.status) return false
    const time = new Date(item.submitted_at).getTime()
    if (from !== null && time < from) return false
    if (to !== null && time > to) return false
    if (!q) return true
    return [item.display_name, item.cin_number, item.ai_model, item.rejection_reason, item.id]
      .some((value) => value?.toLowerCase().includes(q))
  })
}

export function sortVerifications(items: VerificationItem[], key: SortKey, dir: "asc" | "desc"): VerificationItem[] {
  const factor = dir === "asc" ? 1 : -1
  return [...items].sort((a, b) => {
    const av = a[key] ?? ""
    const bv = b[key] ?? ""
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor
    return String(av).localeCompare(String(bv)) * factor
  })
}

export function countByStatus(items: VerificationItem[]): Record<VerificationStatus, number> {
  const counts: Record<VerificationStatus, number> = { pending: 0, validated: 0, rejected: 0 }
  for (const item of items) counts[item.status] += 1
  return counts
}
