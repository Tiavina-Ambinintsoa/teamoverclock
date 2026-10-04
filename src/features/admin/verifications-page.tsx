import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp } from "lucide-react"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import {
  countByStatus, EMPTY_FILTERS, filterVerifications, sortVerifications,
  type SortKey, type VerificationFilters, type VerificationItem, type VerificationStatus,
} from "@/features/admin/verifications-table"

const PAGE_SIZE = 15
const STATUSES: VerificationStatus[] = ["pending", "validated", "rejected"]

interface RawVerification {
  id: string
  citizen_id: string
  status: VerificationStatus
  ai_model: string | null
  ai_score: number | null
  rejection_reason: string | null
  submitted_at: string
  decided_at: string | null
  cin_image_path: string | null
}

/** Toutes les demandes de vérification CIN (tous statuts), chargées par pages de 1000 puis jointes côté client. */
async function fetchVerifications(): Promise<VerificationItem[]> {
  if (!supabase) return []
  const raw: RawVerification[] = []
  for (let from = 0; ; from += 1000) {
    const chunk = unwrap(
      await supabase
        .from("citizen_verifications")
        .select("id,citizen_id,status,ai_model,ai_score,rejection_reason,submitted_at,decided_at,cin_image_path")
        .order("submitted_at", { ascending: false })
        .range(from, from + 999),
      [],
    ) as RawVerification[]
    raw.push(...chunk)
    if (chunk.length < 1000) break
  }
  const citizenIds = [...new Set(raw.map((r) => r.citizen_id))]
  const citizens = new Map<string, { cin_number: string | null; profile_id: string }>()
  const names = new Map<string, string | null>()
  for (let i = 0; i < citizenIds.length; i += 200) {
    const rows = unwrap(
      await supabase.from("citizens").select("id,cin_number,profile_id").in("id", citizenIds.slice(i, i + 200)),
      [],
    ) as { id: string; cin_number: string | null; profile_id: string }[]
    rows.forEach((c) => citizens.set(c.id, c))
  }
  const profileIds = [...new Set([...citizens.values()].map((c) => c.profile_id))]
  for (let i = 0; i < profileIds.length; i += 200) {
    const rows = unwrap(
      await supabase.from("profiles").select("id,display_name").in("id", profileIds.slice(i, i + 200)),
      [],
    ) as { id: string; display_name: string | null }[]
    rows.forEach((p) => names.set(p.id, p.display_name))
  }
  return raw.map((r) => {
    const citizen = citizens.get(r.citizen_id)
    return { ...r, cin_number: citizen?.cin_number ?? null, display_name: citizen ? (names.get(citizen.profile_id) ?? null) : null }
  })
}

/** Revue des vérifications CIN : tableau complet, recherche, filtres, tri, pagination et décision motivée. */
export function AdminVerificationsPage() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<VerificationFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "submitted_at", dir: "desc" })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<VerificationItem | null>(null)
  const [reason, setReason] = useState("")

  const rows = useQuery({ queryKey: ["admin-verifications"], queryFn: fetchVerifications })

  const decide = useMutation({
    mutationFn: async (input: { id: string; approve: boolean; reason: string | null }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.rpc("decide_cin_verification", {
        p_verification_id: input.id, p_approve: input.approve, p_reason: input.reason,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Décision enregistrée.", "Decision saved."))
      setSelected(null)
      setReason("")
      await queryClient.invalidateQueries({ queryKey: ["admin-verifications"] })
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const openDocument = async (path: string) => {
    if (!supabase) return
    const { data, error } = await supabase.storage.from("cin-documents").createSignedUrl(path, 60)
    if (error || !data) toast.error(error?.message ?? tx("Document introuvable.", "Document not found."))
    else window.open(data.signedUrl, "_blank", "noopener")
  }

  const update = (patch: Partial<VerificationFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1) }
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

  const all = rows.data
  const visible = useMemo(() => sortVerifications(filterVerifications(all ?? [], filters), sort.key, sort.dir), [all, filters, sort])
  const counts = useMemo(() => countByStatus(all ?? []), [all])
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const sortHead = (key: SortKey, label: string) => (
    <TableHead aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(key)}>
        {label}
        {sort.key === key && (sort.dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />)}
      </button>
    </TableHead>
  )

  return (
    <Container className="max-w-6xl">
      <title>{tx("Vérifications CIN", "CIN checks")}</title>
      <PageHeader
        eyebrow={tx("Administration", "Administration")}
        title={tx("Vérifications CIN", "CIN checks")}
        description={tx("Toutes les demandes de vérification, quel que soit leur statut. Vous pouvez corriger chaque décision.", "Every verification request, whatever its status. You can correct any decision.")}
      />
      <DataState data={rows.data} isLoading={rows.isLoading} error={rows.error} onRetry={() => void rows.refetch()} emptyTitle={tx("Aucune vérification", "No verification")}>
        {() => (
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border px-3 py-1">{tx("Total", "Total")} : {all?.length ?? 0}</span>
              {STATUSES.map((s) => <span key={s} className="rounded-full border px-3 py-1">{tx(s === "pending" ? "En attente" : s === "validated" ? "Validées" : "Rejetées", s === "pending" ? "Pending" : s === "validated" ? "Approved" : "Rejected")} : {counts[s]}</span>)}
            </div>
            <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1 lg:col-span-2"><Label htmlFor="v-search">{tx("Recherche (nom, CIN, motif…)", "Search (name, CIN, reason…)")}</Label><Input id="v-search" type="search" value={filters.search} onChange={(e) => update({ search: e.target.value })} /></div>
              <div className="grid gap-1"><Label htmlFor="v-status">{tx("Statut", "Status")}</Label>
                <Select id="v-status" value={filters.status} onChange={(e) => update({ status: e.target.value as VerificationFilters["status"] })}>
                  <option value="all">{tx("Tous", "All")}</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1"><Label htmlFor="v-from">{tx("Du", "From")}</Label><Input id="v-from" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} /></div>
                <div className="grid gap-1"><Label htmlFor="v-to">{tx("Au", "To")}</Label><Input id="v-to" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} /></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">{visible.length} {tx("résultat(s)", "result(s)")}</p>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortHead("display_name", tx("Citoyen", "Citizen"))}
                    <TableHead>CIN</TableHead>
                    {sortHead("status", tx("Statut", "Status"))}
                    {sortHead("ai_score", "Score")}
                    {sortHead("submitted_at", tx("Soumise le", "Submitted"))}
                    <TableHead>{tx("Décidée le", "Decided")}</TableHead>
                    <TableHead>{tx("Motif", "Reason")}</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{tx("Aucun résultat pour ces filtres.", "No result for these filters.")}</TableCell></TableRow>}
                  {pageRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.display_name ?? "—"}</TableCell>
                      <TableCell>{row.cin_number ?? "—"}</TableCell>
                      <TableCell><StatusBadge kind="validation" value={row.status} /></TableCell>
                      <TableCell>{row.ai_score ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(row.submitted_at, tag)}</TableCell>
                      <TableCell>{row.decided_at ? formatDateTime(row.decided_at, tag) : "—"}</TableCell>
                      <TableCell className="max-w-56 truncate">{row.rejection_reason ?? "—"}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => { setSelected(row); setReason("") }}>{tx("Examiner", "Review")}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
          </div>
        )}
      </DataState>

      {selected && (
        <Dialog open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.display_name ?? "—"} · {selected.cin_number ?? "—"}</DialogTitle>
              <DialogDescription>{formatDateTime(selected.submitted_at, tag)} · {selected.ai_model ?? "—"} · score {selected.ai_score ?? "—"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <StatusBadge kind="validation" value={selected.status} />
              {selected.rejection_reason && <p className="text-sm">{selected.rejection_reason}</p>}
              {selected.cin_image_path && <Button variant="outline" onClick={() => void openDocument(selected.cin_image_path as string)}>{tx("Voir le document", "View document")}</Button>}
              <div className="grid gap-1"><Label htmlFor="v-reason">{tx("Motif (obligatoire pour rejeter)", "Reason (required to reject)")}</Label><Textarea id="v-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={decide.isPending || selected.status === "validated"} onClick={() => decide.mutate({ id: selected.id, approve: true, reason: null })}>{tx("Valider", "Approve")}</Button>
                <Button variant="destructive" disabled={decide.isPending || selected.status === "rejected" || reason.trim().length < 3} onClick={() => decide.mutate({ id: selected.id, approve: false, reason: reason.trim() })}>{tx("Rejeter", "Reject")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Container>
  )
}
