import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSectors, useServices } from "@/features/city/city-queries"
import { REPORT_CATEGORIES } from "@/features/reports/report-workflow"
import {
  filterAndSortReports,
  paginateRows,
  REPORT_SOURCE_OPTIONS,
  type AllReportsFilters,
  type ReportSortOption,
} from "@/features/reports/all-reports-page.helpers"
import type { ReportCategory, ReportRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { pickLabel, REPORT_CATEGORY_LABELS, REPORT_STATUSES, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 15
const DEFAULT_FILTERS: AllReportsFilters = {
  search: "",
  status: "",
  priority: "",
  category: "",
  sectorId: "",
  serviceId: "",
  source: "",
  from: "",
  to: "",
  onlyPublic: false,
  sort: "observed-desc",
}

export function AllReportsPage() {
  const { tx, tag, locale } = useLocale()
  const sectors = useSectors()
  const services = useServices({})
  const [filters, setFilters] = useState<AllReportsFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)

  const reports = useQuery({
    queryKey: ["admin-all-reports"],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<ReportRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase.from("reports").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
        [],
      ) as ReportRow[]
    },
  })

  const filtered = useMemo(() => filterAndSortReports(reports.data ?? [], filters), [reports.data, filters])
  const paginated = useMemo(() => paginateRows(filtered, page, PAGE_SIZE), [filtered, page])
  const sectorLabel = (id: string) => sectors.data?.find((sector) => sector.id === id)?.name ?? "—"
  const serviceLabel = (id: string | null) => services.data?.find((service) => service.id === id)?.name ?? "—"

  const updateFilter = <K extends keyof AllReportsFilters>(key: K, value: AllReportsFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const sortLabel = (value: ReportSortOption) => {
    switch (value) {
      case "observed-asc":
        return tx("Date constatée · plus ancienne", "Observed date · oldest")
      case "created-desc":
        return tx("Création · plus récente", "Created · newest")
      case "created-asc":
        return tx("Création · plus ancienne", "Created · oldest")
      case "priority-desc":
        return tx("Priorité · critique d'abord", "Priority · critical first")
      case "title-asc":
        return tx("Titre · A → Z", "Title · A → Z")
      case "observed-desc":
      default:
        return tx("Date constatée · plus récente", "Observed date · newest")
    }
  }

  return (
    <Container className="max-w-7xl">
      <title>{tx("Tous les signalements", "All reports")}</title>
      <PageHeader
        eyebrow={tx("Administration", "Administration")}
        title={tx("Tous les signalements", "All reports")}
        description={tx("Vue globale des signalements non supprimés, avec filtres, tri et export via le tableau visible.", "Global view of non-deleted reports with filters, sorting and export from the visible table.")}
      />

      <search className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          aria-label={tx("Rechercher", "Search")}
          type="search"
          placeholder={tx("Titre ou numéro…", "Title or number…")}
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
        />
        <Select aria-label={tx("Statut", "Status")} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          <option value="">{tx("Tous les statuts", "All statuses")}</option>
          {REPORT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel("report", status, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Priorité", "Priority")} value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
          <option value="">{tx("Toutes les priorités", "All priorities")}</option>
          {["low", "medium", "high", "critical"].map((priority) => <option key={priority} value={priority}>{statusLabel("priority", priority, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Catégorie", "Category")} value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
          <option value="">{tx("Toutes les catégories", "All categories")}</option>
          {REPORT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {pickLabel(REPORT_CATEGORY_LABELS, category as ReportCategory, locale)}
            </option>
          ))}
        </Select>
        <Select aria-label={tx("Secteur", "Sector")} value={filters.sectorId} onChange={(event) => updateFilter("sectorId", event.target.value)}>
          <option value="">{tx("Tous les secteurs", "All sectors")}</option>
          {(sectors.data ?? []).map((sector) => <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>)}
        </Select>
        <Select aria-label={tx("Service", "Service")} value={filters.serviceId} onChange={(event) => updateFilter("serviceId", event.target.value)}>
          <option value="">{tx("Tous les services", "All services")}</option>
          {(services.data ?? []).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </Select>
        <Select aria-label={tx("Source", "Source")} value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
          <option value="">{tx("Toutes les sources", "All sources")}</option>
          {REPORT_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
        </Select>
        <Select aria-label={tx("Tri", "Sort")} value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as ReportSortOption)}>
          {(["observed-desc", "observed-asc", "created-desc", "created-asc", "priority-desc", "title-asc"] as ReportSortOption[]).map((option) => (
            <option key={option} value={option}>{sortLabel(option)}</option>
          ))}
        </Select>
        <Input aria-label={tx("Du", "From")} type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
        <Input aria-label={tx("Au", "To")} type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={filters.onlyPublic}
            onChange={(event) => updateFilter("onlyPublic", event.target.checked)}
          />
          {tx("Uniquement publics", "Only public")}
        </label>
      </search>

      <DataState
        data={reports.data}
        isLoading={reports.isLoading}
        error={reports.error}
        onRetry={() => void reports.refetch()}
        emptyTitle={tx("Aucun signalement", "No report")}
      >
        {() => (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {filtered.length} {tx("résultat(s)", "result(s)")}
            </p>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tx("Numéro", "Number")}</TableHead>
                    <TableHead>{tx("Titre", "Title")}</TableHead>
                    <TableHead>{tx("Catégorie", "Category")}</TableHead>
                    <TableHead>{tx("Secteur", "Sector")}</TableHead>
                    <TableHead>{tx("Service", "Service")}</TableHead>
                    <TableHead>{tx("Source", "Source")}</TableHead>
                    <TableHead>{tx("Constaté le", "Observed on")}</TableHead>
                    <TableHead>{tx("Statut", "Status")}</TableHead>
                    <TableHead>{tx("Priorité", "Priority")}</TableHead>
                    <TableHead>{tx("Public", "Public")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.rows.map((report) => (
                    <TableRow key={report.id} className={report.priority === "critical" ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-mono text-xs">{report.report_number}</TableCell>
                      <TableCell>
                        <Link to={`/agent/reports/${report.id}`} className="font-medium underline-offset-4 hover:underline">
                          {report.title}
                        </Link>
                      </TableCell>
                      <TableCell>{pickLabel(REPORT_CATEGORY_LABELS, report.category, locale)}</TableCell>
                      <TableCell>{sectorLabel(report.sector_id)}</TableCell>
                      <TableCell>{serviceLabel(report.service_id)}</TableCell>
                      <TableCell>{report.source}</TableCell>
                      <TableCell>{formatDateTime(report.observed_at, tag)}</TableCell>
                      <TableCell><StatusBadge kind="report" value={report.status} /></TableCell>
                      <TableCell className={report.priority === "critical" ? "font-semibold text-destructive" : undefined}>
                        <StatusBadge kind="priority" value={report.priority} />
                      </TableCell>
                      <TableCell>{report.is_public ? tx("Oui", "Yes") : tx("Non", "No")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination className="mt-4" page={paginated.currentPage} pageCount={paginated.pageCount} onPageChange={setPage} />
          </>
        )}
      </DataState>
    </Container>
  )
}
