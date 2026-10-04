import { useState } from "react"
import { FileDown, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PdfReportDocument, PdfReportRecord, PdfReportSection, PdfReportValue, printPdfDocument } from "@/components/pdf-report"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const PAGE_SIZE = 500
const exportDate = () => new Date().toISOString()
const exportFileDate = () => new Date().toISOString().slice(0, 10)

type ExportOptions = {
  identity: boolean
  requests: boolean
  reports: boolean
  appointments: boolean
  notifications: boolean
  health: boolean
  civicActivity: boolean
}

type AccountIdentity = {
  id: string
  email: string
  displayName: string
  locale: string
}

type PageQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

async function readAllRows<T>(queryPage: (from: number, to: number) => PageQuery<T>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await queryPage(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

async function readSingle<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function collectPersonalData(
  client: NonNullable<typeof supabase>,
  account: AccountIdentity,
  citizenId: string | null,
  options: ExportOptions,
) {
  const sections: Record<string, unknown> = {}
  const jobs: Promise<void>[] = []

  if (options.identity) {
    jobs.push((async () => {
      const [profile, citizen] = await Promise.all([
        readSingle(client.from("profiles").select("*").eq("id", account.id).maybeSingle()),
        readSingle(client.from("citizens").select("*").eq("profile_id", account.id).maybeSingle()),
      ])
      sections.identity = { account, profile, citizen }
    })())
  }
  if (options.requests) {
    jobs.push((async () => {
      sections.requests = await readAllRows((from, to) =>
        client.from("requests").select("*").eq("requester_id", account.id)
          .order("created_at", { ascending: false }).range(from, to))
    })())
  }
  if (options.reports) {
    jobs.push((async () => {
      sections.reports = citizenId
        ? await readAllRows((from, to) =>
          client.from("reports").select("*").eq("reporter_citizen_id", citizenId)
            .order("created_at", { ascending: false }).range(from, to))
        : []
    })())
  }
  if (options.appointments) {
    jobs.push((async () => {
      sections.appointments = await readAllRows((from, to) =>
        client.from("service_appointments").select("*").eq("profile_id", account.id)
          .order("starts_at", { ascending: false }).range(from, to))
    })())
  }
  if (options.notifications) {
    jobs.push((async () => {
      sections.notifications = await readAllRows((from, to) =>
        client.from("notifications").select("*").eq("user_id", account.id)
          .order("created_at", { ascending: false }).range(from, to))
    })())
  }
  if (options.health) {
    jobs.push((async () => {
      sections.health = await readSingle(
        client.from("citizen_health_profiles").select("*").eq("profile_id", account.id).maybeSingle(),
      )
    })())
  }
  if (options.civicActivity) {
    jobs.push((async () => {
      if (!citizenId) {
        sections.civicActivity = { projectVotes: [], reportUpvotes: [], projectComments: [] }
        return
      }
      const [projectVotes, reportUpvotes, projectComments] = await Promise.all([
        readAllRows((from, to) =>
          client.from("city_project_votes").select("project_id,support").eq("citizen_id", citizenId)
            .range(from, to)),
        readAllRows((from, to) =>
          client.from("report_upvotes").select("report_id").eq("citizen_id", citizenId)
            .range(from, to)),
        readAllRows((from, to) =>
          client.rpc("my_city_project_comments", { p_offset: from, p_limit: to - from + 1 })),
      ])
      sections.civicActivity = { projectVotes, reportUpvotes, projectComments }
    })())
  }

  await Promise.all(jobs)
  return {
    exportedAt: exportDate(),
    application: "Nova Terra",
    sections,
  }
}

const INITIAL_OPTIONS: ExportOptions = {
  identity: true,
  requests: true,
  reports: true,
  appointments: true,
  notifications: true,
  health: true,
  civicActivity: true,
}

export function PersonalDataExport() {
  const { user, backend } = useAuth()
  const { tx, tag } = useLocale()
  const [options, setOptions] = useState(INITIAL_OPTIONS)
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof collectPersonalData>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const prepare = async () => {
    if (!supabase || !user || user.isDemo) {
      setError(tx("L’export est disponible pour les comptes connectés à Supabase.", "Export is available for Supabase accounts."))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await collectPersonalData(
        supabase,
        { id: user.id, email: user.email, displayName: user.displayName, locale: user.locale },
        user.citizenId,
        options,
      )
      setSnapshot(data)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : tx("Une erreur empêche de préparer l’export.", "Could not prepare your export.")
      setError(message)
      toast.error(tx("Impossible de préparer vos données.", "Could not prepare your data."), { description: message })
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    if (!snapshot) return
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `nova-terra-personal-data-${exportFileDate()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const choices: { key: keyof ExportOptions; id: string; fr: string; en: string }[] = [
    { key: "identity", id: "export-identity", fr: "Profil et identité", en: "Profile and identity" },
    { key: "requests", id: "export-requests", fr: "Demandes de service", en: "Service requests" },
    { key: "reports", id: "export-reports", fr: "Signalements", en: "Reports" },
    { key: "appointments", id: "export-appointments", fr: "Rendez-vous", en: "Appointments" },
    { key: "notifications", id: "export-notifications", fr: "Notifications", en: "Notifications" },
    { key: "health", id: "export-health", fr: "Informations de santé facultatives", en: "Optional health information" },
    { key: "civicActivity", id: "export-civic", fr: "Votes et contributions aux projets", en: "Project votes and comments" },
  ]

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 className="font-semibold">{tx("Mes données personnelles", "My personal data")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tx(
          "Préparez une copie lisible de vos informations. Choisissez les rubriques, puis enregistrez le rapport en PDF ou téléchargez les données JSON.",
          "Prepare a readable copy of your information. Choose the sections, then save the report as PDF or download the JSON data.",
        )}
      </p>
      <p className="mt-2 rounded-md border border-highlight/50 bg-highlight/10 p-3 text-sm">
        {tx(
          "Le fichier peut contenir des informations privées, y compris des données de santé si cette rubrique est cochée. Conservez-le dans un endroit sûr.",
          "The file may contain private information, including health data if selected. Keep it somewhere safe.",
        )}
      </p>
      {backend === "local" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {tx("Le compte de démonstration n’est pas enregistré sur un serveur. Connectez-vous avec un compte Supabase pour préparer un export.", "Demo accounts are not stored on a server. Sign in with a Supabase account to prepare an export.")}
        </p>
      ) : (
        <>
          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">{tx("Rubriques à inclure", "Sections to include")}</legend>
            {choices.map((choice) => (
              <label key={choice.key} htmlFor={choice.id} className="flex items-start gap-2 text-sm">
                <input
                  id={choice.id}
                  type="checkbox"
                  checked={options[choice.key]}
                  onChange={(event) => {
                    setOptions((current) => ({ ...current, [choice.key]: event.currentTarget.checked }))
                    setSnapshot(null)
                  }}
                  className="mt-0.5 size-4 accent-primary"
                />
                {tx(choice.fr, choice.en)}
              </label>
            ))}
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void prepare()} disabled={busy}>
              {busy ? tx("Préparation…", "Preparing…") : tx("Préparer mes données", "Prepare my data")}
            </Button>
            <Button type="button" variant="outline" onClick={download} disabled={!snapshot}>
              <FileDown aria-hidden />{tx("Télécharger JSON", "Download JSON")}
            </Button>
            <Button type="button" variant="outline" onClick={() => printPdfDocument(tx("Rapport de mes données personnelles", "My personal data report"))} disabled={!snapshot}>
              <Printer aria-hidden />{tx("Enregistrer en PDF", "Save as PDF")}
            </Button>
          </div>
          {snapshot && <p className="mt-2 text-xs text-muted-foreground">{tx("Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».", "In the print window, choose “Save as PDF.”")}</p>}
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          {snapshot && (
            <PdfReportDocument
              title={tx("Rapport de mes données personnelles", "My personal data report")}
              kind={tx("RAPPORT PERSONNEL", "PERSONAL DATA REPORT")}
              generatedAt={new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" }).format(new Date(snapshot.exportedAt))}
              owner={user ? `${user.displayName} · ${user.email}` : undefined}
              generatedLabel={tx("Généré le", "Generated")}
              accountLabel={tx("Compte", "Account")}
              footerLabel={tx("Nova Terra · Données confidentielles", "Nova Terra · Confidential data")}
            >
              <PdfReportSection title={tx("Confidentialité", "Privacy")}>
                <p>{tx(
                  "Ce document contient les données personnelles sélectionnées par le titulaire du compte. Conservez-le en lieu sûr et ne le partagez qu’avec des personnes de confiance.",
                  "This document contains personal data selected by the account holder. Store it securely and share it only with trusted people.",
                )}</p>
              </PdfReportSection>
              {Object.entries(snapshot.sections).map(([section, value]) => {
                const choice = choices.find((item) => item.key === section)
                return <PdfReportSection key={section} title={choice ? tx(choice.fr, choice.en) : section}>
                  {Array.isArray(value)
                    ? value.length > 0
                      ? value.map((record, index) => (
                        <PdfReportRecord key={index} title={`${tx("Enregistrement", "Record")} ${index + 1}`}>
                          <PdfReportValue value={record} />
                        </PdfReportRecord>
                      ))
                      : <p>{tx("Aucune donnée dans cette rubrique.", "No data in this section.")}</p>
                    : <PdfReportValue value={value} />}
                </PdfReportSection>
              })}
            </PdfReportDocument>
          )}
        </>
      )}
    </section>
  )
}
