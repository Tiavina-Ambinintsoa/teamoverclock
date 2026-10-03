export const HEALTH_CONDITIONS = [
  { id: "cardiac", fr: "Maladie cardiaque ou hypertension", en: "Heart condition or high blood pressure" },
  { id: "respiratory", fr: "Maladie respiratoire", en: "Respiratory condition" },
  { id: "diabetes", fr: "Diabète", en: "Diabetes" },
  { id: "renal", fr: "Maladie rénale", en: "Kidney condition" },
  { id: "mobility", fr: "Mobilité réduite ou difficulté à se rafraîchir seul", en: "Reduced mobility or difficulty cooling down alone" },
  { id: "other", fr: "Autre condition augmentant ma vulnérabilité à la chaleur", en: "Another condition that increases my heat vulnerability" },
] as const

export type HealthCondition = (typeof HEALTH_CONDITIONS)[number]["id"]

export function ageAtDate(birthDate: string | null | undefined, today = new Date()): number | null {
  if (!birthDate) return null
  const date = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(date.getTime()) || date > today) return null
  let age = today.getFullYear() - date.getFullYear()
  const birthdayNotReached =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  if (birthdayNotReached) age -= 1
  return age
}

export function personalizedHeatAdvice(
  age: number | null,
  conditions: readonly string[],
  consent: boolean,
  locale: "fr" | "en" = "fr"
): string[] {
  if (!consent) return []
  const vulnerableAge = age !== null && (age >= 65 || age < 5)
  const vulnerableCondition = conditions.some((condition) =>
    HEALTH_CONDITIONS.some((known) => known.id === condition)
  )
  if (!vulnerableAge && !vulnerableCondition) return []

  return locale === "fr"
    ? [
        "Vous êtes plus vulnérable à la chaleur : restez autant que possible dans un lieu frais et demandez à une personne de confiance de prendre régulièrement de vos nouvelles.",
        "Gardez vos traitements habituels, mais demandez conseil à un professionnel de santé si vous êtes inquiet ; ne changez jamais une dose de votre propre initiative.",
        "En cas de confusion, malaise, perte de connaissance ou difficulté à respirer, appelez immédiatement les secours locaux.",
      ]
    : [
        "You may be more vulnerable to heat: stay in a cool place as much as possible and ask someone you trust to check on you regularly.",
        "Continue your usual treatment, but ask a health professional if concerned; never change a dose on your own.",
        "For confusion, fainting, loss of consciousness, or difficulty breathing, contact local emergency services immediately.",
      ]
}
