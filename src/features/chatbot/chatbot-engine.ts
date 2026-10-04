import type { DangerRow, ReportCategory, Sector } from "@/lib/db-types"
import { routeIntent, type ChatBuilding } from "@/features/chatbot/intent-router"

/**
 * Moteur de l'assistant : il ne répond qu'à partir des contenus PUBLIÉS (base de connaissances et fiches de services),
 * cite toujours ses sources, avoue quand il ne sait pas et ne crée rien sans confirmation explicite.
 * Il fonctionne sans modèle de langage ; un LLM peut seulement reformuler une réponse déjà fondée (voir chatbot-panel).
 */

export type Locale = "fr" | "en"

export interface KbEntry {
  id: string
  entity_type: string
  title: string
  content: string
  url: string | null
}

export interface ServiceFacts {
  id?: string
  slug: string
  name: string
  category: string
  description: string | null
  phone: string | null
  opening_hours: Record<string, string>
  required_documents: string[]
  procedures: { step: number; text: string }[]
  status: string
  is_emergency: boolean
}

export type DangerFacts = DangerRow

export type Intent = "greeting" | "emergency" | "create_report" | "create_request" | "human" | "info"

export interface ChatSource {
  type: string
  title: string
  url: string
}

export type PendingAction =
  | { type: "create_report"; draft: { title: string; description: string; category: ReportCategory } }
  | { type: "create_request"; draft: { serviceSlug: string | null; subject: string; description: string } }
  | { type: "escalate" }

export interface ChatReply {
  intent: Intent
  kind: "normal" | "emergency" | "unknown"
  content: string
  sources: ChatSource[]
  confidence: number
  pendingAction?: PendingAction
}

const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "d", "l", "et", "ou", "a", "au", "aux", "en", "dans", "sur", "pour", "par", "avec", "sans",
  "je", "tu", "il", "elle", "nous", "vous", "ils", "mon", "ma", "mes", "ton", "ta", "ses", "son", "ce", "cet", "cette", "ces", "qui", "que", "quoi",
  "est", "sont", "suis", "faut", "faire", "puis", "peux", "veux", "voudrais", "souhaite", "quel", "quelle", "quels", "quelles", "comment", "ou", "où",
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are", "i", "my", "me", "how", "what", "where", "which", "can", "do", "does", "need", "want", "would", "like",
])

/** Minuscules, sans accents, ponctuation remplacée par des espaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Racine très simple (pluriels) pour que « services » retrouve « service ». */
function stem(token: string): string {
  return token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token
}

export interface Scored<T> {
  item: T
  score: number
}

/** Score 0–1 : part des mots de la question retrouvés (titre pondéré x3, contenu x1). */
export function scoreText(queryTokens: string[], title: string, content: string): number {
  if (queryTokens.length === 0) return 0
  const titleSet = new Set(tokenize(title).map(stem))
  const contentSet = new Set(tokenize(content).map(stem))
  let points = 0
  for (const token of queryTokens.map(stem)) {
    if (titleSet.has(token)) points += 3
    else if (contentSet.has(token)) points += 1
  }
  return Math.min(1, points / (queryTokens.length * 3))
}

export function searchKnowledge(entries: KbEntry[], query: string, limit = 3): Scored<KbEntry>[] {
  const tokens = tokenize(query)
  return entries
    .map((item) => ({ item, score: scoreText(tokens, item.title, item.content) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function findService(services: ServiceFacts[], query: string): Scored<ServiceFacts> | null {
  const tokens = tokenize(query)
  const ranked = services
    .map((item) => ({ item, score: scoreText(tokens, `${item.name} ${item.category}`, item.description ?? "") }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked[0] ?? null
}

export type Facet = "documents" | "steps" | "hours" | "phone" | "location" | null

export function detectFacet(text: string): Facet {
  const t = normalize(text)
  if (/(document|piece|papier|justificatif|fournir|required|need to bring|paperwork)/.test(t)) return "documents"
  if (/(etape|demarche|procedure|comment faire|steps|how to|process|chemin)/.test(t)) return "steps"
  if (/(horaire|ouvert|ouverture|ferme|heure|opening|hours|open)/.test(t)) return "hours"
  if (/(telephone|appeler|numero|joindre|phone|call|number)/.test(t)) return "phone"
  if (/(ou se trouve|adresse|localisation|situe|where|address|location|located)/.test(t)) return "location"
  return null
}

const EMERGENCY = /(urgence|urgent|danger|invasion|extraterrestre|alien|alerte|secours|incendie|feu|fire|ambulance|police|agression|blesse|malaise|emergency|help me|au secours|evacuation|abri|shelter)/
const REPORT = /(signaler|signalement|signale|report|panne|probleme|problem|fuite|leak|nid de poule|pothole|bruit|noise|lampadaire|streetlight|degat|damage|depot sauvage|dumping)/
const REQUEST = /(contacter|contact|demande|request|ecrire|message|envoyer une demande|renouveler|attestation|inscription)/
const HUMAN = /(conseiller|agent|humain|human|parler a quelqu|speak to|talk to|operator|support|appel)/
const GREETING = /^(bonjour|salut|bonsoir|hello|hi|hey|coucou)\b/

/** Intention dominante : l'urgence prime toujours. */
export function detectIntent(text: string): Intent {
  const t = normalize(text)
  if (EMERGENCY.test(t)) return "emergency"
  if (HUMAN.test(t)) return "human"
  if (REPORT.test(t)) return "create_report"
  if (GREETING.test(t) && t.split(" ").length <= 3) return "greeting"
  if (REQUEST.test(t) && /(demande|request|contacter|ecrire|envoyer|message)/.test(t)) return "create_request"
  return "info"
}

const CATEGORY_RULES: [RegExp, ReportCategory][] = [
  [/(lampadaire|eclairage|lumiere|route|voirie|nid de poule|pothole|reseau|panne|fuite|streetlight|power|water)/, "infrastructure"],
  [/(bruit|noise|musique|tapage)/, "noise"],
  [/(depot|dechet|ordure|pollution|air|waste|dumping)/, "environment"],
  [/(tram|maglev|navette|transport|retard|ferry|bus)/, "transport"],
  [/(fumee|malade|sante|hopital|health|smoke)/, "health"],
  [/(vol|agression|suspect|securite|danger|theft|safety)/, "safety"],
]

export function guessReportCategory(text: string): ReportCategory {
  const t = normalize(text)
  for (const [rule, category] of CATEGORY_RULES) if (rule.test(t)) return category
  return "other"
}

export function isConfirmation(text: string): boolean {
  return /^(oui|ok|d accord|confirme|confirmer|yes|yep|c est bon|valide|je confirme|go)\b/.test(normalize(text))
}

export function isRejection(text: string): boolean {
  return /^(non|annule|annuler|stop|no|cancel|pas maintenant|laisse tomber)\b/.test(normalize(text))
}

function clip(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

const EMERGENCY_NUMBERS = [
  { fr: "Police", en: "Police", phone: "+999 112" },
  { fr: "Pompiers", en: "Fire & Rescue", phone: "+999 118" },
  { fr: "Urgences médicales", en: "Medical emergency", phone: "+999 115" },
]

const T = {
  fr: {
    greeting: "Bonjour ! Je peux vous renseigner sur les services, les actualités, les démarches et les alertes de Nova Terra, ou vous aider à préparer un signalement ou une demande.",
    unknown: "Je n'ai pas cette information dans les contenus publiés de Nova Terra. Je préfère ne pas inventer : vous pouvez contacter le service concerné ou demander un conseiller.",
    emergencyIntro: "Gardez votre calme. En cas de danger immédiat, appelez les secours :",
    emergencyDanger: "Consigne officielle :",
    emergencyNote: "Cette réponse reprend la procédure officielle publiée. Suivez les consignes des autorités.",
    humanOffer: "Je peux vous mettre en relation avec un agent. Souhaitez-vous que je transmette votre demande ? Répondez « oui » pour confirmer.",
    reportOffer: (title: string, cat: string) => `Je peux préparer ce signalement : « ${title} » (catégorie : ${cat}). Rien n'est créé sans votre accord. Répondez « oui » pour confirmer, « non » pour annuler.`,
    requestOffer: (name: string | null) => `Je peux préparer une demande${name ? ` pour le service « ${name} »` : ""}. Rien n'est envoyé sans votre accord. Répondez « oui » pour confirmer, « non » pour annuler.`,
    documents: (name: string, docs: string[]) => docs.length ? `Documents nécessaires pour « ${name} » : ${docs.join(", ")}.` : `Aucun document particulier n'est indiqué pour « ${name} ».`,
    steps: (name: string, steps: string[]) => steps.length ? `Étapes pour « ${name} » : ${steps.join(" ")}` : `Aucune démarche détaillée n'est publiée pour « ${name} ».`,
    hours: (name: string, hours: string) => hours ? `Horaires de « ${name} » : ${hours}.` : `Les horaires de « ${name} » ne sont pas publiés.`,
    phone: (name: string, phone: string | null) => phone ? `Téléphone de « ${name} » : ${phone}.` : `Aucun numéro n'est publié pour « ${name} ».`,
    closed: (name: string) => `Attention : « ${name} » est actuellement fermé ou suspendu.`,
    more: "Voici ce que j'ai trouvé :",
  },
  en: {
    greeting: "Hello! I can tell you about Nova Terra's services, news, procedures and alerts, or help you prepare a report or a request.",
    unknown: "I do not have this information in the published Nova Terra content. I prefer not to make things up: you can contact the relevant service or ask for an agent.",
    emergencyIntro: "Stay calm. In case of immediate danger, call emergency services:",
    emergencyDanger: "Official instruction:",
    emergencyNote: "This answer reuses the published official procedure. Follow the authorities' instructions.",
    humanOffer: "I can connect you with an agent. Do you want me to pass on your request? Answer “yes” to confirm.",
    reportOffer: (title: string, cat: string) => `I can prepare this report: “${title}” (category: ${cat}). Nothing is created without your approval. Answer “yes” to confirm, “no” to cancel.`,
    requestOffer: (name: string | null) => `I can prepare a request${name ? ` for the “${name}” service` : ""}. Nothing is sent without your approval. Answer “yes” to confirm, “no” to cancel.`,
    documents: (name: string, docs: string[]) => docs.length ? `Documents required for “${name}”: ${docs.join(", ")}.` : `No specific document is listed for “${name}”.`,
    steps: (name: string, steps: string[]) => steps.length ? `Steps for “${name}”: ${steps.join(" ")}` : `No detailed procedure is published for “${name}”.`,
    hours: (name: string, hours: string) => hours ? `Opening hours of “${name}”: ${hours}.` : `The opening hours of “${name}” are not published.`,
    phone: (name: string, phone: string | null) => phone ? `Phone of “${name}”: ${phone}.` : `No number is published for “${name}”.`,
    closed: (name: string) => `Note: “${name}” is currently closed or suspended.`,
    more: "Here is what I found:",
  },
} as const

const MIN_CONFIDENCE = 0.34

export interface ReplyContext {
  text: string
  locale: Locale
  kb: KbEntry[]
  services: ServiceFacts[]
  dangers?: DangerFacts[]
  sectors?: Sector[]
  buildings?: ChatBuilding[]
  sectorId?: string | null
}

/** Construit la réponse de l'assistant. Aucun effet de bord : les actions sont proposées via `pendingAction`. */
export function buildReply(context: ReplyContext): ChatReply {
  const { text, locale, kb, services } = context
  const t = T[locale]
  const facet = detectFacet(text)
  const service = findService(services, text)
  const normalizedQuestion = normalize(text)

  if (detectIntent(text) === "greeting") return { intent: "greeting", kind: "normal", content: t.greeting, sources: [], confidence: 1 }

  if (
    /(carte|map)/.test(normalizedQuestion)
    && /(interactive|ecran|page|trouver|retrouver|ouvrir|where|which|screen)/.test(normalizedQuestion)
  ) {
    return {
      intent: "info",
      kind: "normal",
      content: locale === "en"
        ? "The interactive city map is on the Map page. Open it to explore sectors and facilities."
        : "La carte interactive se trouve sur l’écran Carte. Ouvrez cette page pour explorer les secteurs et les équipements.",
      sources: [{ type: "faq", title: locale === "en" ? "Use the map and find a facility" : "Utiliser la carte et localiser un équipement", url: "/map" }],
      confidence: 1,
    }
  }

  if (service && facet && service.score >= MIN_CONFIDENCE) {
    const s = service.item
    const sources: ChatSource[] = [{ type: "service", title: s.name, url: `/services/${s.slug}` }]
    const parts: string[] = []
    if (facet === "documents") parts.push(t.documents(s.name, s.required_documents))
    else if (facet === "steps") parts.push(t.steps(s.name, s.procedures.map((p) => `${p.step}. ${p.text}`)))
    else if (facet === "hours") parts.push(t.hours(s.name, Object.entries(s.opening_hours).map(([k, v]) => `${k} ${v}`).join(", ")))
    else if (facet === "phone") parts.push(t.phone(s.name, s.phone))
    if (s.status !== "open") parts.push(t.closed(s.name))
    return { intent: "info", kind: "normal", content: parts.join("\n"), sources, confidence: service.score }
  }

  const routed = routeIntent({ text, locale, services, buildings: context.buildings })
  const intent = detectIntent(text)

  if (routed && (routed.intent === "emergency" || (intent === "info" && !(service && service.score >= MIN_CONFIDENCE)))) return routed

  if (intent === "emergency") {
    const isSectorQuestion = /(mon secteur|dans mon secteur|mon quartier|my sector|in my sector|my neighborhood)/.test(normalize(text))
    const isGeneralDangerQuestion = /(danger|risque|alerte|protocol)/.test(normalize(text))
    const sectorDangers = (context.dangers ?? []).filter((danger) =>
      !isSectorQuestion || !context.sectorId || danger.affected_sector_ids.includes(context.sectorId)
    )
    const dangerEntries = sectorDangers.map((danger) => {
      const affectedSectors = (context.sectors ?? [])
        .filter((sector) => danger.affected_sector_ids.includes(sector.id))
        .map((sector) => `${sector.code} ${sector.name}`)
      const knownSectorIds = new Set((context.sectors ?? []).map((sector) => sector.id))
      const unknownSectorIds = danger.affected_sector_ids.filter((id) => !knownSectorIds.has(id))
      const assemblyPoints = (context.buildings ?? [])
        .filter((building) => danger.assembly_building_ids.includes(building.id))
        .map((building) => `${building.name}${building.address ? ` (${building.address})` : ""}`)
      const knownBuildingIds = new Set((context.buildings ?? []).map((building) => building.id))
      const unknownBuildingIds = danger.assembly_building_ids.filter((id) => !knownBuildingIds.has(id))
      const responsibleService = context.services.find((candidate) => candidate.id === danger.responsible_service_id)?.name
      const details = [
        danger.summary,
        `${locale === "en" ? "Severity" : "Gravité"}: ${danger.severity}`,
        `${locale === "en" ? "Status" : "Statut"}: ${danger.status}`,
        `${locale === "en" ? "Affected sectors" : "Secteurs concernés"}: ${[...affectedSectors, ...unknownSectorIds].join(", ") || "—"}`,
        `${locale === "en" ? "Assembly points" : "Points de rassemblement"}: ${[...assemblyPoints, ...unknownBuildingIds].join("; ") || "—"}`,
        `${locale === "en" ? "Valid from" : "Valable depuis"}: ${danger.valid_from}${danger.valid_until ? ` ${locale === "en" ? "to" : "jusqu'au"} ${danger.valid_until}` : ""}`,
        `${locale === "en" ? "Recommended actions" : "À faire"}: ${danger.recommended_actions.join("; ") || "—"}`,
        `${locale === "en" ? "Forbidden actions" : "À ne pas faire"}: ${danger.forbidden_actions.join("; ") || "—"}`,
        `${locale === "en" ? "Protocol" : "Protocole"}: ${[...danger.protocol_steps]
          .sort((a, b) => a.order - b.order)
          .map((step) => `${step.order}. ${step.title}: ${step.detail}`)
          .join("; ") || "—"}`,
        `${locale === "en" ? "Emergency contacts" : "Contacts d'urgence"}: ${danger.emergency_contacts.map((contact) => `${contact.service}: ${contact.phone}`).join("; ") || "—"}`,
        `${locale === "en" ? "Procedure version" : "Version de procédure"}: ${danger.procedure_version}`,
        `${locale === "en" ? "Validated at" : "Validée le"}: ${danger.validated_at ?? "—"}`,
        `${locale === "en" ? "Responsible service" : "Service responsable"}: ${responsibleService ?? danger.responsible_service_id ?? "—"}`,
        `${locale === "en" ? "Source" : "Source"}: ${danger.source ?? "—"}`,
        "",
      ].filter(Boolean)
      return {
        item: {
          id: danger.id,
          entity_type: "danger",
          title: danger.title,
          content: details.join("\n"),
          url: `/dangers/${danger.slug}`,
        },
        score: 1,
      }
    })
    const dangerKnowledge = [...dangerEntries.map((entry) => entry.item), ...kb.filter((entry) => entry.entity_type === "danger")]
      .filter((entry, index, entries) => entries.findIndex((candidate) =>
        entry.url ? candidate.url === entry.url : candidate.id === entry.id
      ) === index)
    const matchedDangerEntries = isSectorQuestion
      ? dangerEntries
      : isGeneralDangerQuestion
        ? dangerEntries.length > 0
          ? dangerEntries
          : dangerKnowledge.map((item) => ({ item, score: 1 }))
        : searchKnowledge(dangerKnowledge, text, 5).filter((entry) => entry.score >= MIN_CONFIDENCE)
    const dangerEntriesToShow = matchedDangerEntries
    const lines = [t.emergencyIntro, ...EMERGENCY_NUMBERS.map((n) => `• ${locale === "en" ? n.en : n.fr} : ${n.phone}`)]
    const sources: ChatSource[] = [{ type: "service", title: locale === "en" ? "Emergency contacts" : "Contacts d'urgence", url: "/dangers" }]
    if (isSectorQuestion && !context.sectorId) {
      lines.push(locale === "en"
        ? "Your residential sector is not linked to your profile, so I cannot filter alerts by sector."
        : "Votre secteur de résidence n'est pas associé à votre profil : je ne peux pas filtrer les alertes par secteur.")
    }
    if (dangerEntriesToShow.length > 0) {
      lines.push(isSectorQuestion
        ? (locale === "en" ? "Published dangers for your sector:" : "Dangers publiés pour votre secteur :")
        : isGeneralDangerQuestion
          ? (locale === "en" ? "Published danger information:" : "Informations sur les dangers publiées :")
        : t.emergencyDanger)
      for (const danger of dangerEntriesToShow) {
        lines.push(`\n${danger.item.title}\n${danger.item.content}`)
        if (danger.item.url) sources.unshift({ type: "danger", title: danger.item.title, url: danger.item.url })
      }
    } else if (isSectorQuestion && context.sectorId) {
      lines.push(locale === "en" ? "No published danger is linked to your sector." : "Aucun danger publié n'est associé à votre secteur.")
    } else if (!isSectorQuestion && !isGeneralDangerQuestion) {
      const danger = searchKnowledge(dangerKnowledge, text, 1)[0]
      if (danger) {
        lines.push(`${t.emergencyDanger} ${clip(danger.item.content, 360)}`)
        if (danger.item.url) sources.unshift({ type: "danger", title: danger.item.title, url: danger.item.url })
      }
    }
    lines.push(t.emergencyNote)
    return { intent, kind: "emergency", content: lines.join("\n"), sources, confidence: dangerEntriesToShow.length ? 1 : 0.6 }
  }

  if (intent === "human") {
    return { intent, kind: "normal", content: t.humanOffer, sources: [], confidence: 0.9, pendingAction: { type: "escalate" } }
  }

  if (intent === "create_report") {
    const category = guessReportCategory(text)
    const title = clip(text.replace(/^(je veux |je voudrais |je souhaite |i want to |i would like to )?(signaler|report)\s*/i, ""), 80) || clip(text, 80)
    const reportDetails = routed?.intent === "create_report" ? `\n${routed.content}` : ""
    return {
      intent, kind: "normal", confidence: 0.9, sources: [],
      content: `${t.reportOffer(title, category)}${reportDetails}`,
      pendingAction: routed?.pendingAction?.type === "create_report"
        ? routed.pendingAction
        : { type: "create_report", draft: { title, description: clip(text, 500), category } },
    }
  }

  if (intent === "create_request") {
    if (routed?.intent === "create_request") return routed
    return {
      intent, kind: "normal", confidence: 0.85,
      sources: service ? [{ type: "service", title: service.item.name, url: `/services/${service.item.slug}` }] : [],
      content: t.requestOffer(service?.item.name ?? null),
      pendingAction: { type: "create_request", draft: { serviceSlug: service?.item.slug ?? null, subject: clip(text, 100), description: clip(text, 500) } },
    }
  }

  if (service && service.score >= MIN_CONFIDENCE) {
    const s = service.item
    const sources: ChatSource[] = [{ type: "service", title: s.name, url: `/services/${s.slug}` }]
    const parts: string[] = []
    if (facet === "documents") parts.push(t.documents(s.name, s.required_documents))
    else if (facet === "steps") parts.push(t.steps(s.name, s.procedures.map((p) => `${p.step}. ${p.text}`)))
    else if (facet === "hours") parts.push(t.hours(s.name, Object.entries(s.opening_hours).map(([k, v]) => `${k} ${v}`).join(", ")))
    else if (facet === "phone") parts.push(t.phone(s.name, s.phone))
    else parts.push(`${s.name} — ${clip(s.description ?? "", 220)}`)
    if (s.status !== "open") parts.push(t.closed(s.name))
    return { intent, kind: "normal", content: parts.join("\n"), sources, confidence: service.score }
  }

  const hits = searchKnowledge(kb, text, kb.length).filter((h) => h.score >= MIN_CONFIDENCE)
  if (hits.length === 0) {
    return { intent, kind: "unknown", content: t.unknown, sources: [], confidence: 0, pendingAction: { type: "escalate" } }
  }
  const sources = hits.filter((h) => h.item.url).map((h) => ({ type: h.item.entity_type, title: h.item.title, url: h.item.url as string }))
  const content = [t.more, ...hits.map((h) => `• ${h.item.title} — ${h.item.content}`)].join("\n")
  return { intent, kind: "normal", content, sources, confidence: hits[0].score }
}
