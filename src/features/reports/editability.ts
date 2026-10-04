import type { ReportStatus } from "@/lib/types"

export interface LocalizedEditReason {
  fr: string
  en: string
}

export interface EditabilityResult {
  editable: boolean
  reason: LocalizedEditReason | null
}

interface ReportHistoryLike {
  from_status: ReportStatus | null
  to_status: ReportStatus
  changed_at: string
}

interface EditableReportLike {
  reporter_citizen_id: string | null
  assigned_agent_id: string | null
  status: ReportStatus
  history?: readonly ReportHistoryLike[]
}

interface EditableProjectLike {
  created_by: string
  created_at: string
  status_changed_at?: string | null
  taken_over_at?: string | null
}

const REPORT_INITIAL_STATUSES: readonly ReportStatus[] = ["draft", "received"] as const

function reason(fr: string, en: string): EditabilityResult {
  return { editable: false, reason: { fr, en } }
}

function sameInstant(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime === rightTime
  return left === right
}

export function canEditReport(report: EditableReportLike, userId: string | null | undefined): EditabilityResult {
  if (!userId) return reason("Connectez-vous pour modifier ce signalement.", "Sign in to edit this report.")
  if (report.reporter_citizen_id !== userId) return reason("Seul l'auteur peut modifier ce signalement.", "Only the author can edit this report.")
  if (report.assigned_agent_id !== null) {
    return reason("Ce signalement n'est plus modifiable car un agent en a déjà la charge.", "This report can no longer be edited because an agent has already taken charge of it.")
  }
  if (!REPORT_INITIAL_STATUSES.includes(report.status)) {
    return reason("Ce signalement n'est plus dans son état initial.", "This report is no longer in its initial state.")
  }
  if ((report.history?.length ?? 0) > 0) {
    return reason("Ce signalement n'est plus modifiable car son statut a déjà changé.", "This report can no longer be edited because its status has already changed.")
  }
  return { editable: true, reason: null }
}

export function canEditProject(project: EditableProjectLike, userId: string | null | undefined): EditabilityResult {
  if (!userId) return reason("Connectez-vous pour modifier ce projet.", "Sign in to edit this project.")
  if (project.created_by !== userId) return reason("Seul le créateur peut modifier ce projet.", "Only the creator can edit this project.")
  if (project.taken_over_at) {
    return reason("Ce projet n'est plus modifiable par son créateur car un autre gestionnaire l'a déjà repris.", "This project can no longer be edited by its creator because another manager has already taken it over.")
  }
  const statusChangedAt = project.status_changed_at ?? project.created_at
  if (!sameInstant(statusChangedAt, project.created_at)) {
    return reason("Ce projet n'est plus dans son statut initial.", "This project is no longer in its initial status.")
  }
  return { editable: true, reason: null }
}
