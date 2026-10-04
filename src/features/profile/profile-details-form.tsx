import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { useAuth } from "@/features/auth/auth-context"
import { profileDetailsSchema, toProfileUpdate, type ProfileDetailsValues } from "@/features/profile/schema"
import { LOCALE_OPTIONS, useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

/** D08 — informations du profil : identité, téléphone, langue et préférences de notification. */
export function ProfileDetailsForm() {
  const { user, refreshProfile } = useAuth()
  const { tx, locale, setLocale } = useLocale()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
      locale: user?.locale ?? locale,
      notifyEmail: true,
      notifyInApp: true,
    },
  })

  if (!user || user.isDemo || !supabase) return null
  const client = supabase

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const { error } = await client.from("profiles").update(toProfileUpdate(values)).eq("id", user.id)
      if (error) throw new Error(error.message)
      setLocale(values.locale)
      await refreshProfile()
      toast.success(tx("Profil enregistré.", "Profile saved."))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Enregistrement impossible.", "Unable to save."))
    } finally {
      setSaving(false)
    }
  })

  const error = (name: keyof ProfileDetailsValues) =>
    errors[name]?.message ? <p role="alert" className="text-sm text-destructive">{errors[name]?.message}</p> : null

  return (
    <section aria-labelledby="profile-details-title" className="rounded-xl border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="profile-details-title" className="text-xl font-semibold">{tx("Mon profil", "My profile")}</h2>
        <div className="flex gap-2">
          <StatusBadge kind="role" value={user.profileRole} />
          <StatusBadge kind="account" value={user.accountStatus} />
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="p-first">{tx("Prénom", "First name")}</Label>
            <Input id="p-first" autoComplete="given-name" aria-invalid={errors.firstName ? true : undefined} {...register("firstName")} />
            {error("firstName")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-last">{tx("Nom", "Last name")}</Label>
            <Input id="p-last" autoComplete="family-name" aria-invalid={errors.lastName ? true : undefined} {...register("lastName")} />
            {error("lastName")}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="p-phone">{tx("Téléphone", "Phone")}</Label>
            <Input id="p-phone" type="tel" autoComplete="tel" aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
            {error("phone")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-locale">{tx("Langue", "Language")}</Label>
            <Select id="p-locale" {...register("locale")}>
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{tx("Notifications", "Notifications")}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" {...register("notifyInApp")} /> {tx("Dans l'application", "In the app")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" {...register("notifyEmail")} /> {tx("Par e-mail", "By email")}</label>
        </fieldset>
        <Button type="submit" disabled={saving} className="w-fit">{saving ? tx("Enregistrement…", "Saving…") : tx("Enregistrer", "Save")}</Button>
      </form>
    </section>
  )
}
