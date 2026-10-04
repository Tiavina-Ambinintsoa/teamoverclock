import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Flame } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSectors, useServices } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

type SourceMode = "admin" | "satellite"
type SatelliteObservation = {
  id: string
  satellite_code: string
  sector_id: string
  observed_at: string
  confidence_score: number | null
  validation_status: string
  analysis: Record<string, unknown>
}
type HeatAlertResult = { danger_id: string; report_id: string }

const DEFAULT_ACTIONS = [
  "Buvez régulièrement de l’eau et restez dans un endroit frais.",
  "Limitez les sorties et les efforts aux heures les plus chaudes.",
  "Prenez des nouvelles des personnes isolées ou vulnérables.",
  "En cas de confusion, malaise, perte de connaissance ou difficulté à respirer, appelez immédiatement les secours locaux.",
]

function splitRecommendations(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function describeObservation(analysis: Record<string, unknown>): string {
  return Object.entries(analysis)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" · ")
    .slice(0, 240)
}

export function HeatAlertCreateDialog() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const services = useServices({})
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SourceMode>("satellite")
  const [allSectors, setAllSectors] = useState(false)
  const [sectorId, setSectorId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [observationId, setObservationId] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [actions, setActions] = useState(DEFAULT_ACTIONS.join("\n"))
  const [validUntil, setValidUntil] = useState("")

  const observations = useQuery({
    queryKey: ["heat-alert-satellite-observations"],
    enabled: Boolean(open && mode === "satellite" && supabase),
    queryFn: async (): Promise<SatelliteObservation[]> => {
      if (!supabase) return []
      const { data, error } = await supabase.from("satellite_observations")
        .select("id,satellite_code,sector_id,observed_at,confidence_score,validation_status,analysis")
        .neq("validation_status", "rejected")
        .order("observed_at", { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return (data ?? []) as SatelliteObservation[]
    },
  })

  const availableObservations = useMemo(
    () => (observations.data ?? []).filter((observation) => !sectorId || observation.sector_id === sectorId),
    [observations.data, sectorId]
  )

  const create = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error(tx("Supabase n’est pas configuré.", "Supabase is not configured."))
      const recommendations = splitRecommendations(actions)
      if ((!allSectors && !sectorId) || !serviceId) throw new Error(tx("Choisissez le secteur et le service responsable.", "Choose the sector and responsible service."))
      if (mode === "satellite" && !observationId) throw new Error(tx("Choisissez une observation satellite.", "Choose a satellite observation."))
      if (allSectors && mode === "satellite") throw new Error(tx("Une observation satellite concerne un seul secteur ; choisissez le constat administrateur pour une diffusion générale.", "A satellite observation covers one sector; choose administrator report for a city-wide alert."))
      if (recommendations.length < 1 || recommendations.length > 8 || recommendations.some((item) => item.length < 3 || item.length > 240)) {
        throw new Error(tx("Saisissez de 1 à 8 recommandations (3 à 240 caractères chacune).", "Enter 1 to 8 recommendations (3 to 240 characters each)."))
      }
      const { data, error } = await supabase.rpc("create_heatwave_alert", {
        p_title: title.trim(),
        p_summary: summary.trim(),
        p_sector_id: allSectors ? null : sectorId,
        p_all_sectors: allSectors,
        p_service_id: serviceId,
        p_satellite_observation_id: mode === "satellite" ? observationId : null,
        p_recommended_actions: recommendations,
        p_valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      })
      if (error) throw new Error(error.message)
      const created = (data as HeatAlertResult[] | null)?.[0]
      if (!created?.danger_id || !created.report_id) {
        throw new Error(tx("L’alerte a été enregistrée sans identifiant de confirmation.", "Alert creation returned no confirmation IDs."))
      }
      return created
    },
    onSuccess: async ({ danger_id: dangerId }) => {
      setOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manage-dangers"] }),
        queryClient.invalidateQueries({ queryKey: ["dangers"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-reports"] }),
      ])
      if (!supabase) return
      const { error } = await supabase.functions.invoke("dispatch-heat-alert", { body: { dangerId } })
      if (error) {
        toast.error(tx(
          "Alerte et rapport créés, mais la diffusion immédiate a échoué. Vérifiez le webhook Supabase.",
          "Alert and report created, but immediate delivery failed. Check the Supabase webhook."
        ))
      } else {
        toast.success(tx("Alerte canicule publiée et signalement critique créé.", "Heat alert published and critical report created."))
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const selectedSector = sectors.data?.find((sector) => sector.id === sectorId)
  const formValid = title.trim().length >= 3 && title.trim().length <= 120 && summary.trim().length >= 10 &&
    summary.trim().length <= 500 && Boolean((allSectors || sectorId) && serviceId) &&
    (allSectors ? mode === "admin" : mode === "admin" || Boolean(observationId)) && !create.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive"><Flame aria-hidden />{tx("Alerte canicule", "Heatwave alert")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tx("Créer une alerte canicule critique", "Create a critical heatwave alert")}</DialogTitle>
          <DialogDescription>
            {tx("Un signalement critique est créé. Vous pouvez notifier un secteur ou toute la ville. Toute observation satellite simulée doit être vérifiée par un administrateur.", "A critical report is created. You can notify one sector or the whole city. Simulated satellite observations must be verified by an administrator.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {sectors.isError && <p role="alert" className="text-sm text-destructive">{sectors.error.message}</p>}
          {services.isError && <p role="alert" className="text-sm text-destructive">{services.error.message}</p>}
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{tx("Source du signalement", "Report source")}</legend>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={mode === "satellite" ? "default" : "outline"} disabled={allSectors} onClick={() => { setMode("satellite"); setObservationId("") }}>
                {tx("Observation satellite", "Satellite observation")}
              </Button>
              <Button type="button" size="sm" variant={mode === "admin" ? "default" : "outline"} onClick={() => { setMode("admin"); setObservationId("") }}>
                {tx("Constat administrateur", "Administrator report")}
              </Button>
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{tx("Étendue de l’alerte", "Alert coverage")}</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={!allSectors ? "default" : "outline"}
                onClick={() => setAllSectors(false)}
              >
                {tx("Un secteur", "One sector")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allSectors ? "destructive" : "outline"}
                onClick={() => {
                  setAllSectors(true)
                  setMode("admin")
                  setObservationId("")
                }}
              >
                {tx("Tous les secteurs", "All sectors")}
              </Button>
            </div>
            {allSectors && <p className="text-sm text-destructive">{tx("L’alerte sera envoyée à tous les habitants enregistrés dans un secteur actif.", "The alert will be sent to all residents registered in an active sector.")}</p>}
          </fieldset>

          {mode === "satellite" && (
            <div className="grid gap-2">
              <Label htmlFor="heat-observation">{tx("Observation à vérifier", "Observation to verify")}</Label>
              <Select
                id="heat-observation"
                value={observationId}
                onChange={(event) => {
                  const selected = availableObservations.find((row) => row.id === event.currentTarget.value)
                  setObservationId(event.currentTarget.value)
                  if (selected) {
                    setSectorId(selected.sector_id)
                    if (!title.trim()) setTitle(tx("Canicule extrême détectée", "Extreme heat detected"))
                    if (!summary.trim()) setSummary(describeObservation(selected.analysis))
                  }
                }}
              >
                <option value="">{tx("Choisir une observation…", "Choose an observation…")}</option>
                {availableObservations.map((observation) => (
                  <option key={observation.id} value={observation.id}>
                    {observation.satellite_code} · {sectors.data?.find((sector) => sector.id === observation.sector_id)?.code ?? observation.sector_id.slice(0, 8)} · {new Date(observation.observed_at).toLocaleString(tag)}
                    {observation.confidence_score === null ? "" : ` · ${Math.round(observation.confidence_score * 100)} %`}
                  </option>
                ))}
              </Select>
              {observations.isLoading && <p className="text-xs text-muted-foreground">{tx("Chargement des observations…", "Loading observations…")}</p>}
              {observations.isError && <p role="alert" className="text-sm text-destructive">{observations.error.message}</p>}
              {observationId && availableObservations.find((row) => row.id === observationId)?.analysis && (
                <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  {tx("Analyse satellite simulée :", "Simulated satellite analysis:")} {describeObservation(availableObservations.find((row) => row.id === observationId)?.analysis ?? {})}
                </p>
              )}
              {!observations.isLoading && !observations.isError && availableObservations.length === 0 && (
                <p className="text-xs text-muted-foreground">{tx("Aucune observation disponible ; choisissez le constat administrateur.", "No observations available; choose administrator report instead.")}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="heat-title">{tx("Titre", "Title")}</Label>
            <Input id="heat-title" maxLength={120} value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder={tx("Canicule extrême", "Extreme heatwave")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="heat-summary">{tx("Résumé du constat", "Situation summary")}</Label>
            <Textarea id="heat-summary" maxLength={500} value={summary} onChange={(event) => setSummary(event.currentTarget.value)} placeholder={tx("Décrivez brièvement la zone et la situation observée.", "Briefly describe the affected area and observed situation.")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!allSectors && <div className="grid gap-2">
              <Label htmlFor="heat-sector">{tx("Secteur concerné", "Affected sector")}</Label>
              <Select id="heat-sector" value={sectorId} onChange={(event) => { setSectorId(event.currentTarget.value); setObservationId("") }}>
                <option value="">{tx("Choisir…", "Choose…")}</option>
                {(sectors.data ?? []).filter((sector) => sector.is_active).map((sector) => <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>)}
              </Select>
              {selectedSector && <p className="text-xs text-muted-foreground">{selectedSector.name}</p>}
            </div>}
            <div className="grid gap-2">
              <Label htmlFor="heat-service">{tx("Service de santé responsable", "Responsible health service")}</Label>
              <Select id="heat-service" value={serviceId} onChange={(event) => setServiceId(event.currentTarget.value)}>
                <option value="">{tx("Choisir…", "Choose…")}</option>
                {(services.data ?? []).filter((service) => service.status === "open").map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="heat-until">{tx("Fin de validité (facultatif)", "Alert expiry (optional)")}</Label>
            <Input id="heat-until" type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.currentTarget.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="heat-actions">{tx("Recommandations (une par ligne)", "Recommendations (one per line)")}</Label>
            <Textarea id="heat-actions" rows={5} value={actions} onChange={(event) => setActions(event.currentTarget.value)} />
            <p className="text-xs text-muted-foreground">{tx("De 1 à 8 recommandations, entre 3 et 240 caractères chacune.", "1 to 8 recommendations, 3 to 240 characters each.")}</p>
          </div>
          <Button disabled={!formValid || (mode === "satellite" && observations.isLoading)} onClick={() => create.mutate()}>
            {create.isPending ? tx("Publication…", "Publishing…") : tx("Publier et notifier le secteur", "Publish and notify sector")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
