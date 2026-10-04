import type { BuildingStatus, FacilityType, ReportCategory } from "@/lib/db-types"

export type RouterLocale = "fr" | "en"

export interface RouterServiceFacts {
  id?: string
  slug: string
  name: string
  category: string
  description: string | null
  phone: string | null
  opening_hours: Record<string, string>
  status: string
  is_emergency: boolean
}

export interface ChatBuilding {
  id: string
  name: string
  address: string | null
  sector_id: string
  service_id?: string | null
  facility_type?: FacilityType | null
  offerings?: string[]
  phone?: string | null
  opening_hours?: Record<string, string>
  status?: BuildingStatus
  description?: string | null
}

export interface RouteSource {
  type: string
  title: string
  url: string
}

export type RoutePendingAction =
  | { type: "create_report"; draft: { title: string; description: string; category: ReportCategory } }
  | { type: "create_request"; draft: { serviceSlug: string | null; subject: string; description: string } }

export interface RoutedReply {
  intent: "emergency" | "create_request" | "create_report" | "info"
  kind: "normal" | "emergency"
  content: string
  sources: RouteSource[]
  confidence: number
  pendingAction?: RoutePendingAction
}

export interface IntentRouteContext {
  text: string
  locale: RouterLocale
  services: RouterServiceFacts[]
  buildings?: ChatBuilding[]
}

interface KeywordRule {
  id: string
  keywords: string[]
}

interface HealthRule extends KeywordRule {
  urgency: "emergency" | "urgent" | "mild"
  reason: { fr: string; en: string }
}

interface AdminRule extends KeywordRule {
  serviceSlugs: string[]
  subject: { fr: string; en: string }
  reason: { fr: string; en: string }
}

interface ReportRule extends KeywordRule {
  category: ReportCategory
  serviceSlugs: string[]
  subject: { fr: string; en: string }
  reason: { fr: string; en: string }
}

const EMERGENCY_NUMBERS = [
  { fr: "Urgences médicales", en: "Medical emergency", phone: "+999 115 0004" },
  { fr: "Police", en: "Police", phone: "+999 112 0002" },
  { fr: "Pompiers", en: "Fire & Rescue", phone: "+999 118 0003" },
]

const HEALTH_RULES: HealthRule[] = [
  {
    id: "cardio-respiratory",
    keywords: ["chest pain", "douleur thoracique", "douleur poitrine", "breathing", "cannot breathe", "shortness of breath", "respirer", "respiration", "essoufflement"],
    urgency: "emergency",
    reason: {
      fr: "ces symptômes peuvent nécessiter une prise en charge immédiate",
      en: "these symptoms may require immediate care",
    },
  },
  {
    id: "bleeding-burn",
    keywords: ["bleeding", "heavy bleeding", "saignement", "hemorragie", "hémorragie", "burn", "severe burn", "brulure", "brûlure"],
    urgency: "emergency",
    reason: {
      fr: "il faut d'abord sécuriser la personne et joindre les urgences",
      en: "the person should be secured and emergency care contacted first",
    },
  },
  {
    id: "fracture-sprain",
    keywords: ["ankle", "cheville", "sprain", "sprained", "entorse", "fracture", "broken bone", "osseux"],
    urgency: "urgent",
    reason: {
      fr: "une évaluation médicale rapide est recommandée pour écarter une fracture ou une lésion sévère",
      en: "prompt medical assessment is recommended to rule out a fracture or severe injury",
    },
  },
  {
    id: "fever",
    keywords: ["fever", "fievre", "fièvre", "temperature", "infection", "sick", "malade"],
    urgency: "mild",
    reason: {
      fr: "une consultation de proximité ou un avis pharmaceutique est souvent le bon premier niveau",
      en: "a local clinic or pharmacy is often the right first step",
    },
  },
]

const ADMIN_RULES: AdminRule[] = [
  {
    id: "building-permit",
    keywords: ["building permit", "construction permit", "permis de construire", "urbanisme", "travaux", "building folder"],
    serviceSlugs: ["urban-planning", "citizen-relations"],
    subject: { fr: "Permis de construire", en: "Building permit" },
    reason: {
      fr: "ce service gère les permis, les plans et les autorisations d'aménagement",
      en: "this service handles permits, plans and development authorizations",
    },
  },
  {
    id: "birth-certificate",
    keywords: ["birth certificate", "acte de naissance", "naissance"],
    serviceSlugs: ["citizen-relations"],
    subject: { fr: "Acte de naissance", en: "Birth certificate" },
    reason: {
      fr: "les démarches d'état civil passent par les Relations citoyennes",
      en: "civil-status procedures are routed through Citizen Relations",
    },
  },
  {
    id: "residence-proof",
    keywords: ["proof of residence", "residence proof", "attestation de residence", "attestation de résidence", "justificatif de domicile", "proof of address"],
    serviceSlugs: ["citizen-relations"],
    subject: { fr: "Attestation de résidence", en: "Residence proof" },
    reason: {
      fr: "les attestations administratives sont centralisées à ce guichet",
      en: "administrative attestations are centralized at this desk",
    },
  },
  {
    id: "business-license",
    keywords: ["business license", "trade license", "licence commerciale", "autorisation commerce", "ouvrir un commerce"],
    serviceSlugs: ["citizen-relations", "urban-planning"],
    subject: { fr: "Licence commerciale", en: "Business license" },
    reason: {
      fr: "ce guichet oriente les dossiers professionnels et les autorisations liées aux locaux",
      en: "this desk routes business files and premises-related authorizations",
    },
  },
  {
    id: "identity-card",
    keywords: ["identity card", "id card", "carte identite", "carte d identite", "piece d identite", "pièce d'identité", "cin"],
    serviceSlugs: ["citizen-relations"],
    subject: { fr: "Pièce d'identité", en: "Identity document" },
    reason: {
      fr: "les pièces d'identité et justificatifs personnels y sont traités",
      en: "identity and personal supporting documents are handled there",
    },
  },
  {
    id: "tax",
    keywords: ["tax", "taxe", "impot", "impôt", "fiscal"],
    serviceSlugs: ["citizen-relations"],
    subject: { fr: "Question fiscale", en: "Tax question" },
    reason: {
      fr: "ce service peut enregistrer la demande et orienter vers le bon circuit administratif",
      en: "this service can register the request and route it to the proper administrative channel",
    },
  },
  {
    id: "transport-card",
    keywords: ["transport card", "travel card", "transport pass", "carte transport", "pass transport", "bus card"],
    serviceSlugs: ["transport-authority"],
    subject: { fr: "Carte de transport", en: "Transport card" },
    reason: {
      fr: "la billetterie et les titres de transport relèvent de l'autorité de mobilité",
      en: "ticketing and travel passes belong to the mobility authority",
    },
  },
  {
    id: "waste-request",
    keywords: ["waste collection", "garbage", "trash", "collecte dechets", "collecte déchets", "ordures menageres", "ordures ménagères"],
    serviceSlugs: ["environment-waste"],
    subject: { fr: "Collecte des déchets", en: "Waste collection" },
    reason: {
      fr: "ce service gère les déchets, le tri et les nuisances liées à la propreté",
      en: "this service handles waste, sorting and cleanliness-related issues",
    },
  },
  {
    id: "complaint",
    keywords: ["complaint", "reclamation", "réclamation", "plainte administrative", "service complaint"],
    serviceSlugs: ["citizen-relations", "nova-police"],
    subject: { fr: "Réclamation", en: "Complaint" },
    reason: {
      fr: "les Relations citoyennes peuvent enregistrer une réclamation et l'orienter",
      en: "Citizen Relations can register a complaint and route it",
    },
  },
]

const REPORT_RULES: ReportRule[] = [
  {
    id: "pothole",
    keywords: ["pothole", "nid de poule", "road damage", "chaussée", "trou route"],
    category: "infrastructure",
    serviceSlugs: ["public-works"],
    subject: { fr: "Signalement de voirie", en: "Road report" },
    reason: {
      fr: "la voirie et les réparations de chaussée relèvent des travaux publics",
      en: "roads and pavement repairs are handled by public works",
    },
  },
  {
    id: "streetlight",
    keywords: ["streetlight", "lampadaire", "public light", "eclairage public", "éclairage public"],
    category: "infrastructure",
    serviceSlugs: ["public-works"],
    subject: { fr: "Lampadaire défectueux", en: "Broken streetlight" },
    reason: {
      fr: "l'éclairage public dépend des travaux publics",
      en: "public lighting is handled by public works",
    },
  },
  {
    id: "flooding",
    keywords: ["flood", "flooding", "inondation", "water leak", "eau partout", "submersion"],
    category: "infrastructure",
    serviceSlugs: ["public-works", "energy-water"],
    subject: { fr: "Inondation locale", en: "Local flooding" },
    reason: {
      fr: "les équipes travaux et réseau peuvent traiter l'écoulement ou l'ouvrage défaillant",
      en: "public works and network teams can address the flow or failing infrastructure",
    },
  },
  {
    id: "noise",
    keywords: ["noise", "bruit", "tapage", "loud music", "musique forte"],
    category: "noise",
    serviceSlugs: ["nova-police"],
    subject: { fr: "Nuisance sonore", en: "Noise complaint" },
    reason: {
      fr: "les nuisances sonores urgentes sont généralement prises en charge par la police",
      en: "urgent noise nuisances are usually handled by the police",
    },
  },
  {
    id: "waste",
    keywords: ["illegal dumping", "dumping", "waste", "trash", "garbage", "depot sauvage", "dépôt sauvage", "ordures"],
    category: "environment",
    serviceSlugs: ["environment-waste"],
    subject: { fr: "Dépôt sauvage", en: "Illegal dumping" },
    reason: {
      fr: "la propreté urbaine et les dépôts sauvages relèvent du service environnement",
      en: "urban cleanliness and illegal dumping belong to the environment service",
    },
  },
]

const STOPWORDS = new Set([
  "a", "an", "and", "the", "i", "me", "my", "need", "please", "there", "is", "it", "to", "for", "of", "on",
  "je", "j", "ai", "un", "une", "le", "la", "les", "de", "des", "du", "pour", "il", "y", "a", "est", "et",
])

const GENERIC_ADMIN_HINTS = ["document", "documents", "paper", "paperwork", "folder", "dossier", "administratif", "administrative", "certificate", "certificat"]

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 3
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[a.length][b.length]
}

function matchesTerm(term: string, text: string, tokens: string[]): boolean {
  const normalized = normalizeText(term)
  if (!normalized) return false
  if (text.includes(normalized)) return true
  const words = normalized.split(" ")
  return words.every((word) =>
    tokens.some((token) =>
      token === word
      || token.startsWith(word)
      || (word.length >= 5 && levenshtein(token, word) <= 1)
      || (word.length >= 8 && levenshtein(token, word) <= 2),
    ),
  )
}

function scoreRule(rule: KeywordRule, text: string, tokens: string[]): number {
  return rule.keywords.reduce((score, keyword) => score + (matchesTerm(keyword, text, tokens) ? 1 : 0), 0)
}

function clip(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

function formatHours(hours: Record<string, string> | undefined): string | null {
  if (!hours) return null
  const entries = Object.entries(hours)
  return entries.length ? entries.map(([day, value]) => `${day} ${value}`).join(", ") : null
}

function findService(services: RouterServiceFacts[], slugs: string[]): RouterServiceFacts | null {
  for (const slug of slugs) {
    const match = services.find((service) => service.slug === slug)
    if (match) return match
  }
  return null
}

function formatServiceState(service: RouterServiceFacts, locale: RouterLocale): string {
  if (service.status === "open") {
    return locale === "en" ? "Current availability: open." : "Disponibilité actuelle : ouvert."
  }
  return locale === "en"
    ? `Current availability: ${service.status}.`
    : `Disponibilité actuelle : ${service.status}.`
}

function findHealthLocation(context: IntentRouteContext, urgency: HealthRule["urgency"]): { building: ChatBuilding | null; service: RouterServiceFacts | null } {
  const services = context.services.filter((service) =>
    service.category === "health"
    || service.is_emergency
    || /(health|medical|hospital|clinic|pharmacy|urgence|urgent|soin|sante|santé)/.test(normalizeText(`${service.name} ${service.description ?? ""}`)),
  )
  const buildings = (context.buildings ?? []).filter((building) =>
    ["hospital", "clinic", "care_center", "pharmacy", "dentist"].includes(building.facility_type ?? "")
    || /(hospital|clinic|care|pharmacy|dentist|hopital|hôpital|medical|sante|santé)/.test(normalizeText(`${building.name} ${building.description ?? ""} ${(building.offerings ?? []).join(" ")}`)),
  )

  const serviceById = new Map(context.services.filter((service) => service.id).map((service) => [service.id as string, service]))
  const buildingPriority = urgency === "mild"
    ? ["pharmacy", "clinic", "care_center", "hospital", "dentist"]
    : ["hospital", "clinic", "care_center", "pharmacy", "dentist"]

  for (const facilityType of buildingPriority) {
    const building = buildings.find((item) => item.facility_type === facilityType)
    if (building) {
      return {
        building,
        service: building.service_id ? (serviceById.get(building.service_id) ?? null) : services[0] ?? null,
      }
    }
  }

  const service = urgency === "emergency"
    ? services.find((item) => item.is_emergency || item.category === "health") ?? services[0] ?? null
    : services.find((item) => item.category === "health" && !item.is_emergency)
      ?? services.find((item) => item.category === "health")
      ?? services[0]
      ?? null

  return { building: null, service }
}

function buildClarifyingReply(locale: RouterLocale): RoutedReply {
  return {
    intent: "info",
    kind: "normal",
    confidence: 0.45,
    sources: [],
    content: locale === "en"
      ? "Could you clarify what you need? For example: a building permit, a birth certificate, a transport card, or a specific issue to report."
      : "Pouvez-vous préciser votre besoin ? Par exemple : permis de construire, acte de naissance, carte de transport ou problème précis à signaler.",
  }
}

function buildHealthReply(context: IntentRouteContext, rule: HealthRule): RoutedReply | null {
  const { building, service } = findHealthLocation(context, rule.urgency)
  if (!building && !service) return null

  const locale = context.locale
  const sources: RouteSource[] = []
  if (service) sources.push({ type: "service", title: service.name, url: `/services/${service.slug}` })
  if (building) sources.push({ type: "facility", title: building.name, url: `/map?q=${encodeURIComponent(building.name)}` })

  const contactLine = service?.phone
    ? locale === "en"
      ? `Contact: ${service.phone}.`
      : `Contact : ${service.phone}.`
    : null
  const hours = formatHours(building?.opening_hours) ?? formatHours(service?.opening_hours)
  const hoursLine = hours
    ? locale === "en"
      ? `Opening hours: ${hours}.`
      : `Horaires : ${hours}.`
    : null
  const place = building
    ? `${building.name}${building.address ? ` — ${building.address}` : ""}`
    : service?.name ?? ""
  const availability = service ? formatServiceState(service, locale) : null

  if (rule.urgency === "emergency") {
    return {
      intent: "emergency",
      kind: "emergency",
      confidence: 0.96,
      sources,
      content: [
        locale === "en"
          ? `This sounds urgent: ${rule.reason.en}.`
          : `Cela semble urgent : ${rule.reason.fr}.`,
        locale === "en"
          ? `Contact ${service?.name ?? "medical emergency"} immediately or go to ${place}.`
          : `Contactez immédiatement ${service?.name ?? "les urgences médicales"} ou rendez-vous à ${place}.`,
        contactLine,
        ...EMERGENCY_NUMBERS.map((entry) => `• ${locale === "en" ? entry.en : entry.fr}: ${entry.phone}`),
        hoursLine,
        availability,
        locale === "en"
          ? "I cannot diagnose you remotely. If the person worsens, collapses, or cannot breathe, call emergency services now."
          : "Je ne peux pas poser de diagnostic à distance. Si l'état s'aggrave, en cas de malaise ou de difficulté à respirer, appelez les urgences sans attendre.",
      ].filter(Boolean).join("\n"),
    }
  }

  return {
    intent: "info",
    kind: "normal",
    confidence: rule.urgency === "urgent" ? 0.86 : 0.75,
    sources,
    content: [
      locale === "en"
        ? `The best next step is ${place}, because ${rule.reason.en}.`
        : `La meilleure orientation est ${place}, car ${rule.reason.fr}.`,
      service
        ? locale === "en"
          ? `Recommended service: ${service.name}.`
          : `Service conseillé : ${service.name}.`
        : null,
      contactLine,
      hoursLine,
      availability,
      locale === "en"
        ? "This is general guidance only. If swelling, pain, fever, bleeding or breathing trouble gets worse, seek urgent care immediately."
        : "Ceci reste un conseil général. Si la douleur, le gonflement, la fièvre, le saignement ou la respiration s'aggravent, cherchez une prise en charge urgente immédiatement.",
    ].filter(Boolean).join("\n"),
  }
}

function buildAdminReply(context: IntentRouteContext, rule: AdminRule): RoutedReply | null {
  const service = findService(context.services, rule.serviceSlugs)
  if (!service) return null

  const locale = context.locale
  const requestUrl = `/app/requests/new?service=${service.slug}`
  const serviceUrl = `/services/${service.slug}`
  const hours = formatHours(service.opening_hours)

  return {
    intent: "create_request",
    kind: "normal",
    confidence: 0.9,
    sources: [
      { type: "service", title: service.name, url: serviceUrl },
      { type: "request", title: locale === "en" ? "Create request" : "Créer une demande", url: requestUrl },
    ],
    pendingAction: {
      type: "create_request",
      draft: {
        serviceSlug: service.slug,
        subject: locale === "en" ? rule.subject.en : rule.subject.fr,
        description: clip(context.text, 500),
      },
    },
    content: [
      locale === "en"
        ? `The most appropriate service is “${service.name}” because ${rule.reason.en}.`
        : `Le service le plus adapté est « ${service.name} » car ${rule.reason.fr}.`,
      hours
        ? locale === "en"
          ? `Opening hours: ${hours}.`
          : `Horaires : ${hours}.`
        : null,
      formatServiceState(service, locale),
      locale === "en"
        ? `Create a request: ${requestUrl}`
        : `Créer une demande : ${requestUrl}`,
      locale === "en"
        ? `Service page: ${serviceUrl}`
        : `Fiche service : ${serviceUrl}`,
    ].filter(Boolean).join("\n"),
  }
}

function buildReportReply(context: IntentRouteContext, rule: ReportRule): RoutedReply {
  const service = findService(context.services, rule.serviceSlugs)
  const locale = context.locale
  const reportUrl = `/app/reports/new?category=${rule.category}`
  const title = clip(context.text, 90)
  const content = [
    locale === "en"
      ? `This looks like a “${rule.category}” report. ${rule.reason.en}.`
      : `Cela ressemble à un signalement de catégorie « ${rule.category} ». ${rule.reason.fr}.`,
    service
      ? locale === "en"
        ? `Responsible service: ${service.name}.`
        : `Service responsable : ${service.name}.`
      : null,
    service ? formatServiceState(service, locale) : null,
    locale === "en"
      ? `Open the report form: ${reportUrl}`
      : `Ouvrir le formulaire : ${reportUrl}`,
  ].filter(Boolean).join("\n")

  return {
    intent: "create_report",
    kind: "normal",
    content,
    confidence: 0.9,
    sources: [
      ...(service ? [{ type: "service", title: service.name, url: `/services/${service.slug}` }] : []),
      { type: "report", title: locale === "en" ? "Create report" : "Créer un signalement", url: reportUrl },
    ],
    pendingAction: {
      type: "create_report",
      draft: {
        title,
        description: clip(context.text, 500),
        category: rule.category,
      },
    },
  }
}

function getBestRule<T extends KeywordRule>(rules: T[], text: string, tokens: string[]): { rule: T; score: number } | null {
  const ranked = rules
    .map((rule) => ({ rule, score: scoreRule(rule, text, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked[0] ?? null
}

function isGenericAdministrativePrompt(text: string, tokens: string[]): boolean {
  return GENERIC_ADMIN_HINTS.some((term) => matchesTerm(term, text, tokens))
}

export function routeIntent(context: IntentRouteContext): RoutedReply | null {
  const text = normalizeText(context.text)
  const tokens = tokenize(context.text)

  const bestHealth = getBestRule(HEALTH_RULES, text, tokens)
  const bestReport = getBestRule(REPORT_RULES, text, tokens)
  const bestAdmin = getBestRule(ADMIN_RULES, text, tokens)

  if (bestHealth && (bestHealth.rule.urgency === "emergency" || bestHealth.score >= 1)) {
    return buildHealthReply(context, bestHealth.rule)
  }

  if (bestReport && (!bestAdmin || bestReport.score >= bestAdmin.score)) {
    return buildReportReply(context, bestReport.rule)
  }

  if (bestAdmin) {
    const competingAdmin = ADMIN_RULES.filter((rule) => rule.id !== bestAdmin.rule.id && scoreRule(rule, text, tokens) === bestAdmin.score)
    if (competingAdmin.length > 0) return buildClarifyingReply(context.locale)
    return buildAdminReply(context, bestAdmin.rule)
  }

  if (isGenericAdministrativePrompt(text, tokens)) {
    return buildClarifyingReply(context.locale)
  }

  return null
}
