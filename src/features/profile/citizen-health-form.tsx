import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { HEALTH_CONDITIONS, ageAtDate, type HealthCondition } from "@/features/alerts/heatwave-guidance"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

type HealthProfile = {
  blood_group: string | null
  health_conditions: string[]
  consent_recommendations: boolean
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export function CitizenHealthForm() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const profile = useQuery({
    queryKey: ["citizen-health-profile", user?.id],
    enabled: Boolean(supabase && user && !user.isDemo && user.citizenId),
    queryFn: async (): Promise<HealthProfile | null> => {
      if (!supabase || !user) return null
      const { data, error } = await supabase.from("citizen_health_profiles")
        .select("blood_group,health_conditions,consent_recommendations")
        .eq("profile_id", user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as HealthProfile | null
    },
  })

  if (!user || user.isDemo || !user.citizenId || !supabase) return null
  const age = ageAtDate(user.birthDate)

  return (
    <section aria-labelledby="citizen-health-title" className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 id="citizen-health-title" className="text-xl font-semibold">
        {tx("Informations utiles en cas d’alerte", "Information for emergency alerts")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tx(
          "Ces informations sont facultatives et privées. Votre âge vient de votre date de naissance déjà enregistrée. Elles ne sont utilisées que pour adapter vos conseils de sécurité si vous y consentez.",
          "This information is optional and private. Your age is calculated from your existing date of birth. It is used only to tailor safety guidance if you consent."
        )}
      </p>
      {profile.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{tx("Chargement…", "Loading…")}</p>
      ) : profile.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">{profile.error.message}</p>
      ) : (
        <CitizenHealthFields
          key={`${user.id}:${profile.data?.consent_recommendations ?? false}:${profile.data?.blood_group ?? ""}:${profile.data?.health_conditions.join(",") ?? ""}`}
          profile={profile.data ?? null}
          profileId={user.id}
          age={age}
        />
      )}
    </section>
  )
}

function CitizenHealthFields({ profile, profileId, age }: { profile: HealthProfile | null; profileId: string; age: number | null }) {
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const [consent, setConsent] = useState(profile?.consent_recommendations ?? false)
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group ?? "")
  const [conditions, setConditions] = useState<HealthCondition[]>((profile?.health_conditions ?? []) as HealthCondition[])

  const save = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error(tx("Connexion requise.", "Sign-in required."))
      const { error } = await supabase.from("citizen_health_profiles").upsert({
        profile_id: profileId,
        blood_group: consent ? bloodGroup || null : null,
        health_conditions: consent ? conditions : [],
        consent_recommendations: consent,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Informations de santé enregistrées.", "Health information saved."))
      await queryClient.invalidateQueries({ queryKey: ["citizen-health-profile", profileId] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggleCondition = (condition: HealthCondition) => {
    setConditions((current) =>
      current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition]
    )
  }

  return (
    <form className="mt-5 grid gap-5" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="health-age">{tx("Âge", "Age")}</Label>
        <input id="health-age" value={age === null ? tx("Non renseigné", "Not provided") : `${age} ${tx("ans", "years")}`} readOnly className="h-10 rounded-md border bg-muted px-3 text-sm text-muted-foreground" />
      </div>

      <div className="grid gap-2">
        <div className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            id="heat-recommendation-consent"
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={consent}
            onChange={(event) => setConsent(event.currentTarget.checked)}
          />
          <div>
            <Label htmlFor="heat-recommendation-consent" className="font-medium">{tx("J’accepte l’utilisation de ces informations pour personnaliser mes recommandations de sécurité.", "I agree to use this information to personalize my safety recommendations.")}</Label>
            <p className="mt-1 text-muted-foreground">{tx("Vous pouvez retirer votre accord et effacer ces informations à tout moment.", "You can withdraw consent and clear this information at any time.")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="health-blood-group">{tx("Groupe sanguin (facultatif)", "Blood group (optional)")}</Label>
        <Select id="health-blood-group" value={bloodGroup} onChange={(event) => setBloodGroup(event.currentTarget.value)} disabled={!consent}>
          <option value="">{tx("Non renseigné", "Not provided")}</option>
          {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
        </Select>
        <p className="text-xs text-muted-foreground">{tx("Le groupe sanguin n’influence pas les conseils liés à la chaleur.", "Blood group does not affect heat-safety guidance.")}</p>
      </div>

      <fieldset disabled={!consent} className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{tx("Situations pouvant augmenter ma vulnérabilité à la chaleur", "Conditions that may increase my vulnerability to heat")}</legend>
        {HEALTH_CONDITIONS.map((condition) => (
          <label key={condition.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={conditions.includes(condition.id)}
              onChange={() => toggleCondition(condition.id)}
            />
            {locale === "fr" ? condition.fr : condition.en}
          </label>
        ))}
      </fieldset>

      <Button type="submit" className="w-fit" disabled={save.isPending}>
        {save.isPending ? tx("Enregistrement…", "Saving…") : tx("Enregistrer mes préférences santé", "Save my health preferences")}
      </Button>
    </form>
  )
}
