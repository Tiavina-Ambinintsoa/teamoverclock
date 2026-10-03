import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSyncs } from "@/features/agent/sync-queries"
import { useLocale } from "@/lib/locale"
import { formatDateTime } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

/** D19 — suivi des imports API : source, statut, éléments importés, en attente de validation, erreurs. Simulateurs pour la démo. */
export function AgentSyncPage() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const syncs = useSyncs(30)

  const run = useMutation({
    mutationFn: async (kind: "sync" | "fail" | "camera" | "satellite") => {
      if (!supabase) throw new Error("Supabase")
      const call = kind === "camera" || kind === "satellite"
        ? supabase.rpc("simulate_observation", { p_source: kind })
        : supabase.rpc("simulate_api_sync", { p_fail: kind === "fail" })
      const { error } = await call
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Simulation exécutée.", "Simulation executed."))
      await queryClient.invalidateQueries({ queryKey: ["api-syncs"] })
      await queryClient.invalidateQueries({ queryKey: ["agent-reports"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-5xl">
      <title>{tx("Synchronisation API", "API synchronization")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Synchronisation API", "API synchronization")} description={tx("Les données importées sont identifiées comme externes et ne sont jamais publiées sans validation.", "Imported data is flagged as external and is never published without validation.")} />

      <section aria-labelledby="sim" className="mb-6 rounded-xl border bg-card p-5">
        <h2 id="sim" className="mb-1 font-semibold">{tx("Simulateurs (démonstration)", "Simulators (demo)")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{tx("L'IA d'observation propose des signalements « à vérifier » : l'administrateur du service les valide ou les rejette.", "The observation AI proposes “to verify” reports: the service administrator validates or rejects them.")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate("sync")}>{tx("Importer l'API Nova Terra", "Import the Nova Terra API")}</Button>
          <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate("fail")}>{tx("Simuler une erreur d'API", "Simulate an API error")}</Button>
          <Button disabled={run.isPending} onClick={() => run.mutate("camera")}>{tx("Observation caméra", "Camera observation")}</Button>
          <Button disabled={run.isPending} onClick={() => run.mutate("satellite")}>{tx("Observation satellite", "Satellite observation")}</Button>
        </div>
      </section>

      <DataState data={syncs.data} isLoading={syncs.isLoading} error={syncs.error} onRetry={() => void syncs.refetch()} emptyTitle={tx("Aucune synchronisation", "No synchronization")}>
        {(rows) => (
          <ul className="grid gap-3">
            {rows.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{s.source} <span className="font-mono text-xs text-muted-foreground">{s.external_ref}</span></p>
                  <StatusBadge kind="sync" value={s.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(s.started_at, tag)} · {tx("importés", "imported")} {s.items_imported} · {tx("à valider", "to validate")} {s.items_pending_validation} · {tx("erreurs", "errors")} {s.items_failed}
                </p>
                {s.error_log.length > 0 && (
                  <ul className="mt-2 grid gap-1">
                    {s.error_log.map((e, i) => <li key={i}><Badge variant="destructive">{e.code ?? "ERR"}</Badge> <span className="text-sm">{e.message}</span></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
