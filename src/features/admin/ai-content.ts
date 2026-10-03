export type AiTargetTable = "sectors" | "buildings" | "services"

const THEMES = [
  "suspendu au-dessus du lac céleste",
  "irrigué par un réseau de lumière douce",
  "relié aux autres secteurs par des passerelles en lévitation",
  "baigné d'une brise filtrée par les dômes",
  "animé jour et nuit par ses habitants",
]

const KIND: Record<AiTargetTable, string> = {
  sectors: "Le secteur",
  buildings: "Le bâtiment",
  services: "Le service",
}

/** Hachage simple et stable : un même nom donne toujours la même variante (génération reproductible). */
function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

/**
 * Génère une description citoyenne pour un élément de la ville (simulation locale d'un contenu produit par IA).
 * Le texte n'est JAMAIS publié directement : il est proposé à un administrateur qui le valide ou le rejette.
 */
export function generateDescription(table: AiTargetTable, name: string, hint?: string): string {
  const theme = THEMES[hash(`${table}:${name}`) % THEMES.length]
  const extra = hint ? ` ${hint.trim().replace(/\.$/, "")}.` : ""
  return `${KIND[table]} « ${name} » est ${theme}.${extra} Contenu généré automatiquement, à relire avant publication.`
}

/** Un contenu proposé doit rester court et lisible par un citoyen. */
export function isValidDescription(text: string): boolean {
  const length = text.trim().length
  return length >= 20 && length <= 600
}
