import { useState } from "react"
import { Plus } from "lucide-react"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { useMyRequests } from "@/features/requests/request-queries"
import { REQUEST_STATUSES, statusLabel } from "@/lib/status-labels"
import { useLocale } from "@/lib/locale"
import { formatDateTime } from "@/lib/query-helpers"

/** F22 (côté citoyen) — historique de mes demandes et de leur statut. */
export function MyRequestsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const requests = useMyRequests(user?.id)
  const [status, setStatus] = useState("")
  const filtered = (requests.data ?? []).filter((r) => !status || r.status === status)

  return (
    <Container className="max-w-4xl">
      <title>{tx("Mes demandes", "My requests")}</title>
      <PageHeader
        eyebrow={tx("Mon espace", "My space")}
        title={tx("Mes demandes", "My requests")}
        description={tx("Suivez l'avancement de chaque demande envoyée aux services.", "Follow the progress of every request sent to the services.")}
        actions={<Button asChild><Link to="/app/requests/new"><Plus aria-hidden />{tx("Nouvelle demande", "New request")}</Link></Button>}
      />
      <div className="mb-4 max-w-xs">
        <label htmlFor="my-status" className="mb-1 block text-sm font-medium">{tx("Filtrer par statut", "Filter by status")}</label>
        <Select id="my-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{tx("Tous", "All")}</option>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{statusLabel("request", s, locale)}</option>)}
        </Select>
      </div>
      <DataState data={filtered} isLoading={requests.isLoading} error={requests.error} onRetry={() => void requests.refetch()} emptyTitle={tx("Aucune demande", "No request")} emptyDescription={tx("Vous n'avez pas encore contacté de service.", "You have not contacted any service yet.")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((r) => (
              <li key={r.id}>
                <Link to={`/app/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-accent">
                  <div className="min-w-0">
                    <p className="font-medium">{r.subject}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-mono">{r.tracking_number}</span> · {formatDateTime(r.created_at, tag)}</p>
                  </div>
                  <StatusBadge kind="request" value={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
