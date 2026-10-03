import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { useBuildings, useSectors, useServices } from "@/features/city/city-queries"
import { canPublish, canValidateReport, reportTransitions } from "@/features/reports/report-workflow"
import { useReportDetail } from "@/features/reports/report-queries"
import { fetchDisplayNames } from "@/features/requests/request-queries"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { pickLabel, REPORT_CATEGORY_LABELS, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import type { ReportStatus } from "@/lib/types"

/** Fiche d'un signalement : citoyen (suivi, envoi du brouillon) ou agent (validation, affectation, preuves restreintes). */
export function ReportDetail({ mode }: { mode: "citizen" | "agent" }) {
  const { id } = useParams()
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const detail = useReportDetail(id)
  const sectors = useSectors()
  const buildings = useBuildings()
  const services = useServices({})
  const report = detail.data?.report
  const agent = mode === "agent"
  const [assignee, setAssignee] = useState("")

  const members = useQuery({
    queryKey: ["report-members", report?.service_id],
    enabled: agent && Boolean(report?.service_id && supabase),
    queryFn: async () => {
      if (!supabase || !report?.service_id) return [] as { id: string; name: string }[]
      const rows = unwrap(await supabase.from("service_members").select("profile_id").eq("service_id", report.service_id).is("revoked_at", null), []) as { profile_id: string }[]
      const names = await fetchDisplayNames(rows.map((r) => r.profile_id))
      return rows.map((r) => ({ id: r.profile_id, name: names[r.profile_id] ?? r.profile_id }))
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["report-detail", id] })
    await queryClient.invalidateQueries({ queryKey: ["agent-reports"] })
    await queryClient.invalidateQueries({ queryKey: ["my-reports"] })
    await queryClient.invalidateQueries({ queryKey: ["public-reports"] })
  }

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!supabase || !report) throw new Error("Supabase")
      const { error } = await supabase.from("reports").update(patch).eq("id", report.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { toast.success(tx("Signalement mis à jour.", "Report updated.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const validateEvidence = useMutation({
    mutationFn: async (input: { id: string; status: "validated" | "rejected" }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("report_evidence").update({ validation_status: input.status, validated_by: user.id }).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  })

  if (detail.isLoading) return <PageLoader />
  if (!report) {
    return (
      <Container className="max-w-3xl">
        <div role="alert" className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold">{tx("Signalement introuvable", "Report not found")}</h1>
          <p className="mt-2 text-muted-foreground">{tx("Il n'existe pas ou vous n'y avez pas accès.", "It does not exist or you do not have access to it.")}</p>
        </div>
      </Container>
    )
  }

  const names = detail.data?.names ?? {}
  const sector = sectors.data?.find((s) => s.id === report.sector_id)
  const building = buildings.data?.find((b) => b.id === report.building_id)
  const service = services.data?.find((s) => s.id === report.service_id)
  const mayValidate = Boolean(user && agent && canValidateReport({ isAdmin: user.isAdmin, validatorServiceIds: user.validatorServiceIds }, report))
  const external = report.source !== "citizen" && report.source !== "agent" && report.source !== "chatbot"
  const transitions = reportTransitions(report.status).filter((s) => (s === "validated" || s === "rejected" ? mayValidate : agent))

  return (
    <Container className="max-w-4xl">
      <title>{report.report_number}</title>
      <nav aria-label={tx("Fil d'Ariane", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <Link to={agent ? "/agent/reports" : "/app/reports"} className="underline-offset-4 hover:underline">{tx("Signalements", "Reports")}</Link> / <span className="font-mono">{report.report_number}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{report.title}</h1>
          <StatusBadge kind="report" value={report.status} />
          <StatusBadge kind="priority" value={report.priority} />
          {external && <Badge variant="highlight">{tx("Source externe", "External source")}</Badge>}
          {report.is_public && <Badge variant="outline">{tx("Publié", "Published")}</Badge>}
        </div>
        <dl className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <div><dt className="inline font-medium text-foreground">{tx("Secteur", "Sector")} : </dt><dd className="inline">{sector ? `${sector.code} ${sector.name}` : "—"}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Bâtiment", "Building")} : </dt><dd className="inline">{building?.name ?? "—"}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Catégorie", "Category")} : </dt><dd className="inline">{pickLabel(REPORT_CATEGORY_LABELS, report.category, locale)}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Service responsable", "Responsible service")} : </dt><dd className="inline">{service?.name ?? "—"}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Constaté le", "Observed on")} : </dt><dd className="inline">{formatDateTime(report.observed_at, tag)}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Source", "Source")} : </dt><dd className="inline">{report.source}{report.confidence_score !== null ? ` · ${tx("confiance", "confidence")} ${Math.round(report.confidence_score * 100)} %` : ""}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Responsable", "Assigned to")} : </dt><dd className="inline">{report.assigned_agent_id ? (names[report.assigned_agent_id] ?? "—") : "—"}</dd></div>
          <div><dt className="inline font-medium text-foreground">{tx("Validé par", "Validated by")} : </dt><dd className="inline">{report.validated_by ? (names[report.validated_by] ?? "—") : "—"}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="rd-desc" className="mb-6 rounded-xl border bg-card p-5">
        <h2 id="rd-desc" className="mb-2 font-semibold">{tx("Description", "Description")}</h2>
        <p className="whitespace-pre-line text-sm">{report.description}</p>
        {report.voice_transcript && <p className="mt-3 rounded-lg bg-muted p-3 text-sm italic"><strong>{tx("Transcription vocale :", "Voice transcript:")}</strong> {report.voice_transcript}</p>}
        {!agent && report.status === "draft" && (
          <Button className="mt-4" disabled={update.isPending || (Boolean(report.voice_transcript) && !report.transcript_reviewed)} onClick={() => update.mutate({ status: "received" })}>{tx("Envoyer ce brouillon", "Send this draft")}</Button>
        )}
      </section>

      {agent && (
        <section aria-labelledby="rd-actions" className="mb-6 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3">
          <h2 id="rd-actions" className="sr-only">{tx("Actions", "Actions")}</h2>
          <div className="grid content-start gap-2">
            <label htmlFor="rd-status" className="text-sm font-medium">{tx("Changer le statut", "Change status")}</label>
            <Select id="rd-status" value="" disabled={transitions.length === 0 || update.isPending} onChange={(e) => e.target.value && update.mutate({ status: e.target.value as ReportStatus })}>
              <option value="">{transitions.length ? "—" : tx("Aucune action", "No action")}</option>
              {transitions.map((s) => <option key={s} value={s}>{statusLabel("report", s, locale)}</option>)}
            </Select>
            {!mayValidate && ["received", "to_verify"].includes(report.status) && <p className="text-xs text-muted-foreground">{tx("Seul un administrateur de ce service peut valider ce signalement.", "Only an administrator of this service can validate this report.")}</p>}
          </div>
          <div className="grid content-start gap-2">
            <label htmlFor="rd-assign" className="text-sm font-medium">{tx("Affecter à", "Assign to")}</label>
            <Select id="rd-assign" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">—</option>
              {(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Button variant="outline" disabled={!assignee || update.isPending} onClick={() => update.mutate({ assigned_agent_id: assignee, ...(report.status === "validated" ? { status: "assigned" } : {}) })}>{tx("Affecter", "Assign")}</Button>
          </div>
          <div className="grid content-start gap-2">
            <p className="text-sm font-medium">{tx("Publication", "Publication")}</p>
            <Button variant="outline" disabled={update.isPending || !mayValidate || !canPublish(report.status, report.validated_by) } onClick={() => update.mutate({ is_public: !report.is_public })}>
              {report.is_public ? tx("Retirer de la publication", "Unpublish") : tx("Publier", "Publish")}
            </Button>
            <p className="text-xs text-muted-foreground">{tx("Un signalement n'est public qu'après validation.", "A report is public only after validation.")}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="rd-evidence" className="mb-6 rounded-xl border bg-card p-5">
        <h2 id="rd-evidence" className="mb-3 font-semibold">{tx("Preuves", "Evidence")}</h2>
        {(detail.data?.evidence.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">{tx("Aucune preuve jointe.", "No evidence attached.")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {detail.data?.evidence.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={item.visibility === "sensitive" ? "destructive" : "secondary"}>{item.source}</Badge>
                  {item.visibility === "sensitive" && <Badge variant="outline">{tx("Sensible", "Sensitive")}</Badge>}
                  <StatusBadge kind="validation" value={item.validation_status} />
                </div>
                {item.mime_type.startsWith("image/") && detail.data?.urls[item.id]
                  ? <img src={detail.data.urls[item.id]} alt={item.alt_text || tx("Preuve jointe", "Attached evidence")} className="max-h-56 w-full rounded-md object-cover" />
                  : detail.data?.urls[item.id] ? <a className="underline" href={detail.data.urls[item.id]} target="_blank" rel="noopener noreferrer">{tx("Ouvrir le document", "Open document")}</a>
                  : <p className="text-muted-foreground">{tx("Fichier simulé (non disponible).", "Simulated file (not available).")}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.captured_at, tag)}{item.confidence_score !== null ? ` · ${tx("confiance", "confidence")} ${Math.round(item.confidence_score * 100)} %` : ""}</p>
                {mayValidate && item.validation_status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" disabled={validateEvidence.isPending} onClick={() => validateEvidence.mutate({ id: item.id, status: "validated" })}>{tx("Valider", "Approve")}</Button>
                    <Button size="sm" variant="outline" disabled={validateEvidence.isPending} onClick={() => validateEvidence.mutate({ id: item.id, status: "rejected" })}>{tx("Rejeter", "Reject")}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rd-history" className="rounded-xl border bg-card p-5">
        <h2 id="rd-history" className="mb-3 font-semibold">{tx("Historique", "History")}</h2>
        <ol className="grid gap-2 text-sm">
          <li className="text-muted-foreground">{formatDateTime(report.created_at, tag)} · {tx("Signalement créé", "Report created")}</li>
          {(detail.data?.history ?? []).map((h) => (
            <li key={h.id}>
              <span className="text-muted-foreground">{formatDateTime(h.changed_at, tag)} · </span>
              {h.from_status ? statusLabel("report", h.from_status, locale) : "—"} → <strong>{statusLabel("report", h.to_status, locale)}</strong>
              {agent && h.changed_by ? <span className="text-muted-foreground"> ({names[h.changed_by] ?? "—"})</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </Container>
  )
}

export function CitizenReportDetailPage() {
  return <ReportDetail mode="citizen" />
}
export function AgentReportDetailPage() {
  return <ReportDetail mode="agent" />
}
