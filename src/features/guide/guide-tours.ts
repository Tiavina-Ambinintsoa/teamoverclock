import type { UserRole } from "@/lib/types"
import { translatePhrase, type Locale } from "@/lib/locale"

export type GuideLocale = Locale
export type Placement = "top" | "bottom" | "left" | "right" | "center"

export interface GuideStep {
  step_order: number
  route: string
  target_selector: string | null
  title: string
  body: string
  voice_script: string | null
  placement: Placement
  locale: GuideLocale
}

export interface GuideTour {
  code: string
  title: string
  description: string
  audience: UserRole[]
  route_scope: string
  estimated_minutes: number
  steps: GuideStep[]
}

export function currentPageTour(pathname: string, title: string, locale: GuideLocale): GuideTour {
  const french = locale === "fr"
  return {
    code: "current-page",
    title,
    description: french ? `Repères pour la page : ${title}` : `${translatePhrase(locale, "A quick guide to this page")}: ${title}`,
    audience: ["citizen", "agent", "service_admin", "general_admin"],
    route_scope: pathname,
    estimated_minutes: 1,
    steps: [{
      step_order: 1,
      route: pathname,
      target_selector: pathname === "/inscription" ? '[data-tour="signup-form"]' : '[data-tour="page-content"]',
      title: french ? "Repères sur cette page" : translatePhrase(locale, "This page at a glance"),
      body: french
        ? "Voici le contenu principal de cette page. Utilisez Tab et Maj+Tab pour parcourir les liens et les commandes."
        : translatePhrase(locale, "This is the main content on this page. Use Tab and Shift+Tab to move through links and controls."),
      voice_script: null,
      placement: "top",
      locale,
    }],
  }
}

const ALL: UserRole[] = ["citizen", "agent", "service_admin", "general_admin"]

function step(order: number, route: string, selector: string | null, placement: Placement, fr: [string, string, string], en: [string, string, string]): GuideStep[] {
  return [
    { step_order: order, route, target_selector: selector, title: fr[0], body: fr[1], voice_script: fr[2], placement, locale: "fr" },
    { step_order: order, route, target_selector: selector, title: en[0], body: en[1], voice_script: en[2], placement, locale: "en" },
  ]
}

/** Parcours intégrés : ils fonctionnent même sans base de données ; les parcours de la base (même code) les remplacent. */
export const BUILT_IN_TOURS: GuideTour[] = [
  {
    code: "welcome",
    title: "Bienvenue à Nova Terra",
    description: "Découvrez les zones principales du portail.",
    audience: ALL,
    route_scope: "/",
    estimated_minutes: 3,
    steps: [
      ...step(1, "/", null, "center", ["Bienvenue", "Nova Terra est la ville du futur. Ce guide vous présente le portail en quelques étapes.", "Bienvenue à Nova Terra. Ce guide vous présente le portail en quelques étapes."], ["Welcome", "Nova Terra is the city of the future. This guide walks you through the portal in a few steps.", "Welcome to Nova Terra. This guide walks you through the portal in a few steps."]),
      ...step(2, "/", '[data-tour="header"]', "bottom", ["Le menu principal", "Le menu en haut de page donne accès aux services, aux actualités, à la carte et aux dangers.", "En haut de la page, le menu principal donne accès aux services, aux actualités, à la carte et aux dangers."], ["The main menu", "The menu at the top gives access to services, news, the map and dangers.", "At the top of the page, the main menu gives access to services, news, the map and dangers."]),
      ...step(3, "/", '[data-tour="global-search"]', "bottom", ["La recherche", "Tapez un mot-clé pour trouver un service, une actualité ou un bâtiment.", "La barre de recherche vous aide à trouver un service, une actualité ou un bâtiment."], ["Search", "Type a keyword to find a service, a news item or a building.", "The search bar helps you find a service, a news item or a building."]),
      ...step(4, "/", '[data-tour="services"]', "top", ["Les services", "Consultez les horaires, les documents nécessaires et la localisation de chaque service.", "Ici, vous trouvez les services de la ville, leurs horaires et les documents nécessaires."], ["Services", "See opening hours, required documents and the location of each service.", "Here you find the city services, their opening hours and required documents."]),
      ...step(5, "/", '[data-tour="news"]', "top", ["Les actualités", "Les annonces importantes et urgentes sont mises en avant.", "Les actualités de la ville sont ici. Les informations urgentes sont mises en avant."], ["News", "Important and urgent announcements are highlighted.", "City news is here. Urgent information is highlighted."]),
      ...step(6, "/", '[data-tour="map"]', "top", ["La carte", "La carte en ruche présente les secteurs, les bâtiments et les transports.", "La carte en forme de ruche présente les secteurs, les bâtiments et les transports."], ["The map", "The hive map shows sectors, buildings and transports.", "The hive-shaped map shows sectors, buildings and transports."]),
      ...step(7, "/", '[data-tour="chatbot"]', "top", ["L'assistant", "Posez une question par écrit ou à voix haute. L'assistant cite toujours ses sources.", "L'assistant répond à vos questions par écrit ou à voix haute, et cite ses sources."], ["The assistant", "Ask a question in writing or out loud. The assistant always cites its sources.", "The assistant answers your questions in writing or out loud, and cites its sources."]),
      ...step(8, "/", '[data-tour="report-cta"]', "top", ["Signaler un problème", "Après vérification de votre identité, vous pouvez signaler un problème dans votre secteur.", "Ce bouton permet de signaler un problème. Votre identité doit d'abord être vérifiée."], ["Report a problem", "Once your identity is verified, you can report a problem in your sector.", "This button lets you report a problem. Your identity must be verified first."]),
      ...step(9, "/", '[data-tour="help"]', "bottom", ["Aide et accessibilité", "Ajustez le contraste et la taille du texte dans les paramètres, ou rouvrez ce guide ici à tout moment.", "Le bouton d'aide rouvre ce guide. Les paramètres règlent le contraste, la taille du texte et l'assistance vocale."], ["Help & accessibility", "Adjust contrast and text size in the settings, or reopen this guide here at any time.", "The help button reopens this guide. The settings adjust contrast, text size and voice assistance."]),
      ...step(10, "/", null, "center", ["Bonne visite !", "Vous pouvez relancer cette visite depuis la page « Guide ».", "Bonne visite ! Vous pouvez relancer cette visite depuis la page Guide."], ["Enjoy your visit!", "You can restart this tour from the “Guide” page.", "Enjoy your visit! You can restart this tour from the Guide page."]),
    ],
  },
  {
    code: "map",
    title: "La carte interactive",
    description: "Secteurs, bâtiments, transports et itinéraires.",
    audience: ALL,
    route_scope: "/map",
    estimated_minutes: 2,
    steps: [
      ...step(1, "/map", '[data-tour="map"]', "center", ["La carte en ruche", "Chaque hexagone est un secteur. Sélectionnez un secteur, un bâtiment ou un transport pour afficher ses détails.", "Chaque hexagone est un secteur. Sélectionnez un élément pour afficher ses détails."], ["The hive map", "Each hexagon is a sector. Select a sector, a building or a transport to see its details.", "Each hexagon is a sector. Select an item to see its details."]),
      ...step(2, "/map", null, "center", ["Itinéraire et couches", "Choisissez un départ et une destination pour calculer un itinéraire. Les couches permettent d'afficher les alertes et les signalements validés.", "Choisissez un départ et une destination pour calculer un itinéraire."], ["Routes and layers", "Pick a start and a destination to compute a route. Layers show alerts and validated reports.", "Pick a start and a destination to compute a route."]),
    ],
  },
  {
    code: "file-report",
    title: "Déposer un signalement",
    description: "Formulaire, dictée vocale et preuves.",
    audience: ["citizen", "agent", "service_admin", "general_admin"],
    route_scope: "/app/reports/new",
    estimated_minutes: 2,
    steps: [
      ...step(1, "/app/reports/new", '[data-tour="report-form"]', "center", ["Le formulaire de signalement", "Indiquez le secteur, le bâtiment et décrivez le problème. Vous pouvez dicter la description à voix haute puis la relire.", "Indiquez le secteur, le bâtiment et décrivez le problème. Vous pouvez dicter la description."], ["The report form", "Choose the sector and building and describe the problem. You can dictate the description out loud, then review it.", "Choose the sector and building and describe the problem. You can dictate the description."]),
    ],
  },
]

/** Fusionne les parcours de la base (prioritaires, par code) et les parcours intégrés. */
export function mergeTours(fromDb: GuideTour[], builtIn: GuideTour[] = BUILT_IN_TOURS): GuideTour[] {
  const byCode = new Map(builtIn.map((tour) => [tour.code, tour]))
  for (const tour of fromDb) if (tour.steps.length > 0) byCode.set(tour.code, tour)
  return [...byCode.values()]
}

/** Parcours proposés à un profil donné (visiteur = citoyen). */
export function toursForRole(tours: GuideTour[], role: UserRole | null): GuideTour[] {
  const effective = role ?? "citizen"
  return tours.filter((tour) => tour.audience.includes(effective))
}

/** Choisit la meilleure version source puis localise les copies françaises/anglaises disponibles. */
export function stepsFor(tour: GuideTour, locale: GuideLocale): GuideStep[] {
  const wanted = tour.steps.filter((s) => s.locale === locale)
  const english = tour.steps.filter((s) => s.locale === "en")
  const french = tour.steps.filter((s) => s.locale === "fr")
  const steps = wanted.length > 0 ? wanted : english.length > 0 ? english : french
  return [...steps].sort((a, b) => a.step_order - b.step_order).map((entry) => {
    if (locale === "fr" || entry.locale === locale) return entry
    const translatedVoice = entry.voice_script ? translatePhrase(locale, entry.voice_script) : null
    return {
      ...entry,
      title: translatePhrase(locale, entry.title),
      body: translatePhrase(locale, entry.body),
      voice_script: translatedVoice && translatedVoice !== entry.voice_script ? translatedVoice : translatePhrase(locale, entry.body),
      locale,
    }
  })
}

export function tourTitle(tour: GuideTour, locale: GuideLocale): string {
  if (locale === "fr") return tour.title
  const titles: Record<string, string> = {
    welcome: "Welcome to Nova Terra",
    map: "The interactive map",
    "file-report": "File a report",
  }
  return translatePhrase(locale, titles[tour.code] ?? tour.title)
}

export function tourDescription(tour: GuideTour, locale: GuideLocale): string {
  if (locale === "fr") return tour.description
  const descriptions: Record<string, string> = {
    welcome: "Discover the main areas of the portal.",
    map: "Sectors, buildings, transport and routes.",
    "file-report": "Form, voice dictation and evidence.",
  }
  return translatePhrase(locale, descriptions[tour.code] ?? tour.description)
}

/** Premier parcours de bienvenue non terminé, ou null. */
export function pendingWelcome(tours: GuideTour[], completed: string[]): GuideTour | null {
  const welcome = tours.find((tour) => tour.code === "welcome")
  return welcome && !completed.includes("welcome") ? welcome : null
}

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

/** Position (en pixels) du cadre d'une étape par rapport à l'écran ; centré si aucune cible. */
export function popoverPosition(
  target: Rect | null,
  placement: Placement,
  viewport: { width: number; height: number },
  size: { width: number; height: number } = { width: 340, height: 220 }
): { top: number; left: number } {
  const margin = 12
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  if (!target || placement === "center") {
    return { top: Math.max(margin, (viewport.height - size.height) / 2), left: Math.max(margin, (viewport.width - size.width) / 2) }
  }
  let top = target.top + target.height + margin
  let left = target.left + target.width / 2 - size.width / 2
  if (placement === "top") top = target.top - size.height - margin
  if (placement === "left") { top = target.top + target.height / 2 - size.height / 2; left = target.left - size.width - margin }
  if (placement === "right") { top = target.top + target.height / 2 - size.height / 2; left = target.left + target.width + margin }
  // Si l'espace manque, on bascule de l'autre côté puis on reste dans l'écran.
  if (top < margin && placement === "top") top = target.top + target.height + margin
  if (top + size.height > viewport.height - margin && placement === "bottom") top = target.top - size.height - margin
  return { top: clamp(top, margin, Math.max(margin, viewport.height - size.height - margin)), left: clamp(left, margin, Math.max(margin, viewport.width - size.width - margin)) }
}
