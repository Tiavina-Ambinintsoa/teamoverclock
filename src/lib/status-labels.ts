import { translatePhrase, type Locale } from "@/lib/locale"

/** Libellés et styles des statuts contrôlés (enums SQL). Utilisés par <StatusBadge> et les filtres. */
export type LabelLocale = Locale
export type BadgeTone = "default" | "secondary" | "destructive" | "outline" | "highlight"

type LabelTable = Record<string, { fr: string; en: string; tone: BadgeTone }>

const TABLES = {
  request: {
    new: { fr: "Nouvelle", en: "New", tone: "highlight" },
    received: { fr: "Reçue", en: "Received", tone: "secondary" },
    to_qualify: { fr: "À qualifier", en: "To qualify", tone: "secondary" },
    assigned: { fr: "Affectée", en: "Assigned", tone: "default" },
    in_progress: { fr: "En cours", en: "In progress", tone: "default" },
    waiting_info: { fr: "En attente d'informations", en: "Waiting for information", tone: "highlight" },
    resolved: { fr: "Résolue", en: "Resolved", tone: "outline" },
    closed: { fr: "Fermée", en: "Closed", tone: "outline" },
    rejected: { fr: "Rejetée", en: "Rejected", tone: "destructive" },
    cancelled: { fr: "Annulée", en: "Cancelled", tone: "outline" },
  },
  report: {
    draft: { fr: "Brouillon", en: "Draft", tone: "outline" },
    received: { fr: "Reçu", en: "Received", tone: "secondary" },
    to_verify: { fr: "À vérifier", en: "To verify", tone: "highlight" },
    validated: { fr: "Validé", en: "Validated", tone: "default" },
    rejected: { fr: "Rejeté", en: "Rejected", tone: "destructive" },
    assigned: { fr: "Affecté", en: "Assigned", tone: "default" },
    in_progress: { fr: "En cours", en: "In progress", tone: "default" },
    resolved: { fr: "Résolu", en: "Resolved", tone: "outline" },
    archived: { fr: "Archivé", en: "Archived", tone: "outline" },
  },
  service: {
    open: { fr: "Ouvert", en: "Open", tone: "default" },
    temporarily_closed: { fr: "Fermé temporairement", en: "Temporarily closed", tone: "highlight" },
    suspended: { fr: "Suspendu", en: "Suspended", tone: "destructive" },
    hidden: { fr: "Masqué", en: "Hidden", tone: "outline" },
  },
  building: {
    operational: { fr: "Opérationnel", en: "Operational", tone: "default" },
    temporarily_closed: { fr: "Fermé temporairement", en: "Temporarily closed", tone: "highlight" },
    under_maintenance: { fr: "En maintenance", en: "Under maintenance", tone: "highlight" },
    restricted: { fr: "Accès restreint", en: "Restricted access", tone: "destructive" },
  },
  priority: {
    low: { fr: "Basse", en: "Low", tone: "outline" },
    medium: { fr: "Moyenne", en: "Medium", tone: "secondary" },
    high: { fr: "Haute", en: "High", tone: "highlight" },
    critical: { fr: "Critique", en: "Critical", tone: "destructive" },
  },
  severity: {
    info: { fr: "Information", en: "Information", tone: "outline" },
    low: { fr: "Faible", en: "Low", tone: "secondary" },
    moderate: { fr: "Modérée", en: "Moderate", tone: "highlight" },
    high: { fr: "Élevée", en: "High", tone: "destructive" },
    extreme: { fr: "Extrême", en: "Extreme", tone: "destructive" },
  },
  importance: {
    normal: { fr: "Normale", en: "Normal", tone: "outline" },
    important: { fr: "Importante", en: "Important", tone: "highlight" },
    urgent: { fr: "Urgente", en: "Urgent", tone: "destructive" },
  },
  kyc: {
    none: { fr: "Non vérifié", en: "Not verified", tone: "outline" },
    pending: { fr: "En cours de vérification", en: "Verification pending", tone: "highlight" },
    verified: { fr: "Identité vérifiée", en: "Identity verified", tone: "default" },
    rejected: { fr: "Vérification refusée", en: "Verification rejected", tone: "destructive" },
  },
  account: {
    pending: { fr: "En attente", en: "Pending", tone: "highlight" },
    active: { fr: "Actif", en: "Active", tone: "default" },
    suspended: { fr: "Suspendu", en: "Suspended", tone: "destructive" },
    disabled: { fr: "Désactivé", en: "Disabled", tone: "outline" },
  },
  role: {
    citizen: { fr: "Citoyen", en: "Citizen", tone: "outline" },
    agent: { fr: "Agent municipal", en: "Municipal agent", tone: "secondary" },
    service_admin: { fr: "Admin de service", en: "Service admin", tone: "default" },
    general_admin: { fr: "Admin général", en: "General admin", tone: "highlight" },
    system: { fr: "Système", en: "System", tone: "outline" },
  },
  validation: {
    pending: { fr: "En attente", en: "Pending", tone: "highlight" },
    validated: { fr: "Validé", en: "Validated", tone: "default" },
    rejected: { fr: "Rejeté", en: "Rejected", tone: "destructive" },
  },
  sync: {
    running: { fr: "En cours", en: "Running", tone: "secondary" },
    success: { fr: "Réussie", en: "Success", tone: "default" },
    partial: { fr: "Partielle", en: "Partial", tone: "highlight" },
    failed: { fr: "Échec", en: "Failed", tone: "destructive" },
  },
  news: {
    draft: { fr: "Brouillon", en: "Draft", tone: "outline" },
    pending_review: { fr: "En relecture", en: "Pending review", tone: "highlight" },
    published: { fr: "Publiée", en: "Published", tone: "default" },
    archived: { fr: "Archivée", en: "Archived", tone: "outline" },
  },
  danger: {
    draft: { fr: "Brouillon", en: "Draft", tone: "outline" },
    active: { fr: "Active", en: "Active", tone: "destructive" },
    archived: { fr: "Archivée", en: "Archived", tone: "outline" },
  },
} satisfies Record<string, LabelTable>

export type StatusKind = keyof typeof TABLES

export const REQUEST_STATUSES = Object.keys(TABLES.request)
export const REPORT_STATUSES = Object.keys(TABLES.report)

export function statusLabel(kind: StatusKind, value: string, locale: LabelLocale = "fr"): string {
  const table: LabelTable = TABLES[kind]
  const label = table[value]
  if (!label) return value
  return locale === "fr" ? label.fr : locale === "en" ? label.en : translatePhrase(locale, label.en)
}

export function statusTone(kind: StatusKind, value: string): BadgeTone {
  const table: LabelTable = TABLES[kind]
  return table[value]?.tone ?? "outline"
}

/** Types de bâtiment, catégories de signalement et autres listes affichées dans les filtres. */
export const BUILDING_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  administrative: { fr: "Administration", en: "Administration" },
  residential: { fr: "Résidentiel", en: "Residential" },
  hospital: { fr: "Hôpital", en: "Hospital" },
  school: { fr: "École", en: "School" },
  security: { fr: "Sécurité", en: "Security" },
  industrial: { fr: "Industrie", en: "Industrial" },
  energy: { fr: "Énergie", en: "Energy" },
  telecom: { fr: "Télécoms", en: "Telecom" },
  public_place: { fr: "Lieu public", en: "Public place" },
  transport_hub: { fr: "Hub de transport", en: "Transport hub" },
}

export const FACILITY_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  hospital: { fr: "Hôpital", en: "Hospital" },
  pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
  dentist: { fr: "Dentiste", en: "Dentist" },
  clinic: { fr: "Clinique", en: "Clinic" },
  care_center: { fr: "Centre de soins", en: "Care center" },
  administrative_office: { fr: "Bureau administratif", en: "Administrative office" },
  police_station: { fr: "Commissariat", en: "Police station" },
  fire_station: { fr: "Caserne", en: "Fire station" },
  service_center: { fr: "Centre de service", en: "Service center" },
  utility_center: { fr: "Centre des réseaux", en: "Utility center" },
  mobility_hub: { fr: "Pôle de mobilité", en: "Mobility hub" },
  environment_center: { fr: "Centre environnemental", en: "Environment center" },
  school: { fr: "Établissement scolaire", en: "School" },
  other: { fr: "Autre établissement", en: "Other facility" },
}

export const TRANSPORT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  hover_tram: { fr: "Tram en lévitation", en: "Hover tram" },
  maglev: { fr: "Maglev", en: "Maglev" },
  sky_pod: { fr: "Sky-pod", en: "Sky pod" },
  shuttle: { fr: "Navette", en: "Shuttle" },
  drone_taxi: { fr: "Drone-taxi", en: "Drone taxi" },
  cargo_drone: { fr: "Drone cargo", en: "Cargo drone" },
  personal_hoverbike: { fr: "Hoverbike", en: "Hoverbike" },
  ferry: { fr: "Ferry céleste", en: "Sky ferry" },
  aethelon_apex: { fr: "Aethelon Apex (voiture)", en: "Aethelon Apex (car)" },
  vortex_phantom: { fr: "Vortex Phantom (moto)", en: "Vortex Phantom (motorcycle)" },
}

export const REPORT_CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  infrastructure: { fr: "Infrastructure", en: "Infrastructure" },
  safety: { fr: "Sécurité", en: "Safety" },
  health: { fr: "Santé", en: "Health" },
  environment: { fr: "Environnement", en: "Environment" },
  transport: { fr: "Transport", en: "Transport" },
  noise: { fr: "Nuisances sonores", en: "Noise" },
  other: { fr: "Autre", en: "Other" },
}

export function pickLabel(table: Record<string, { fr: string; en: string }>, value: string, locale: LabelLocale = "fr"): string {
  const label = table[value]
  if (!label) return value
  return locale === "fr" ? label.fr : locale === "en" ? label.en : translatePhrase(locale, label.en)
}
