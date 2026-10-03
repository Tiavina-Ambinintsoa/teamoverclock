import { RefreshCw } from "lucide-react"
import { Link } from "react-router"

import { StatusBadge } from "@/components/status-badge"
import { useSyncs } from "@/features/agent/sync-queries"
import { useLocale } from "@/lib/locale"
import { formatDateTime } from "@/lib/query-helpers"

/** Indicateur de synchronisation API (D19) : dernière synchro, statut, éléments importés, en attente et en erreur. */
export function SyncIndicator() {
  const { tx, tag } = useLocale()
  const syncs = useSyncs(10)
  const last = syncs.data?.[0]
  const pending = (syncs.data ?? []).reduce((n, s) => n + s.items_pending_validation, 0)

  return (
    <section aria-labelledby="sync-title" className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sync-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><RefreshCw className="size-4" aria-hidden />{tx("Synchronisation API", "API synchronization")}</h2>
        {last && <StatusBadge kind="sync" value={last.status} />}
      </div>
      {syncs.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">{tx("Indicateur indisponible : les données déjà enregistrées restent accessibles.", "Indicator unavailable: stored data remains accessible.")}</p>
      ) : last ? (
        <dl className="mt-3 grid gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{tx("Dernière synchro", "Last sync")}</dt><dd>{formatDateTime(last.started_at, tag)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{tx("Éléments importés", "Imported items")}</dt><dd>{last.items_imported}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{tx("En attente de validation", "Pending validation")}</dt><dd>{pending}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{tx("Erreurs d'import", "Import errors")}</dt><dd>{last.items_failed}</dd></div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{tx("Aucune synchronisation enregistrée.", "No synchronization recorded.")}</p>
      )}
      <Link to="/agent/sync" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">{tx("Voir le détail", "View details")}</Link>
    </section>
  )
}
