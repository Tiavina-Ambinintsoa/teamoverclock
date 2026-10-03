import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { needsAction, sortRequests, type RequestSort } from "@/features/requests/request-workflow"
import type { RequestRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { formatDateTime, isOverdue, unwrap } from "@/lib/query-helpers"
import { REQUEST_STATUSES, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 15

/** F22 / D19 — liste des demandes de mon périmètre : filtres, tri par urgence, demandes à traiter, retards signalés. */
export function AgentRequestsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const services = useServices({})
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<RequestSort>("urgency")
  const [onlyMine, setOnlyMine] = useState(false)
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [page, setPage] = useState(1)

  const requests = useQuery({
    queryKey: ["agent-requests", user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<RequestRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("requests").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(500), []) as RequestRow[]
    },
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = (requests.data ?? []).filter((r) => {
      if (status && r.status !== status) return false
      if (priority && r.priority !== priority) return false
      if (serviceId && r.service_id !== serviceId) return false
      if (from && r.created_at.slice(0, 10) < from) return false
      if (to && r.created_at.slice(0, 10) > to) return false
      if (term && !`${r.subject} ${r.tracking_number}`.toLowerCase().includes(term)) return false
      if (onlyMine && !needsAction(r, user?.id ?? "")) return false
      if (onlyOverdue && !isOverdue(r.due_at, r.status)) return false
      return true
    })
    return sortRequests(list, sort)
  }, [requests.data, status, priority, serviceId, from, to, search, onlyMine, onlyOverdue, sort, user?.id])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name ?? "—"
  const reset = <T,>(setter: (v: T) => void) => (value: T) => { setter(value); setPage(1) }

  return (
    <Container className="max-w-6xl">
      <title>{tx("Demandes", "Requests")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Demandes des habitants", "Residents' requests")} description={tx("Triez par urgence, filtrez et ouvrez une demande pour la traiter.", "Sort by urgency, filter and open a request to handle it.")} />

      <search className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <Input aria-label={tx("Rechercher", "Search")} type="search" placeholder={tx("Sujet ou numéro…", "Subject or number…")} value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <Select aria-label={tx("Statut", "Status")} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <option value="">{tx("Tous les statuts", "All statuses")}</option>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{statusLabel("request", s, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Priorité", "Priority")} value={priority} onChange={(e) => reset(setPriority)(e.target.value)}>
          <option value="">{tx("Toutes les priorités", "All priorities")}</option>
          {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{statusLabel("priority", p, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Service", "Service")} value={serviceId} onChange={(e) => reset(setServiceId)(e.target.value)}>
          <option value="">{tx("Tous mes services", "All my services")}</option>
          {(services.data ?? []).filter((s) => user?.isAdmin || user?.serviceIds.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input aria-label={tx("Du", "From")} type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        <Input aria-label={tx("Au", "To")} type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        <Select aria-label={tx("Tri", "Sort")} value={sort} onChange={(e) => setSort(e.target.value as RequestSort)}>
          <option value="urgency">{tx("Tri : urgence", "Sort: urgency")}</option>
          <option value="oldest">{tx("Tri : ancienneté", "Sort: age")}</option>
          <option value="status">{tx("Tri : statut", "Sort: status")}</option>
        </Select>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={onlyMine} onChange={(e) => reset(setOnlyMine)(e.target.checked)} />{tx("À traiter", "To handle")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={onlyOverdue} onChange={(e) => reset(setOnlyOverdue)(e.target.checked)} />{tx("En retard", "Overdue")}</label>
        </div>
      </search>

      <DataState data={visible} isLoading={requests.isLoading} error={requests.error} onRetry={() => void requests.refetch()} emptyTitle={tx("Aucune demande", "No request")} emptyDescription={tx("Aucune demande ne correspond à ces filtres.", "No request matches these filters.")}>
        {(items) => (
          <>
            <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">{filtered.length} {tx("résultat(s)", "result(s)")}</p>
            <ul className="grid gap-3">
              {items.map((r) => {
                const overdue = isOverdue(r.due_at, r.status)
                return (
                  <li key={r.id}>
                    <Link to={`/agent/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-accent">
                      <div className="min-w-0">
                        <p className="font-medium">{r.subject}</p>
                        <p className="text-sm text-muted-foreground"><span className="font-mono">{r.tracking_number}</span> · {serviceName(r.service_id)} · {formatDateTime(r.created_at, tag)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {overdue && <Badge variant="destructive">{tx("En retard", "Overdue")}</Badge>}
                        {r.urgency_flag && <Badge variant="highlight">{tx("Urgent", "Urgent")}</Badge>}
                        {user && needsAction(r, user.id) && <Badge>{tx("Action requise", "Action needed")}</Badge>}
                        <StatusBadge kind="priority" value={r.priority} />
                        <StatusBadge kind="request" value={r.status} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Pagination className="mt-4" page={current} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </DataState>
    </Container>
  )
}
