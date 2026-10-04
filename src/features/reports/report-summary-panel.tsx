import { useMemo, useState } from "react"
import { Download, Printer, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { PdfReportDocument, PdfReportField, PdfReportFields, PdfReportRecord, PdfReportSection, printPdfDocument } from "@/components/pdf-report"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import type { ReportRow } from "@/lib/db-types"
import { env } from "@/lib/env"
import { LOCALE_OPTIONS, useLocale } from "@/lib/locale"
import { pickLabel, REPORT_CATEGORY_LABELS, REPORT_STATUSES, statusLabel } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import { buildReportSummary, EMPTY_REPORT_SUMMARY_FILTERS, filterOwnedReports, reportSummaryGrounding } from "@/features/reports/report-summary"

const dateSuffix = () => new Date().toISOString().slice(0, 10)

export function ReportSummaryPanel({ reports }: { reports: ReportRow[] }) {
  const { tx, locale, tag } = useLocale()
  const { user } = useAuth()
  const [filters, setFilters] = useState(EMPTY_REPORT_SUMMARY_FILTERS)
  const [aiConsent, setAiConsent] = useState(false)
  const [aiSummary, setAiSummary] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState("")
  const [generatedAt] = useState(() => new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" }).format(new Date()))
  const filtered = useMemo(() => filterOwnedReports(reports, filters), [filters, reports])
  const filterLabels: Record<keyof typeof filters, string> = {
    search: tx("Recherche", "Search"),
    status: tx("Statut", "Status"),
    category: tx("Catégorie", "Category"),
    priority: tx("Priorité", "Priority"),
    from: tx("Date de début", "Start date"),
    to: tx("Date de fin", "End date"),
  }
  const summary = useMemo(() => buildReportSummary(filtered, {
    title: tx("Résumé de mes signalements", "My report summary"),
    generated: tx("Généré le", "Generated"),
    total: tx("Total", "Total"),
    open: tx("En cours", "Open"),
    resolved: tx("Résolus", "Resolved"),
    archived: tx("Clôturés / refusés", "Closed / rejected"),
    report: tx("Signalement", "Report"),
    status: tx("Statut", "Status"),
    category: tx("Catégorie", "Category"),
    priority: tx("Priorité", "Priority"),
    date: tx("Date", "Date"),
    description: tx("Description", "Description"),
    nextSteps: tx("Étapes suivantes", "Next steps"),
    documents: tx("Documents requis", "Required documents"),
    postponement: tx("Motif du report", "Postponement reason"),
    none: tx("Aucun signalement ne correspond aux filtres.", "No reports match these filters."),
    formatStatus: (value) => statusLabel("report", value, locale),
    formatCategory: (value) => pickLabel(REPORT_CATEGORY_LABELS, value, locale),
    formatPriority: (value) => statusLabel("priority", value, locale),
  }), [filtered, locale, tx])
  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setAiSummary("")
    setAiError("")
  }

  const download = () => {
    const blob = new Blob([`\uFEFF${aiSummary ? `${aiSummary}\n\n---\n\n` : ""}${summary}`], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `mes-signalements-${dateSuffix()}.txt`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const enhance = async () => {
    if (!env.enableAIChat) {
      setAiError(tx("L’assistant IA n’est pas activé sur ce site.", "AI summaries are not enabled on this site."))
      return
    }
    if (!supabase || !aiConsent) return
    if (filtered.length === 0) {
      setAiError(tx("Aucun signalement ne correspond aux filtres.", "No reports match these filters."))
      return
    }
    setAiBusy(true)
    setAiError("")
    try {
      const reportsForAI = JSON.parse(reportSummaryGrounding(filtered)) as unknown[]
      const outputLanguage = LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? locale
      const { data, error } = await supabase.functions.invoke("openrouter-chat", {
        body: {
          message: `${tx(
            "Rédige un résumé clair et facile à lire de ces signalements personnels. Regroupe les tendances utiles, explique ce qui est résolu et ce qui demande encore une action, et conserve les étapes suivantes et documents requis. Utilise uniquement les données fournies, n'invente aucun fait, ne donne pas de conseil juridique ou médical. Signale si l'échantillon envoyé ne représente pas tous les signalements filtrés.",
            "Write a clear, easy-to-read summary of these personal reports. Group useful patterns, explain what is resolved and what still needs action, and preserve next steps and required documents. Use only the supplied data; invent no facts and give no legal or medical advice. State if the supplied sample does not include every filtered report.",
          )}\n\nRespond entirely in ${outputLanguage}.`,
          grounding: JSON.stringify({
            matchingCount: filtered.length,
            includedCount: reportsForAI.length,
            reports: reportsForAI,
          }),
        },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (typeof data?.answer !== "string" || !data.answer.trim()) throw new Error(tx("L’assistant n’a pas fourni de résumé.", "The assistant did not return a summary."))
      setAiSummary(data.answer.trim())
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : tx("Impossible de préparer le résumé IA.", "Could not prepare the AI summary.")
      setAiError(message)
      toast.error(tx("Le résumé IA a échoué.", "AI summary failed."), { description: message })
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <section aria-labelledby="report-summary-title" className="mb-6 rounded-xl border bg-card p-5 sm:p-7">
      <h2 id="report-summary-title" className="text-xl font-semibold">{tx("Filtrer et télécharger mes signalements", "Filter and download my reports")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{tx("Choisissez les signalements à inclure dans votre résumé.", "Choose which reports to include in your summary.")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input type="search" aria-label={tx("Rechercher dans mes signalements", "Search my reports")} placeholder={tx("Titre, numéro ou description", "Title, number, or description")} value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
        <Select aria-label={tx("Filtrer par statut", "Filter by status")} value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
          <option value="">{tx("Tous les statuts", "All statuses")}</option>
          {REPORT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel("report", status, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Filtrer par catégorie", "Filter by category")} value={filters.category} onChange={(event) => setFilter("category", event.target.value)}>
          <option value="">{tx("Toutes les catégories", "All categories")}</option>
          {Object.entries(REPORT_CATEGORY_LABELS).map(([value]) => <option key={value} value={value}>{pickLabel(REPORT_CATEGORY_LABELS, value, locale)}</option>)}
        </Select>
        <Select aria-label={tx("Filtrer par priorité", "Filter by priority")} value={filters.priority} onChange={(event) => setFilter("priority", event.target.value)}>
          <option value="">{tx("Toutes les priorités", "All priorities")}</option>
          {["low", "medium", "high", "critical"].map((priority) => <option key={priority} value={priority}>{statusLabel("priority", priority, locale)}</option>)}
        </Select>
        <Input type="date" aria-label={tx("Date de début", "Start date")} value={filters.from} onChange={(event) => setFilter("from", event.target.value)} />
        <Input type="date" aria-label={tx("Date de fin", "End date")} value={filters.to} onChange={(event) => setFilter("to", event.target.value)} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {tx(filtered.length === 1 ? "signalement correspondant" : "signalements correspondants", filtered.length === 1 ? "matching report" : "matching reports")}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={() => printPdfDocument(tx("Résumé de mes signalements", "My report summary"))}><Printer aria-hidden />{tx("Enregistrer en PDF", "Save as PDF")}</Button>
        <Button type="button" variant="outline" onClick={download}><Download aria-hidden />{tx("Télécharger en texte", "Download as text")}</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tx("Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».", "In the print window, choose “Save as PDF.”")}</p>
      <div className="mt-5 rounded-lg border p-4">
        <h3 className="font-medium">{tx("Améliorer le résumé avec l’IA (facultatif)", "Enhance the summary with AI (optional)")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx(
            "Seules les données des signalements filtrés seront envoyées au fournisseur d’IA configuré. Jusqu’à 50 signalements seront inclus. N’utilisez cette option que si vous acceptez ce partage.",
            "Only filtered report details are sent to the configured AI provider. Up to 50 reports are included. Use this option only if you agree to share that data.",
          )}
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={aiConsent} onChange={(event) => setAiConsent(event.currentTarget.checked)} />
          {tx("Je consens à envoyer ces signalements filtrés au service IA pour créer un résumé.", "I agree to send these filtered reports to the AI service to create a summary.")}
        </label>
        <Button type="button" variant="outline" className="mt-3" disabled={!aiConsent || aiBusy || filtered.length === 0} onClick={() => void enhance()}>
          <Sparkles aria-hidden />{aiBusy ? tx("Résumé en préparation…", "Preparing summary…") : tx("Créer le résumé IA", "Create AI summary")}
        </Button>
        {aiError && <p role="alert" className="mt-3 text-sm text-destructive">{aiError}</p>}
      </div>
      <PdfReportDocument
        title={tx("Résumé de mes signalements", "My report summary")}
        kind={tx("RAPPORT PERSONNEL", "PERSONAL REPORT")}
        generatedAt={generatedAt}
        owner={user?.displayName}
        generatedLabel={tx("Généré le", "Generated")}
        accountLabel={tx("Compte", "Account")}
        footerLabel={tx("Nova Terra · Rapport personnel", "Nova Terra · Personal report")}
      >
        <PdfReportSection title={tx("Vue d’ensemble", "Overview")}>
          <PdfReportFields>
            <PdfReportField label={tx("Signalements correspondants", "Matching reports")}>{filtered.length}</PdfReportField>
            <PdfReportField label={tx("En cours", "Open")}>{filtered.filter((report) => !["resolved", "rejected", "archived"].includes(report.status)).length}</PdfReportField>
            <PdfReportField label={tx("Résolus", "Resolved")}>{filtered.filter((report) => report.status === "resolved").length}</PdfReportField>
            <PdfReportField label={tx("Clôturés / refusés", "Closed / rejected")}>{filtered.filter((report) => ["rejected", "archived"].includes(report.status)).length}</PdfReportField>
            {Object.entries(filters).filter(([, value]) => value).map(([key, value]) => (
              <PdfReportField key={key} label={`${tx("Filtre", "Filter")} · ${filterLabels[key as keyof typeof filters] ?? key}`}>{value}</PdfReportField>
            ))}
          </PdfReportFields>
        </PdfReportSection>
        {aiSummary && (
          <PdfReportSection title={tx("Résumé amélioré avec l’IA", "AI-enhanced summary")}>
            <p className="whitespace-pre-wrap">{aiSummary}</p>
          </PdfReportSection>
        )}
        <PdfReportSection title={tx("Détail des signalements", "Report details")}>
          {filtered.length === 0
            ? <p>{tx("Aucun signalement ne correspond aux filtres.", "No reports match these filters.")}</p>
            : filtered.map((report) => (
              <PdfReportRecord key={report.id} title={`${report.report_number} · ${report.title}`}>
                <PdfReportFields>
                  <PdfReportField label={tx("Statut", "Status")}>{statusLabel("report", report.status, locale)}</PdfReportField>
                  <PdfReportField label={tx("Catégorie", "Category")}>{pickLabel(REPORT_CATEGORY_LABELS, report.category, locale)}</PdfReportField>
                  <PdfReportField label={tx("Priorité", "Priority")}>{statusLabel("priority", report.priority, locale)}</PdfReportField>
                  <PdfReportField label={tx("Date", "Date")}>{new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at))}</PdfReportField>
                  <PdfReportField label={tx("Description", "Description")}>{report.description}</PdfReportField>
                  {report.postponement_reason && <PdfReportField label={tx("Motif du report", "Postponement reason")}>{report.postponement_reason}</PdfReportField>}
                  {report.next_steps && <PdfReportField label={tx("Étapes suivantes", "Next steps")}>{report.next_steps}</PdfReportField>}
                  {(report.required_documents ?? []).length > 0 && <PdfReportField label={tx("Documents requis", "Required documents")}>{report.required_documents?.join(", ")}</PdfReportField>}
                </PdfReportFields>
              </PdfReportRecord>
            ))}
        </PdfReportSection>
      </PdfReportDocument>
    </section>
  )
}
