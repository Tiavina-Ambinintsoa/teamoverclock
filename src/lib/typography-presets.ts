/** Choix de polices auto-hébergées disponibles dans Apparence. */
export const TYPOGRAPHIES = [
  { id: "theme", label: "Selon la palette", hint: "La police de titres change avec la palette." },
  { id: "instrument", label: "Instrument Sans", hint: "Sobre et très lisible." },
  { id: "bricolage", label: "Bricolage Grotesque", hint: "Expressive, pour des titres marqués." },
  { id: "fraunces", label: "Fraunces", hint: "Éditoriale avec empattements." },
  { id: "system", label: "Police système", hint: "Utilise les polices déjà installées." },
] as const

export type TypographyId = (typeof TYPOGRAPHIES)[number]["id"]

export function isTypographyId(value: unknown): value is TypographyId {
  return TYPOGRAPHIES.some((typography) => typography.id === value)
}
