import { z } from "zod"
import { LOCALES } from "@/lib/locale"

/** Âge en années entières à une date donnée ; null si la date est invalide ou future. */
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const birth = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate) return null
  if (birth.getTime() > now.getTime()) return null
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

export function isMinorBirthDate(birthDate: string, now: Date = new Date()): boolean {
  const age = ageFromBirthDate(birthDate, now)
  return age !== null && age < 18
}

export interface PasswordStrength {
  /** 0 (très faible) à 4 (très fort) */
  score: 0 | 1 | 2 | 3 | 4
  ok: boolean
  missing: string[]
}

/** Règles de robustesse (D01) : 8 caractères, minuscule, majuscule, chiffre ; le symbole renforce le score. */
export function passwordStrength(password: string): PasswordStrength {
  const missing: string[] = []
  if (password.length < 8) missing.push("8 caractères minimum")
  if (!/[a-z]/.test(password)) missing.push("une minuscule")
  if (!/[A-Z]/.test(password)) missing.push("une majuscule")
  if (!/[0-9]/.test(password)) missing.push("un chiffre")
  const symbol = /[^A-Za-z0-9]/.test(password)
  const long = password.length >= 12
  const base = 4 - missing.length
  const score = Math.max(0, Math.min(4, base + (missing.length === 0 ? (symbol ? 1 : 0) + (long ? 1 : 0) - 1 : 0))) as 0 | 1 | 2 | 3 | 4
  return { score, ok: missing.length === 0, missing }
}

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
})

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(60),
    lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(60),
    email: z.email("Adresse e-mail invalide."),
    birthDate: z.string().refine((value) => ageFromBirthDate(value) !== null, "Date de naissance invalide."),
    sectorId: z.string().min(1, "Choisissez votre secteur de résidence."),
    locale: z.enum(LOCALES),
    password: z
      .string()
      .refine((value) => passwordStrength(value).ok, "Mot de passe trop faible : 8 caractères, une minuscule, une majuscule et un chiffre."),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine((v) => v === true, "Vous devez accepter les conditions d'utilisation."),
    dataConsent: z.boolean().refine((v) => v === true, "Le consentement au traitement des données est obligatoire."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  })

export type SignupValues = z.infer<typeof signupSchema>

export const cinSchema = z.object({
  cin: z.string().trim().regex(/^NT-CIN-[0-9]{6}$/, "Format attendu : NT-CIN- suivi de 6 chiffres."),
})
