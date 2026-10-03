import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { useSectors } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

export function CitizenResidenceForm() {
  const { user, refreshProfile } = useAuth()

  if (!user || user.isDemo || !user.citizenId || !supabase) return null

  return (
    <ResidenceFields
      key={`${user.id}:${user.sectorId ?? ""}`}
      profileId={user.id}
      currentSectorId={user.sectorId}
      onSaved={refreshProfile}
    />
  )
}

function ResidenceFields({
  profileId,
  currentSectorId,
  onSaved,
}: {
  profileId: string
  currentSectorId: string | null
  onSaved: () => Promise<void>
}) {
  const { tx } = useLocale()
  const sectors = useSectors()
  const queryClient = useQueryClient()
  const [sectorId, setSectorId] = useState(currentSectorId ?? "")

  const save = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error(tx("Supabase n’est pas configuré.", "Supabase is not configured."))
      if (!sectorId || !(sectors.data ?? []).some((sector) => sector.id === sectorId && sector.is_active)) {
        throw new Error(tx("Choisissez un secteur de résidence actif.", "Choose an active home sector."))
      }
      const { error } = await supabase.rpc("set_my_home_sector", { p_sector_id: sectorId })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await onSaved()
      await queryClient.invalidateQueries({ queryKey: ["citizen-health-profile", profileId] })
      toast.success(tx("Secteur de résidence enregistré.", "Home sector saved."))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section aria-labelledby="citizen-residence-title" className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 id="citizen-residence-title" className="text-xl font-semibold">
        {tx("Mon secteur de résidence", "My home sector")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tx(
          "Choisissez le secteur où vous habitez pour recevoir les alertes de danger qui vous concernent.",
          "Choose where you live so you can receive relevant local danger alerts."
        )}
      </p>
      {sectors.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">{sectors.error.message}</p>
      ) : (
        <form className="mt-4 grid gap-3 sm:max-w-lg" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
          <div className="grid gap-2">
            <Label htmlFor="citizen-home-sector">{tx("Secteur", "Sector")}</Label>
            <Select
              id="citizen-home-sector"
              value={sectorId}
              onChange={(event) => setSectorId(event.currentTarget.value)}
              disabled={sectors.isLoading}
              required
            >
              <option value="">{tx("Choisissez votre secteur…", "Choose your sector…")}</option>
              {(sectors.data ?? []).filter((sector) => sector.is_active).map((sector) => (
                <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-fit" disabled={save.isPending || sectors.isLoading || !sectorId || sectorId === currentSectorId}>
            {save.isPending ? tx("Enregistrement…", "Saving…") : tx("Enregistrer mon secteur", "Save my sector")}
          </Button>
        </form>
      )}
    </section>
  )
}
