import type { RequestRow } from "@/lib/db-types"
import { isOverdue } from "@/lib/query-helpers"
import type { PriorityLevel, RequestStatus } from "@/lib/types"

/** Cycle de vie d'une demande (F22) : transitions permises depuis chaque statut. */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: ["received", "rejected", "cancelled"],
  received: ["to_qualify", "assigned", "rejected", "cancelled"],
  to_qualify: ["assigned", "waiting_info", "rejected", "cancelled"],
  assigned: ["in_progress", "waiting_info", "rejected", "cancelled"],
  in_progress: ["waiting_info", "resolved", "rejected"],
  waiting_info: ["in_progress", "resolved", "rejected", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  rejected: [],
  cancelled: [],
}

export function allowedTransitions(status: RequestStatus): RequestStatus[] {
  return TRANSITIONS[status] ?? []
}

export function isTerminal(status: RequestStatus): boolean {
  return TRANSITIONS[status]?.length === 0
}

/** Une réponse est obligatoire pour résoudre, clore ou rejeter une demande. */
export function requiresNote(target: RequestStatus): boolean {
  return target === "resolved" || target === "closed" || target === "rejected"
}

const PRIORITY_RANK: Record<PriorityLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 }

export type RequestSort = "urgency" | "oldest" | "status"

const STATUS_ORDER: RequestStatus[] = [
  "new", "received", "to_qualify", "assigned", "in_progress", "waiting_info", "resolved", "closed", "rejected", "cancelled",
]

/** Tri des demandes : urgence (priorité puis retard), ancienneté ou statut. Ne modifie pas le tableau d'origine. */
export function sortRequests(rows: RequestRow[], sort: RequestSort, now: Date = new Date()): RequestRow[] {
  const copy = [...rows]
  if (sort === "oldest") return copy.sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (sort === "status") return copy.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.created_at.localeCompare(b.created_at))
  return copy.sort((a, b) => {
    const overdue = Number(isOverdue(b.due_at, b.status, now)) - Number(isOverdue(a.due_at, a.status, now))
    if (overdue !== 0) return overdue
    return (
      Number(b.urgency_flag) - Number(a.urgency_flag) ||
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      a.created_at.localeCompare(b.created_at)
    )
  })
}

/** La demande attend une action de cet agent : non affectée dans son service, ou affectée à lui et encore ouverte. */
export function needsAction(row: RequestRow, userId: string): boolean {
  if (isTerminal(row.status)) return false
  if (row.status === "waiting_info") return false
  if (row.assigned_agent_id === null) return ["new", "received", "to_qualify"].includes(row.status)
  return row.assigned_agent_id === userId
}

/** Échéance cible : maintenant + délai du service en heures. */
export function dueDateFor(slaHours: number, now: Date = new Date()): string {
  return new Date(now.getTime() + slaHours * 3600_000).toISOString()
}

export const ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const ATTACHMENT_MAX_COUNT = 5

/** Validation des pièces jointes (décision #5 : JPG/PNG/WEBP/PDF, 5 Mo, 5 fichiers). Retourne un message d'erreur ou null. */
export function validateAttachments(files: { name: string; type: string; size: number }[]): string | null {
  if (files.length > ATTACHMENT_MAX_COUNT) return `Maximum ${ATTACHMENT_MAX_COUNT} fichiers.`
  for (const file of files) {
    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) return `Type de fichier refusé : ${file.name}`
    if (file.size > ATTACHMENT_MAX_BYTES) return `Fichier trop volumineux (5 Mo max) : ${file.name}`
  }
  return null
}

/** Nom de fichier sûr pour le stockage. */
export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80)
}
