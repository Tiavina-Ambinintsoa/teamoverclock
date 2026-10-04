import { z } from "zod"
import { LOCALES } from "@/lib/locale"

/** Téléphone fictif de Nova Terra : chiffres, espaces, +, tirets ; 6 à 20 caractères. */
const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\+?[0-9][0-9 ()-]{5,19}$/.test(value), "Numéro de téléphone invalide.")

export const profileDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(60),
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(60),
  phone: phoneSchema,
  locale: z.enum(LOCALES),
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean(),
})

export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>

/** Convertit le formulaire en colonnes de `profiles`. */
export function toProfileUpdate(values: ProfileDetailsValues) {
  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    phone: values.phone.trim() === "" ? null : values.phone.trim(),
    locale: values.locale,
    notification_prefs: { email: values.notifyEmail, in_app: values.notifyInApp },
    display_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
  }
}
