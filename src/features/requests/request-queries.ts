import { useQuery } from "@tanstack/react-query"

import type { RequestRow } from "@/lib/db-types"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import type { RequestStatus } from "@/lib/types"

export interface RequestComment {
  id: string
  author_id: string
  body: string
  is_internal: boolean
  created_at: string
}

export interface RequestHistory {
  id: string
  from_status: RequestStatus | null
  to_status: RequestStatus
  changed_by: string | null
  reason: string | null
  changed_at: string
}

export interface RequestDetail {
  request: RequestRow | null
  comments: RequestComment[]
  history: RequestHistory[]
  names: Record<string, string>
}

/** Noms affichables (vue public_profiles : jamais d'e-mail ni de téléphone). */
export async function fetchDisplayNames(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const names: Record<string, string> = {}
  if (!supabase || unique.length === 0) return names
  const rows = unwrap(await supabase.from("public_profiles").select("id,display_name").in("id", unique), []) as { id: string; display_name: string | null }[]
  for (const row of rows) names[row.id] = row.display_name ?? "—"
  return names
}

export function useMyRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-requests", userId],
    enabled: Boolean(userId && supabase),
    queryFn: async (): Promise<RequestRow[]> => {
      if (!supabase || !userId) return []
      return unwrap(await supabase.from("requests").select("*").eq("requester_id", userId).is("deleted_at", null).order("created_at", { ascending: false }), []) as RequestRow[]
    },
  })
}

export function useRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["request-detail", id],
    enabled: Boolean(id && supabase),
    queryFn: async (): Promise<RequestDetail> => {
      if (!supabase || !id) return { request: null, comments: [], history: [], names: {} }
      const [request, comments, history] = await Promise.all([
        supabase.from("requests").select("*").eq("id", id).maybeSingle(),
        supabase.from("request_comments").select("id,author_id,body,is_internal,created_at").eq("request_id", id).order("created_at"),
        supabase.from("request_status_history").select("id,from_status,to_status,changed_by,reason,changed_at").eq("request_id", id).order("changed_at"),
      ])
      const row = unwrap(request, null) as RequestRow | null
      const commentRows = unwrap(comments, []) as RequestComment[]
      const historyRows = unwrap(history, []) as RequestHistory[]
      const names = await fetchDisplayNames([
        row?.requester_id ?? null,
        row?.assigned_agent_id ?? null,
        ...commentRows.map((c) => c.author_id),
        ...historyRows.map((h) => h.changed_by),
      ])
      return { request: row, comments: commentRows, history: historyRows, names }
    },
  })
}
