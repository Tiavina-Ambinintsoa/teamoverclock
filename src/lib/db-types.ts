/**
 * Lignes de tables utilisées par l'interface (sous-ensembles des colonnes SQL).
 * Remplacées à terme par les types générés (`supabase gen types typescript`).
 */
import type {
  DangerSeverity,
  PriorityLevel,
  ReportSource,
  ReportStatus,
  RequestStatus,
  ServiceStatus,
} from "@/lib/types"

export interface Sector {
  id: string
  code: string
  name: string
  description: string | null
  hex_q: number
  hex_r: number
  x: number
  y: number
  color: string
  activity_level: number
  is_active: boolean
}

export type BuildingType =
  | "administrative" | "residential" | "hospital" | "school" | "security"
  | "industrial" | "energy" | "telecom" | "public_place" | "transport_hub"
export type BuildingStatus = "operational" | "temporarily_closed" | "under_maintenance" | "restricted"

export interface Building {
  id: string
  name: string
  type: BuildingType
  sector_id: string
  x: number
  y: number
  address: string | null
  opening_hours: Record<string, string>
  accessibility: Record<string, boolean>
  status: BuildingStatus
  description: string | null
}

export interface Service {
  id: string
  department_id: string
  building_id: string
  name: string
  slug: string
  category: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  opening_hours: Record<string, string>
  closing_days: string[]
  languages: string[]
  procedures: { step: number; text: string }[]
  required_documents: string[]
  fees: string | null
  booking_url: string | null
  default_sla_hours: number
  status: ServiceStatus
  published_at: string | null
  is_emergency: boolean
  updated_at: string
}

export type TransportType =
  | "hover_tram" | "maglev" | "sky_pod" | "shuttle" | "drone_taxi" | "cargo_drone"
  | "personal_hoverbike" | "ferry" | "aethelon_apex" | "vortex_phantom"
export type TransportStatus = "active" | "idle" | "maintenance" | "out_of_service"

export interface Transport {
  id: string
  code: string
  type: TransportType
  visibility: "public" | "personal"
  status: TransportStatus
  sector_id: string
  x: number
  y: number
  capacity: number
  route_name: string | null
}

export type NewsImportance = "normal" | "important" | "urgent"
export type NewsStatus = "draft" | "pending_review" | "published" | "archived"

export interface NewsItem {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  category: string
  cover_image_url: string | null
  service_id: string | null
  importance: NewsImportance
  status: NewsStatus
  published_at: string | null
  valid_until: string | null
  affected_sector_ids: string[]
  updated_at: string
}

export interface RequestRow {
  id: string
  tracking_number: string
  requester_id: string
  service_id: string
  assigned_agent_id: string | null
  category: string
  subject: string
  description: string
  priority: PriorityLevel
  status: RequestStatus
  urgency_flag: boolean
  due_at: string | null
  satisfaction: number | null
  attachments: { path: string; name: string; mime: string }[]
  resolution_note: string | null
  closed_at: string | null
  source: "web" | "chatbot" | "support_call"
  created_at: string
  updated_at: string
}

export type ReportCategory = "infrastructure" | "safety" | "health" | "environment" | "transport" | "noise" | "other"

export interface ReportRow {
  id: string
  report_number: string
  title: string
  description: string
  category: ReportCategory
  sector_id: string
  building_id: string | null
  observed_at: string
  source: ReportSource
  reporter_citizen_id: string | null
  service_id: string | null
  assigned_agent_id: string | null
  priority: PriorityLevel
  status: ReportStatus
  confidence_score: number | null
  facts: Record<string, unknown>
  voice_transcript: string | null
  transcript_reviewed: boolean
  cluster_id: string | null
  validated_by: string | null
  validated_at: string | null
  resolved_at: string | null
  is_public: boolean
  created_at: string
}

export interface DangerRow {
  id: string
  slug: string
  title: string
  severity: DangerSeverity
  status: "draft" | "active" | "archived"
  summary: string
  affected_sector_ids: string[]
  valid_from: string
  valid_until: string | null
  recommended_actions: string[]
  forbidden_actions: string[]
  emergency_contacts: { service: string; phone: string }[]
  assembly_building_ids: string[]
  protocol_steps: { order: number; title: string; detail: string }[]
  source: string | null
  responsible_service_id: string | null
  validated_at: string | null
  procedure_version: number
  is_fictional_alert: boolean
}
