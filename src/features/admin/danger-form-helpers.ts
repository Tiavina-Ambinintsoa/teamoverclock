import type { DangerRow } from "@/lib/db-types"
import { uniqueSlug } from "@/lib/slug"
import type { DangerSeverity } from "@/lib/types"

export const DANGER_SEVERITIES: DangerSeverity[] = ["info", "low", "moderate", "high", "extreme"]

export interface DangerFormStep {
  title: string
  detail: string
}

export interface DangerFormContact {
  name: string
  role: string
  phone: string
}

export interface DangerFormValues {
  title: string
  summary: string
  severity: DangerSeverity
  status: DangerRow["status"]
  validFrom: string
  validUntil: string
  affectedSectorIds: string[]
  recommendedActions: string[]
  forbiddenActions: string[]
  protocolSteps: DangerFormStep[]
  emergencyContacts: DangerFormContact[]
  assemblyBuildingIds: string[]
  source: string
  responsibleServiceId: string
  isFictionalAlert: boolean
}

export interface DangerFormPayload extends Record<string, unknown> {
  slug: string
  title: string
  summary: string
  severity: DangerSeverity
  status: DangerRow["status"]
  valid_from: string
  valid_until: string | null
  affected_sector_ids: string[]
  recommended_actions: string[]
  forbidden_actions: string[]
  protocol_steps: { order: number; title: string; detail: string }[]
  emergency_contacts: Array<{ service: string; phone: string; name?: string; role?: string }>
  assembly_building_ids: string[]
  source: string | null
  responsible_service_id: string | null
  procedure_version: number
  is_fictional_alert: boolean
}

export function toLocalDateTimeValue(value?: string | null, now: Date = new Date()) {
  const date = value ? new Date(value) : now
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export function emptyDangerFormValues(now: Date = new Date()): DangerFormValues {
  return {
    title: "",
    summary: "",
    severity: "moderate",
    status: "draft",
    validFrom: toLocalDateTimeValue(undefined, now),
    validUntil: "",
    affectedSectorIds: [],
    recommendedActions: [""],
    forbiddenActions: [""],
    protocolSteps: [{ title: "", detail: "" }],
    emergencyContacts: [{ name: "", role: "", phone: "" }],
    assemblyBuildingIds: [],
    source: "",
    responsibleServiceId: "",
    isFictionalAlert: false,
  }
}

function parseServiceLabel(label: string) {
  const [name, role] = label.split(/\s+[—-]\s+/, 2)
  return { name: name ?? "", role: role ?? "" }
}

export function dangerRowToFormValues(row: DangerRow): DangerFormValues {
  return {
    title: row.title,
    summary: row.summary,
    severity: row.severity,
    status: row.status,
    validFrom: toLocalDateTimeValue(row.valid_from),
    validUntil: row.valid_until ? toLocalDateTimeValue(row.valid_until) : "",
    affectedSectorIds: row.affected_sector_ids ?? [],
    recommendedActions: row.recommended_actions.length > 0 ? row.recommended_actions : [""],
    forbiddenActions: row.forbidden_actions.length > 0 ? row.forbidden_actions : [""],
    protocolSteps: row.protocol_steps.length > 0 ? row.protocol_steps.map((step) => ({ title: step.title, detail: step.detail })) : [{ title: "", detail: "" }],
    emergencyContacts: row.emergency_contacts.length > 0
      ? row.emergency_contacts.map((contact) => {
          const extra = contact as { name?: string; role?: string }
          const parsed = parseServiceLabel(contact.service ?? "")
          return {
            name: extra.name ?? parsed.name,
            role: extra.role ?? parsed.role,
            phone: contact.phone ?? "",
          }
        })
      : [{ name: "", role: "", phone: "" }],
    assemblyBuildingIds: row.assembly_building_ids ?? [],
    source: row.source ?? "",
    responsibleServiceId: row.responsible_service_id ?? "",
    isFictionalAlert: row.is_fictional_alert,
  }
}

function compactList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function compactSteps(values: DangerFormStep[]) {
  return values
    .map((step, index) => ({ order: index + 1, title: step.title.trim(), detail: step.detail.trim() }))
    .filter((step) => step.title || step.detail)
}

function compactContacts(values: DangerFormContact[]) {
  return values
    .map((contact) => ({
      name: contact.name.trim(),
      role: contact.role.trim(),
      phone: contact.phone.trim(),
    }))
    .filter((contact) => contact.name || contact.role || contact.phone)
}

export function validateDangerForm(values: DangerFormValues) {
  const errors: string[] = []
  if (values.title.trim().length < 3) errors.push("title")
  if (values.summary.trim().length < 10) errors.push("summary")
  if (!values.validFrom) errors.push("validFrom")
  if (!values.responsibleServiceId.trim()) errors.push("responsibleServiceId")
  const steps = compactSteps(values.protocolSteps)
  if (steps.some((step) => !step.title || !step.detail)) errors.push("protocolSteps")
  const contacts = compactContacts(values.emergencyContacts)
  if (contacts.some((contact) => !contact.name || !contact.phone)) errors.push("emergencyContacts")
  if (values.validUntil && new Date(values.validUntil).getTime() < new Date(values.validFrom).getTime()) errors.push("validUntil")
  return [...new Set(errors)]
}

export function buildDangerPayload(values: DangerFormValues, existing?: DangerRow | null): DangerFormPayload {
  const recommendedActions = compactList(values.recommendedActions)
  const forbiddenActions = compactList(values.forbiddenActions)
  const protocolSteps = compactSteps(values.protocolSteps)
  const emergencyContacts = compactContacts(values.emergencyContacts).map((contact) => ({
    service: [contact.name, contact.role].filter(Boolean).join(" — ") || contact.name,
    phone: contact.phone,
    ...(contact.name ? { name: contact.name } : {}),
    ...(contact.role ? { role: contact.role } : {}),
  }))

  return {
    slug: uniqueSlug(values.title.trim()),
    title: values.title.trim(),
    summary: values.summary.trim(),
    severity: values.severity,
    status: values.status,
    valid_from: new Date(values.validFrom).toISOString(),
    valid_until: values.validUntil ? new Date(values.validUntil).toISOString() : null,
    affected_sector_ids: values.affectedSectorIds,
    recommended_actions: recommendedActions,
    forbidden_actions: forbiddenActions,
    protocol_steps: protocolSteps,
    emergency_contacts: emergencyContacts,
    assembly_building_ids: values.assemblyBuildingIds,
    source: values.source.trim() || null,
    responsible_service_id: values.responsibleServiceId.trim() || null,
    procedure_version: existing?.status === "active" ? existing.procedure_version + 1 : existing?.procedure_version ?? 1,
    is_fictional_alert: values.isFictionalAlert,
  }
}
