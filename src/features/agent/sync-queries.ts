import { useQuery } from "@tanstack/react-query"

import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

export interface SyncRow {
  id: string
  source: "nova_api" | "camera_feed" | "satellite_feed"
  started_at: string
  finished_at: string | null
  status: "running" | "success" | "partial" | "failed"
  items_imported: number
  items_pending_validation: number
  items_failed: number
  error_log: { code?: string; message?: string }[]
  external_ref: string | null
}

/** Dernières synchronisations avec l'API Nova Terra (indicateur de l'espace agent). Une erreur n'empêche pas d'afficher le reste. */
export function useSyncs(limit = 20) {
  return useQuery({
    queryKey: ["api-syncs", limit],
    enabled: Boolean(supabase),
    refetchInterval: 60_000,
    queryFn: async (): Promise<SyncRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("api_synchronizations").select("*").order("started_at", { ascending: false }).limit(limit), []) as SyncRow[]
    },
  })
}
