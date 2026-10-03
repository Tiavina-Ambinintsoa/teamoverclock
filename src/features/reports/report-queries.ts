import { useQuery } from "@tanstack/react-query"

import { fetchDisplayNames } from "@/features/requests/request-queries"
import type { ReportRow } from "@/lib/db-types"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import type { ReportStatus } from "@/lib/types"

export interface EvidenceRow {
  id: string
  report_id: string
  source: "citizen" | "camera" | "satellite" | "agent" | "api"
  file_path: string
  mime_type: string
  captured_at: string
  confidence_score: number | null
  validation_status: "pending" | "validated" | "rejected"
  visibility: "public" | "internal" | "confidential" | "sensitive"
  alt_text: string
}

export interface ReportHistoryRow {
  id: string
  from_status: ReportStatus | null
  to_status: ReportStatus
  changed_by: string | null
  reason: string | null
  changed_at: string
}

export interface ReportDetailData {
  report: ReportRow | null
  evidence: EvidenceRow[]
  history: ReportHistoryRow[]
  urls: Record<string, string>
  names: Record<string, string>
}

export interface PublicReport {
  id: string
  report_number: string
  title: string
  description: string
  category: string
  sector_id: string
  building_id: string | null
  x: number | null
  y: number | null
  observed_at: string
  status: ReportStatus
  priority: string
  cluster_id: string | null
  resolved_at: string | null
  reporter_citizen_id: string | null
  reporter_name: string | null
  reporter_reputation: number | null
}

export function useMyReports(citizenId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-reports", citizenId],
    enabled: Boolean(citizenId && supabase),
    queryFn: async (): Promise<ReportRow[]> => {
      if (!supabase || !citizenId) return []
      return unwrap(await supabase.from("reports").select("*").eq("reporter_citizen_id", citizenId).is("deleted_at", null).order("created_at", { ascending: false }), []) as ReportRow[]
    },
  })
}

export function usePublicReports() {
  return useQuery({
    queryKey: ["public-reports"],
    staleTime: 30_000,
    queryFn: async (): Promise<PublicReport[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("public_reports").select("*").order("observed_at", { ascending: false }).limit(200), []) as PublicReport[]
    },
  })
}

/** Détail d'un signalement : preuves (liens signés de courte durée), historique et noms des intervenants. */
export function useReportDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["report-detail", id],
    enabled: Boolean(id && supabase),
    queryFn: async (): Promise<ReportDetailData> => {
      const empty: ReportDetailData = { report: null, evidence: [], history: [], urls: {}, names: {} }
      if (!supabase || !id) return empty
      const [report, evidence, history] = await Promise.all([
        supabase.from("reports").select("*").eq("id", id).maybeSingle(),
        supabase.from("report_evidence").select("*").eq("report_id", id).order("captured_at"),
        supabase.from("report_status_history").select("id,from_status,to_status,changed_by,reason,changed_at").eq("report_id", id).order("changed_at"),
      ])
      const row = unwrap(report, null) as ReportRow | null
      const evidenceRows = unwrap(evidence, []) as EvidenceRow[]
      const historyRows = unwrap(history, []) as ReportHistoryRow[]
      const urls: Record<string, string> = {}
      for (const item of evidenceRows) {
        const { data } = await supabase.storage.from("report-evidence").createSignedUrl(item.file_path, 300)
        if (data) urls[item.id] = data.signedUrl
      }
      const names = await fetchDisplayNames([row?.assigned_agent_id ?? null, row?.validated_by ?? null, ...historyRows.map((h) => h.changed_by)])
      return { report: row, evidence: evidenceRows, history: historyRows, urls, names }
    },
  })
}
