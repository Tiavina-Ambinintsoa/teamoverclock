import type { ReactNode } from "react"

import { useLocale, type Locale } from "@/lib/locale"
import { cn } from "@/lib/utils"

export function printPdfDocument(title: string) {
  const originalTitle = document.title
  document.title = title
  document.body.classList.add("printing-pdf-report")
  const finish = () => {
    document.body.classList.remove("printing-pdf-report")
    document.title = originalTitle
  }
  window.addEventListener("afterprint", finish, { once: true })
  try {
    window.print()
  } catch (error) {
    window.removeEventListener("afterprint", finish)
    finish()
    throw error
  }
}

type PdfReportDocumentProps = {
  title: string
  kind: string
  generatedAt: string
  owner?: string
  generatedLabel?: string
  accountLabel?: string
  footerLabel?: string
  children: ReactNode
}

export function PdfReportDocument({
  title,
  kind,
  generatedAt,
  owner,
  generatedLabel,
  accountLabel,
  footerLabel,
  children,
}: PdfReportDocumentProps) {
  const { tx } = useLocale()
  return (
    <article className="pdf-document" aria-label={title}>
      <header className="pdf-report-header">
        <p className="pdf-report-brand">NOVA TERRA · {kind}</p>
        <h1>{title}</h1>
        <dl className="pdf-report-meta">
          <div><dt>{generatedLabel ?? tx("Généré", "Generated")}</dt><dd>{generatedAt}</dd></div>
          {owner && <div><dt>{accountLabel ?? tx("Compte", "Account")}</dt><dd>{owner}</dd></div>}
        </dl>
      </header>
      <div className="pdf-report-content">{children}</div>
      <footer className="pdf-report-footer">
        <span>{footerLabel ?? tx("Nova Terra · Rapport de données personnelles", "Nova Terra · Personal data report")}</span>
        <span className="pdf-report-page-number" />
      </footer>
    </article>
  )
}

export function PdfReportSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("pdf-report-section", className)}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function PdfReportRecord({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pdf-report-record">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function PdfReportFields({ children }: { children: ReactNode }) {
  return <dl className="pdf-report-fields">{children}</dl>
}

export function PdfReportField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pdf-report-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const FIELD_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  id: { fr: "Identifiant", en: "ID", mg: "Laharana", mfe: "ID", rcf: "ID", "x-nova": "Nexa-ID" },
  title: { fr: "Titre", en: "Title", mg: "Lohateny", mfe: "Tit", rcf: "Tit", "x-nova": "Nexa-title" },
  description: { fr: "Description", en: "Description", mg: "Famaritana", mfe: "Deskripsion", rcf: "Deskripsyon", "x-nova": "Nexa-description" },
  category: { fr: "Catégorie", en: "Category", mg: "Sokajy", mfe: "Kategori", rcf: "Kategori", "x-nova": "Nexa-category" },
  status: { fr: "Statut", en: "Status", mg: "Sata", mfe: "Stati", rcf: "Stati", "x-nova": "Nexa-status" },
  created_at: { fr: "Créé le", en: "Created at", mg: "Noforonina tamin'ny", mfe: "Kree le", rcf: "Kréé le", "x-nova": "Nexa-created-at" },
  updated_at: { fr: "Mis à jour le", en: "Updated at", mg: "Nohavaozina tamin'ny", mfe: "Miz-a-jour le", rcf: "Miz-a-jour le", "x-nova": "Nexa-updated-at" },
  first_name: { fr: "Prénom", en: "First name", mg: "Anarana", mfe: "Prenom", rcf: "Prenom", "x-nova": "Nexa-first-name" },
  last_name: { fr: "Nom", en: "Last name", mg: "Fanampin'anarana", mfe: "Nom fami", rcf: "Nom fami", "x-nova": "Nexa-last-name" },
  display_name: { fr: "Nom affiché", en: "Display name", mg: "Anarana aseho", mfe: "Nom afiche", rcf: "Nom afiché", "x-nova": "Nexa-display-name" },
  email: { fr: "Adresse e-mail", en: "Email", mg: "Adiresy mailaka", mfe: "Email", rcf: "Email", "x-nova": "Nexa-email" },
  phone: { fr: "Téléphone", en: "Phone", mg: "Finday", mfe: "Telefonn", rcf: "Telefonn", "x-nova": "Nexa-phone" },
  address: { fr: "Adresse", en: "Address", mg: "Adiresy", mfe: "Adrès", rcf: "Adrès", "x-nova": "Nexa-address" },
  locale: { fr: "Langue", en: "Language", mg: "Fiteny", mfe: "Langaz", rcf: "Langaz", "x-nova": "Nexa-language" },
  is_anonymous: { fr: "Anonyme", en: "Anonymous", mg: "Tsy mitonona anarana", mfe: "Anonim", rcf: "Anonim", "x-nova": "Nexa-anonymous" },
  is_verified: { fr: "Vérifié", en: "Verified", mg: "Voamarina", mfe: "Verifie", rcf: "Verifié", "x-nova": "Nexa-verified" },
  service_id: { fr: "Service", en: "Service", mg: "Serivisy", mfe: "Servis", rcf: "Servis", "x-nova": "Nexa-service" },
  appointment_at: { fr: "Rendez-vous le", en: "Appointment at", mg: "Fotoana voatondro", mfe: "Randevou le", rcf: "Rendez-vous le", "x-nova": "Nexa-appointment-at" },
  priority: { fr: "Priorité", en: "Priority", mg: "Laharam-pahamehana", mfe: "Priorite", rcf: "Priorité", "x-nova": "Nexa-priority" },
  votes: { fr: "Votes", en: "Votes", mg: "Latsa-bato", mfe: "Vote", rcf: "Vote", "x-nova": "Nexa-votes" },
}

const ENUM_VALUES: Record<string, Partial<Record<Locale, string>>> = {
  pending: { fr: "En attente", en: "Pending", mg: "Miandry", mfe: "An-atandan", rcf: "An atandan", "x-nova": "Nexa-pending" },
  in_progress: { fr: "En cours", en: "In progress", mg: "Eo am-panatanterahana", mfe: "Pe fer", rcf: "An kour", "x-nova": "Nexa-active" },
  in_review: { fr: "En vérification", en: "In review", mg: "Eo am-panamarinana", mfe: "Pe verifie", rcf: "An verifikasyon", "x-nova": "Nexa-review" },
  resolved: { fr: "Résolu", en: "Resolved", mg: "Voavaha", mfe: "Rezoud", rcf: "Rezoud", "x-nova": "Nexa-resolved" },
  closed: { fr: "Fermé", en: "Closed", mg: "Mihidy", mfe: "Feme", rcf: "Fermé", "x-nova": "Nexa-closed" },
  open: { fr: "Ouvert", en: "Open", mg: "Misokatra", mfe: "Ouver", rcf: "Ouver", "x-nova": "Nexa-open" },
  approved: { fr: "Approuvé", en: "Approved", mg: "Nankatoavina", mfe: "Approuve", rcf: "Approuvé", "x-nova": "Nexa-approved" },
  rejected: { fr: "Refusé", en: "Rejected", mg: "Nolavina", mfe: "Rezete", rcf: "Rejeté", "x-nova": "Nexa-rejected" },
  cancelled: { fr: "Annulé", en: "Cancelled", mg: "Nofoanana", mfe: "Anile", rcf: "Anulé", "x-nova": "Nexa-cancelled" },
  submitted: { fr: "Envoyé", en: "Submitted", mg: "Nalefa", mfe: "Avoye", rcf: "Avoyé", "x-nova": "Nexa-sent" },
}

function readableKey(key: string, locale: Locale) {
  return FIELD_NAMES[key.toLowerCase()]?.[locale]
    ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function printableDate(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function PdfReportValue({ value }: { value: unknown }) {
  const { locale, tag, tx } = useLocale()
  if (value === null || value === undefined || value === "") return <span>—</span>
  if (typeof value === "boolean") return <span>{value ? tx("Oui", "Yes") : tx("Non", "No")}</span>
  if (typeof value === "number") return <span>{value}</span>
  if (typeof value === "string") {
    const enumValue = ENUM_VALUES[value.toLowerCase().replace(/[\s-]+/g, "_")]?.[locale]
    return <span className="pdf-report-value">{/^\d{4}-\d\d-\d\dT/.test(value) ? printableDate(value, tag) : enumValue ?? value}</span>
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span>—</span>
    return (
      <ul className="pdf-report-list">
        {value.map((item, index) => <li key={index}><PdfReportValue value={item} /></li>)}
      </ul>
    )
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (!entries.length) return <span>—</span>
    return (
      <dl className="pdf-report-fields pdf-report-nested">
        {entries.map(([key, child]) => (
          <PdfReportField key={key} label={readableKey(key, locale)}><PdfReportValue value={child} /></PdfReportField>
        ))}
      </dl>
    )
  }
  return <span>{String(value)}</span>
}
