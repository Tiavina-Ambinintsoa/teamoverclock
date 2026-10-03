/**
 * Transforme la page affichée en un court résumé lisible à voix haute : titre, sections, champs de formulaire, actions.
 * Il s'appuie sur la structure sémantique (h1/h2, landmarks, labels), pas sur le style : toute page respectant la
 * « Definition of Done » d'accessibilité (un h1, des labels, des landmarks) est lue correctement.
 */

type Locale = "fr" | "en"

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

function isHidden(element: Element): boolean {
  return element.closest("[hidden], [aria-hidden='true'], .sr-only") !== null && !element.closest("[data-voice-readable]")
}

function visibleTexts(root: ParentNode, selector: string, limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  root.querySelectorAll(selector).forEach((element) => {
    if (result.length >= limit) return
    if (isHidden(element)) return
    const text = clean(element.getAttribute("aria-label") || element.textContent)
    if (text && text.length <= 120 && !seen.has(text)) {
      seen.add(text)
      result.push(text)
    }
  })
  return result
}

/** Libellés des champs de saisie du contenu principal. */
export function fieldLabels(root: ParentNode, limit = 8): string[] {
  const labels: string[] = []
  root.querySelectorAll("input, select, textarea").forEach((field) => {
    if (labels.length >= limit) return
    if (field instanceof HTMLInputElement && ["hidden", "submit", "button", "checkbox", "radio", "file"].includes(field.type)) return
    if (isHidden(field)) return
    let label = clean(field.getAttribute("aria-label"))
    const id = field.getAttribute("id")
    if (!label && id) label = clean(root.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent)
    if (!label) label = clean(field.closest("label")?.textContent)
    if (label && !labels.includes(label)) labels.push(label)
  })
  return labels
}

const WORDS = {
  fr: {
    page: "Page",
    sections: "Sections",
    form: "Formulaire avec les champs",
    actions: "Actions disponibles",
    links: (n: number) => `${n} lien${n > 1 ? "s" : ""} de navigation`,
    hint: "Dites « aide » pour connaître les commandes vocales.",
    empty: "Cette page ne contient pas de texte à lire.",
  },
  en: {
    page: "Page",
    sections: "Sections",
    form: "Form with fields",
    actions: "Available actions",
    links: (n: number) => `${n} navigation link${n > 1 ? "s" : ""}`,
    hint: "Say “help” to hear the voice commands.",
    empty: "This page has no text to read.",
  },
} as const

/** Résumé parlé de la page. `withHint` ajoute le rappel de la commande d'aide. */
export function describePage(root: ParentNode, locale: Locale, options: { title?: string; withHint?: boolean } = {}): string {
  const w = WORDS[locale]
  const main = root.querySelector("main, [role='main']") ?? root
  const title = clean(main.querySelector("h1")?.textContent) || clean(options.title)
  const headings = visibleTexts(main, "h2", 6).filter((h) => h !== title)
  const fields = fieldLabels(main)
  const buttons = visibleTexts(main, "button:not([disabled]), [data-voice]", 6)
  const linkCount = main.querySelectorAll("a[href]").length

  const parts: string[] = []
  if (title) parts.push(`${w.page} : ${title}.`)
  if (headings.length) parts.push(`${w.sections} : ${headings.join(", ")}.`)
  if (fields.length) parts.push(`${w.form} : ${fields.join(", ")}.`)
  if (buttons.length) parts.push(`${w.actions} : ${buttons.join(", ")}.`)
  if (linkCount) parts.push(`${w.links(linkCount)}.`)
  if (parts.length === 0) return w.empty
  if (options.withHint) parts.push(w.hint)
  return parts.join(" ")
}

/** Texte complet (titres + paragraphes) du contenu principal, pour la commande « lis la page ». */
export function readableText(root: ParentNode, maxChars = 1800): string {
  const main = root.querySelector("main, [role='main']") ?? root
  const chunks: string[] = []
  main.querySelectorAll("h1, h2, h3, p, li").forEach((element) => {
    if (isHidden(element)) return
    const text = clean(element.textContent)
    if (text) chunks.push(text)
  })
  const full = chunks.join(". ")
  return full.length <= maxChars ? full : `${full.slice(0, maxChars).trimEnd()}…`
}
