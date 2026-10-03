import { normalize } from "@/features/chatbot/chatbot-engine"
import type { UserRole } from "@/lib/types"

export type VoiceAction = "navigate" | "click" | "read" | "fill" | "submit" | "help" | "stop" | "open_tour"
export type VoiceLocale = "fr" | "en" | "any"

/** Commande vocale (table `voice_commands`) ; les valeurs par défaut ci-dessous servent hors ligne. */
export interface VoiceCommand {
  code: string
  locale: VoiceLocale
  phrases: string[]
  action: VoiceAction
  target: string | null
  description: string
  requires_confirmation: boolean
  min_role: UserRole | null
}

export const DEFAULT_COMMANDS: VoiceCommand[] = [
  { code: "go-home", locale: "any", phrases: ["accueil", "retour à l'accueil", "page d'accueil", "go home", "home"], action: "navigate", target: "/", description: "Aller à la page d'accueil.", requires_confirmation: false, min_role: null },
  { code: "open-services", locale: "any", phrases: ["services", "ouvre les services", "liste des services", "open services"], action: "navigate", target: "/services", description: "Ouvrir la liste des services.", requires_confirmation: false, min_role: null },
  { code: "open-news", locale: "any", phrases: ["actualités", "ouvre les actualités", "les nouvelles", "open news"], action: "navigate", target: "/news", description: "Ouvrir les actualités.", requires_confirmation: false, min_role: null },
  { code: "open-map", locale: "any", phrases: ["carte", "ouvre la carte", "plan de la ville", "open the map", "map"], action: "navigate", target: "/map", description: "Ouvrir la carte interactive.", requires_confirmation: false, min_role: null },
  { code: "open-dangers", locale: "any", phrases: ["dangers", "alertes", "ouvre les dangers", "open dangers", "alerts"], action: "navigate", target: "/dangers", description: "Ouvrir les dangers et protocoles.", requires_confirmation: false, min_role: null },
  { code: "open-chatbot", locale: "any", phrases: ["assistant", "ouvre l'assistant", "parler à l'assistant", "open assistant"], action: "navigate", target: "/app/assistant", description: "Ouvrir l'assistant virtuel.", requires_confirmation: false, min_role: "citizen" },
  { code: "new-report", locale: "any", phrases: ["nouveau signalement", "signaler un problème", "new report", "report a problem"], action: "navigate", target: "/app/reports/new", description: "Commencer un signalement (identité vérifiée requise).", requires_confirmation: true, min_role: "citizen" },
  { code: "my-requests", locale: "any", phrases: ["mes demandes", "suivre mes demandes", "my requests"], action: "navigate", target: "/app/requests", description: "Voir mes demandes et leur statut.", requires_confirmation: false, min_role: "citizen" },
  { code: "read-page", locale: "any", phrases: ["lis la page", "lis l'écran", "read this page", "read the screen"], action: "read", target: null, description: "Lire le contenu de la page à voix haute.", requires_confirmation: false, min_role: null },
  { code: "help", locale: "any", phrases: ["aide", "où suis-je", "que puis-je dire", "help", "where am i"], action: "help", target: null, description: "Expliquer la page actuelle et les commandes vocales disponibles.", requires_confirmation: false, min_role: null },
  { code: "tour", locale: "any", phrases: ["visite guidée", "guide", "guided tour", "start the tour"], action: "open_tour", target: "welcome", description: "Lancer la visite guidée.", requires_confirmation: false, min_role: null },
  { code: "stop", locale: "any", phrases: ["stop", "arrête", "silence", "annuler", "cancel"], action: "stop", target: null, description: "Arrêter la lecture ou annuler l'action en cours.", requires_confirmation: false, min_role: null },
]

function words(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean)
}

/** Similarité 0–1 entre un énoncé et une expression (égalité, inclusion de mots entiers, recouvrement). */
export function similarity(utterance: string, phrase: string): number {
  const u = normalize(utterance)
  const p = normalize(phrase)
  if (!u || !p) return 0
  if (u === p) return 1
  const uw = words(u)
  const pw = words(p)
  const padded = ` ${u} `
  if (padded.includes(` ${p} `)) return 0.9
  if (` ${p} `.includes(padded) && u.length >= 4) return 0.75
  const shared = pw.filter((w) => uw.includes(w)).length
  const union = new Set([...uw, ...pw]).size
  return union === 0 ? 0 : (shared / union) * 0.85
}

export interface CommandMatch {
  command: VoiceCommand
  score: number
}

const MIN_SCORE = 0.6

/** Autorisation d'une commande : `min_role` non nul = connexion requise ; réservé au personnel si le rôle l'exige. */
export function canUseCommand(command: VoiceCommand, role: UserRole | null): boolean {
  if (!command.min_role) return true
  if (!role) return false
  if (command.min_role === "citizen") return true
  return role === command.min_role || role === "general_admin"
}

export function matchCommand(utterance: string, commands: VoiceCommand[], locale: "fr" | "en", role: UserRole | null): CommandMatch | null {
  let best: CommandMatch | null = null
  for (const command of commands) {
    if (command.locale !== "any" && command.locale !== locale) continue
    for (const phrase of command.phrases) {
      const score = similarity(utterance, phrase)
      if (score >= MIN_SCORE && (!best || score > best.score)) best = { command, score }
    }
  }
  if (best && !canUseCommand(best.command, role)) return null
  return best
}

const DICTATE = /^(dicte|dictez|ecris|ecrit|ecrire|tape|write|dictate|type)\s+(.+)$/
const CLICK = /^(clique sur|cliquer sur|appuie sur|appuyer sur|ouvre|ouvrir|va a|aller a|va sur|click|press|open|go to)\s+(.+)$/

/** « dicte bonjour » -> "bonjour" (la casse d'origine est conservée). */
export function parseDictation(utterance: string): string | null {
  const match = normalize(utterance).match(DICTATE)
  if (!match) return null
  const prefixWords = match[1].split(" ").length
  return utterance.trim().split(/\s+/).slice(prefixWords).join(" ") || null
}

/** « clique sur envoyer » -> "envoyer". */
export function parseClickTarget(utterance: string): string | null {
  const match = normalize(utterance).match(CLICK)
  return match ? match[2] : null
}

export interface Actionable {
  element: HTMLElement
  label: string
  kind: "link" | "voice"
}

function labelOf(element: HTMLElement): string {
  return (element.getAttribute("data-voice") || element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim()
}

function isVisible(element: HTMLElement): boolean {
  return !element.hidden && element.getAttribute("aria-hidden") !== "true"
}

/**
 * Éléments que la voix peut activer : liens de navigation et éléments explicitement marqués `data-voice`.
 * Jamais un bouton ou un champ quelconque (règle de sécurité du plan §5.5).
 */
export function listActionables(root: ParentNode): Actionable[] {
  const result: Actionable[] = []
  root.querySelectorAll<HTMLElement>("a[href], [data-voice]").forEach((element) => {
    if (!isVisible(element)) return
    const label = labelOf(element)
    if (label) result.push({ element, label, kind: element.hasAttribute("data-voice") ? "voice" : "link" })
  })
  return result
}

export function findActionable(label: string, root: ParentNode): Actionable | null {
  let best: { item: Actionable; score: number } | null = null
  for (const item of listActionables(root)) {
    const score = similarity(label, item.label)
    if (score >= MIN_SCORE && (!best || score > best.score)) best = { item, score }
  }
  return best?.item ?? null
}

/** Insère du texte dans le champ actif en déclenchant les événements React (champ texte ou zone de texte uniquement). */
export function dictateIntoField(text: string, field: Element | null): boolean {
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return false
  if (field instanceof HTMLInputElement && ["password", "checkbox", "radio", "file", "submit", "button"].includes(field.type)) return false
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  const next = `${field.value} ${text}`.trim()
  setter?.call(field, next)
  field.dispatchEvent(new Event("input", { bubbles: true }))
  return true
}
