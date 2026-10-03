/**
 * Types du domaine Nova Terra : miroir des enums SQL (supabase/nova-terra/01_enums_extensions.sql).
 * Les types complets des tables seront générés avec `supabase gen types typescript` (docs/PLAN.md §9, tâche 0.5).
 */
export type UserRole = "citizen" | "agent" | "service_admin" | "general_admin" | "system"
export type AccountStatus = "pending" | "active" | "suspended" | "disabled"
export type KycStatus = "none" | "pending" | "verified" | "rejected"
export type PriorityLevel = "low" | "medium" | "high" | "critical"
export type RequestStatus =
  | "new" | "received" | "to_qualify" | "assigned" | "in_progress"
  | "waiting_info" | "resolved" | "closed" | "rejected" | "cancelled"
export type ReportStatus =
  | "draft" | "received" | "to_verify" | "validated" | "rejected"
  | "assigned" | "in_progress" | "resolved" | "archived"
export type ReportSource = "citizen" | "agent" | "chatbot" | "camera" | "satellite" | "external_api" | "import"
export type ServiceStatus = "open" | "temporarily_closed" | "suspended" | "hidden"
export type DangerSeverity = "info" | "low" | "moderate" | "high" | "extreme"
