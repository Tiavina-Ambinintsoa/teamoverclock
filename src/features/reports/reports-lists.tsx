import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, ThumbsDown, ThumbsUp } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/features/auth/auth-context"
import { useSectors } from "@/features/city/city-queries"
import { canEditReport } from "@/features/reports/editability"
import { useMyReports, usePublicReports } from "@/features/reports/report-queries"
import { ReportSummaryPanel } from "@/features/reports/report-summary-panel"
import { groupReports, REPORT_CATEGORIES, type ReportGrouping } from "@/features/reports/report-workflow"
import type { ReportRow } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { pickLabel, REPORT_CATEGORY_LABELS, REPORT_STATUSES, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"

/** Mes signalements (citoyen). */
export function MyReportsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const reports = useMyReports(user?.citizenId)

  return (
    <Container className="max-w-4xl">
      <title>{tx("Mes signalements", "My reports")}</title>
      <PageHeader
        eyebrow={tx("Mon espace", "My space")}
        title={tx("Mes signalements", "My reports")}
        description={tx("Suivez la vérification et le traitement de vos signalements.", "Follow the review and handling of your reports.")}
        actions={<Button asChild><Link to="/app/reports/new"><Plus aria-hidden />{tx("Nouveau signalement", "New report")}</Link></Button>}
      />
      {user && user.kycStatus !== "verified" && (
        <p role="note" className="mb-4 rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
          {tx("Votre identité n'est pas vérifiée : vous ne pouvez pas encore déposer de signalement.", "Your identity is not verified: you cannot file reports yet.")} <Link to="/app/verification" className="underline underline-offset-4">{tx("Vérifier", "Verify")}</Link>
        </p>
      )}
      {reports.data && <ReportSummaryPanel reports={reports.data} />}
      <DataState data={reports.data} isLoading={reports.isLoading} error={reports.error} onRetry={() => void reports.refetch()} emptyTitle={tx("Aucun signalement", "No report")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link to={`/app/reports/${r.id}`} className="min-w-0 flex-1 hover:text-primary">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-mono">{r.report_number}</span> · {pickLabel(REPORT_CATEGORY_LABELS, r.category, locale)} · {formatDateTime(r.created_at, tag)}</p>
                    {r.postponement_reason && <p className="mt-1 text-sm"><strong>{tx("Reporté :", "Postponed:")}</strong> {r.postponement_reason}</p>}
                    {r.next_steps && <p className="mt-1 text-sm"><strong>{tx("Étapes suivantes :", "Next steps:")}</strong> {r.next_steps}</p>}
                    {(r.required_documents ?? []).length > 0 && <p className="mt-1 text-sm"><strong>{tx("Documents :", "Documents:")}</strong> {(r.required_documents ?? []).join(", ")}</p>}
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="report" value={r.status} />
                    {(() => {
                      const editability = canEditReport({ ...r, history: [] }, user?.citizenId)
                      if (editability.editable) {
                        return <Button asChild size="sm" variant="outline"><Link to={`/app/reports/${r.id}`}>{tx("Modifier", "Edit")}</Link></Button>
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" variant="outline" disabled>{tx("Modifier", "Edit")}</Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{editability.reason ? tx(editability.reason.fr, editability.reason.en) : tx("Modification non disponible.", "Editing unavailable.")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}

const PAGE_SIZE = 15

/** D19 — signalements de mon périmètre : filtres statut / priorité / secteur / source / date, sources externes identifiées. */
export function AgentReportsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const sectors = useSectors()
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [sectorId, setSectorId] = useState("")
  const [source, setSource] = useState("")
  const [from, setFrom] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const reports = useQuery({
    queryKey: ["agent-reports", user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<ReportRow[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("reports").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(500), []) as ReportRow[]
    },
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...(reports.data ?? [])]
      .filter((r) =>
        (!status || r.status === status) && (!priority || r.priority === priority) && (!sectorId || r.sector_id === sectorId) &&
        (!source || r.source === source) && (!from || r.created_at.slice(0, 10) >= from) &&
        (!term || `${r.title} ${r.report_number}`.toLowerCase().includes(term))
      )
      .sort((a, b) => Number(b.priority === "critical") - Number(a.priority === "critical") || b.created_at.localeCompare(a.created_at))
  }, [reports.data, status, priority, sectorId, source, from, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const sectorName = (id: string) => sectors.data?.find((s) => s.id === id)?.code ?? "—"
  const change = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1) }

  return (
    <Container className="max-w-6xl">
      <title>{tx("Signalements", "Reports")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Signalements", "Reports")} description={tx("Les signalements automatiques (caméra, satellite, API) sont à vérifier avant toute publication.", "Automatic reports (camera, satellite, API) must be verified before any publication.")} />

      <search className="mb-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
        <Input aria-label={tx("Rechercher", "Search")} type="search" placeholder={tx("Titre ou numéro…", "Title or number…")} value={search} onChange={(e) => change(setSearch)(e.target.value)} />
        <Select aria-label={tx("Statut", "Status")} value={status} onChange={(e) => change(setStatus)(e.target.value)}>
          <option value="">{tx("Tous les statuts", "All statuses")}</option>
          {REPORT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel("report", s, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Priorité", "Priority")} value={priority} onChange={(e) => change(setPriority)(e.target.value)}>
          <option value="">{tx("Toutes les priorités", "All priorities")}</option>
          {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{statusLabel("priority", p, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Secteur", "Sector")} value={sectorId} onChange={(e) => change(setSectorId)(e.target.value)}>
          <option value="">{tx("Tous les secteurs", "All sectors")}</option>
          {(sectors.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </Select>
        <Select aria-label={tx("Source", "Source")} value={source} onChange={(e) => change(setSource)(e.target.value)}>
          <option value="">{tx("Toutes les sources", "All sources")}</option>
          {["citizen", "agent", "chatbot", "camera", "satellite", "external_api", "import"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input aria-label={tx("À partir du", "From")} type="date" value={from} onChange={(e) => change(setFrom)(e.target.value)} />
      </search>

      <DataState data={visible} isLoading={reports.isLoading} error={reports.error} onRetry={() => void reports.refetch()} emptyTitle={tx("Aucun signalement", "No report")}>
        {(items) => (
          <>
            <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">{filtered.length} {tx("résultat(s)", "result(s)")}</p>
            <ul className="grid gap-3">
              {items.map((r) => {
                const external = !["citizen", "agent", "chatbot"].includes(r.source)
                return (
                  <li key={r.id}>
                    <Link
                      to={`/agent/reports/${r.id}`}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 ${r.priority === "critical" ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10" : "hover:bg-accent"}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground"><span className="font-mono">{r.report_number}</span> · {sectorName(r.sector_id)} · {formatDateTime(r.created_at, tag)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {external && <Badge variant="highlight">{tx("Externe", "External")} · {r.source}</Badge>}
                        {r.confidence_score !== null && <Badge variant="outline">{Math.round(r.confidence_score * 100)} %</Badge>}
                        <StatusBadge kind="priority" value={r.priority} />
                        <StatusBadge kind="report" value={r.status} />
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

/** Signalements publics (validés) regroupés par type ou par secteur ; réputation de l'auteur ; vote entre habitants vérifiés. */
export function PublicReportsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const reports = usePublicReports()
  const [grouping, setGrouping] = useState<ReportGrouping>("type")
  const [category, setCategory] = useState("")

  const filtered = (reports.data ?? []).filter((r) => !category || r.category === category)
  const groups = groupReports(filtered, grouping)
  const groupLabel = (key: string) => grouping === "type" ? pickLabel(REPORT_CATEGORY_LABELS, key, locale) : (sectors.data?.find((s) => s.id === key)?.name ?? key)
  const canVote = user?.kycStatus === "verified"
  const visibleReportIds = filtered.map((report) => report.id)
  const upvoteCounts = useQuery({
    queryKey: ["public-report-upvote-counts", visibleReportIds],
    enabled: Boolean(supabase && reports.data),
    queryFn: async () => {
      if (!supabase || visibleReportIds.length === 0) return [] as { report_id: string; upvote_count: number }[]
      return unwrap(await supabase.rpc("get_public_report_upvote_counts", { p_report_ids: visibleReportIds }), []) as { report_id: string; upvote_count: number }[]
    },
  })
  const myUpvotes = useQuery({
    queryKey: ["my-public-report-upvotes", user?.citizenId],
    enabled: Boolean(supabase && user?.citizenId),
    queryFn: async () => {
      if (!supabase || !user?.citizenId) return [] as { report_id: string }[]
      return unwrap(await supabase.from("report_upvotes").select("report_id").eq("citizen_id", user.citizenId), []) as { report_id: string }[]
    },
  })

  const vote = useMutation({
    mutationFn: async (input: { toCitizenId: string; points: 1 | -1 }) => {
      if (!supabase || !user?.citizenId) throw new Error("Supabase")
      const { error } = await supabase.from("reputation_votes").upsert(
        { from_citizen_id: user.citizenId, to_citizen_id: input.toCitizenId, points: input.points },
        { onConflict: "from_citizen_id,to_citizen_id" }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Vote enregistré.", "Vote saved."))
      await queryClient.invalidateQueries({ queryKey: ["public-reports"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const upvote = useMutation({
    mutationFn: async (reportId: string) => {
      if (!supabase || !user?.citizenId || !canVote) throw new Error(tx("La vérification du compte est requise pour voter.", "Account verification is required to vote."))
      const alreadyVoted = (myUpvotes.data ?? []).some((item) => item.report_id === reportId)
      const result = alreadyVoted
        ? await supabase.from("report_upvotes").delete().eq("report_id", reportId).eq("citizen_id", user.citizenId)
        : await supabase.from("report_upvotes").insert({ report_id: reportId, citizen_id: user.citizenId })
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["public-report-upvote-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["my-public-report-upvotes"] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const upvotesByReport = new Map((upvoteCounts.data ?? []).map((item) => [item.report_id, Number(item.upvote_count)]))
  const myUpvotedReports = new Set((myUpvotes.data ?? []).map((item) => item.report_id))

  return (
    <Container className="py-10">
      <title>{tx("Signalements publics", "Public reports")}</title>
      <PageHeader eyebrow={tx("La ville", "The city")} title={tx("Signalements publics", "Public reports")} description={tx("Signalements validés par les administrateurs de service. La réputation de l'auteur est indicative et ne remplace jamais la validation officielle.", "Reports validated by service administrators. The author's reputation is indicative and never replaces official validation.")} />
      {!canVote && <p role="note" className="mb-4 rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">{tx("Vérifiez votre identité pour soutenir un signalement.", "Verify your identity to support a report.")}</p>}

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <fieldset className="flex gap-2"><legend className="sr-only">{tx("Regrouper par", "Group by")}</legend>
          {(["type", "location"] as const).map((g) => (
            <Button key={g} variant={grouping === g ? "default" : "outline"} size="sm" aria-pressed={grouping === g} onClick={() => setGrouping(g)}>
              {g === "type" ? tx("Par type", "By type") : tx("Par localisation", "By location")}
            </Button>
          ))}
        </fieldset>
        <Select aria-label={tx("Catégorie", "Category")} value={category} onChange={(e) => setCategory(e.target.value)} className="w-56">
          <option value="">{tx("Toutes les catégories", "All categories")}</option>
          {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{pickLabel(REPORT_CATEGORY_LABELS, c, locale)}</option>)}
        </Select>
      </div>

      <DataState data={groups} isLoading={reports.isLoading} error={reports.error} onRetry={() => void reports.refetch()} emptyTitle={tx("Aucun signalement public", "No public report")}>
        {(list) => (
          <div className="grid gap-6">
            {list.map((group) => (
              <section key={group.key} aria-label={groupLabel(group.key)}>
                <h2 className="mb-2 text-lg font-semibold">{groupLabel(group.key)} <Badge variant="secondary">{group.items.length}</Badge></h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {group.items.map((r) => (
                    <li key={r.id} className="rounded-xl border bg-card p-4">
                      <div className="mb-1 flex flex-wrap items-center gap-2"><StatusBadge kind="report" value={r.status} /><span className="text-xs text-muted-foreground">{formatDateTime(r.observed_at, tag)}</span></div>
                      <h3 className="font-medium">{r.title}</h3>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={myUpvotedReports.has(r.id) ? "default" : "outline"}
                          disabled={!canVote || upvote.isPending}
                          aria-pressed={myUpvotedReports.has(r.id)}
                          aria-label={myUpvotedReports.has(r.id)
                            ? tx(`Retirer mon vote de soutien, ${upvotesByReport.get(r.id) ?? 0} votes`, `Remove my support vote, ${upvotesByReport.get(r.id) ?? 0} votes`)
                            : tx(`Soutenir ce signalement, ${upvotesByReport.get(r.id) ?? 0} votes`, `Support this report, ${upvotesByReport.get(r.id) ?? 0} votes`)}
                          onClick={() => upvote.mutate(r.id)}
                        >
                          <ThumbsUp aria-hidden /> {tx("Soutenir", "Support")} · {upvotesByReport.get(r.id) ?? 0}
                        </Button>
                      </div>
                      {r.reporter_name && (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {tx("Par", "By")} {r.reporter_name} · {tx("réputation", "reputation")} {r.reporter_reputation ?? 0}
                          {canVote && r.reporter_citizen_id && r.reporter_citizen_id !== user?.citizenId && (
                            <span className="ml-auto flex gap-1">
                              <Button size="icon-sm" variant="outline" aria-label={tx("Donner un point à l'auteur", "Give the author a point")} disabled={vote.isPending} onClick={() => vote.mutate({ toCitizenId: r.reporter_citizen_id as string, points: 1 })}><ThumbsUp aria-hidden /></Button>
                              <Button size="icon-sm" variant="outline" aria-label={tx("Retirer un point à l'auteur", "Remove a point from the author")} disabled={vote.isPending} onClick={() => vote.mutate({ toCitizenId: r.reporter_citizen_id as string, points: -1 })}><ThumbsDown aria-hidden /></Button>
                            </span>
                          )}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DataState>
    </Container>
  )
}
