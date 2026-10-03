import { z } from "zod"

import type { ReportCategory } from "@/lib/db-types"
import type { ReportStatus } from "@/lib/types"

/** Cycle de vie d'un signalement : transitions permises (docs/PLAN.md §4.4). */
const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ["received"],
  received: ["to_verify", "validated", "rejected"],
  to_verify: ["validated", "rejected"],
  validated: ["assigned", "in_progress", "resolved", "archived"],
  rejected: ["archived"],
  assigned: ["in_progress", "resolved"],
  in_progress: ["resolved"],
  resolved: ["archived"],
  archived: [],
}

export function reportTransitions(status: ReportStatus): ReportStatus[] {
  return TRANSITIONS[status] ?? []
}

/** Statuts pour lesquels un signalement validé peut être rendu public. */
const PUBLISHABLE: ReportStatus[] = ["validated", "assigned", "in_progress", "resolved"]

export function canPublish(status: ReportStatus, validatedBy: string | null): boolean {
  return validatedBy !== null && PUBLISHABLE.includes(status)
}

/** Un utilisateur ne peut valider que les signalements de son service (ou tous, pour l'administrateur général). */
export function canValidateReport(
  user: { isAdmin: boolean; validatorServiceIds: string[] },
  report: { service_id: string | null }
): boolean {
  if (user.isAdmin) return true
  return report.service_id !== null && user.validatorServiceIds.includes(report.service_id)
}

export const REPORT_CATEGORIES: ReportCategory[] = ["infrastructure", "safety", "health", "environment", "transport", "noise", "other"]

export const reportSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(150),
  description: z.string().trim().min(10, "Décrivez le problème (10 caractères minimum).").max(5000),
  category: z.enum(["infrastructure", "safety", "health", "environment", "transport", "noise", "other"]),
  sectorId: z.string().min(1, "Choisissez un secteur."),
  buildingId: z.string(),
  observedAt: z.string().min(1, "Indiquez quand vous l'avez constaté."),
  priority: z.enum(["low", "medium", "high", "critical"]),
})

export type ReportFormValues = z.infer<typeof reportSchema>

/** Une transcription vocale doit être relue avant l'envoi (règle des signalements). */
export function transcriptNeedsReview(transcript: string | null, reviewed: boolean): boolean {
  return Boolean(transcript && transcript.trim()) && !reviewed
}

export type ReportGrouping = "type" | "location"

export interface GroupableReport {
  id: string
  category: string
  sector_id: string
}

/** Regroupe des signalements par type ou par secteur ; groupes triés du plus gros au plus petit. */
export function groupReports<T extends GroupableReport>(reports: T[], by: ReportGrouping): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const report of reports) {
    const key = by === "type" ? report.category : report.sector_id
    const list = map.get(key)
    if (list) list.push(report)
    else map.set(key, [report])
  }
  return [...map.entries()].map(([key, items]) => ({ key, items })).sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key))
}

export const REPORT_PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const
