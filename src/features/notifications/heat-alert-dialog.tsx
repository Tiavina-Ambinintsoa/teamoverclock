import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Flame, MapPin } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ageAtDate, personalizedHeatAdvice } from "@/features/alerts/heatwave-guidance"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

type AlertNotification = {
  id: string
  title: string
  body: string
  entity_id: string
  read_at: string | null
}

type HeatAlert = {
  id: string
  title: string
  summary: string
  status: string
  source: string | null
  affected_sector_ids: string[]
  recommended_actions: string[]
  assembly_building_ids: string[]
}

type HealthProfile = {
  health_conditions: string[]
  consent_recommendations: boolean
}

type NearbyPlace = {
  id: string
  name: string
  address: string | null
  sector_id: string
}

const HEAT_KNOWLEDGE_ID = "deaf0d00-0000-4000-8000-000000000001"

export function HeatAlertDialog() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const userId = user?.id
  const isDemo = user?.isDemo
  const enabled = Boolean(supabase && userId && !isDemo)

  const notifications = useQuery({
    queryKey: ["heat-alert-notifications", user?.id],
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AlertNotification[]> => {
      if (!supabase) return []
      const { data, error } = await supabase.from("notifications")
        .select("id,title,body,entity_id,read_at")
        .eq("entity_type", "heat_alert")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
      if (error) throw new Error(error.message)
      return (data ?? []) as AlertNotification[]
    },
  })

  useEffect(() => {
    if (notifications.error) {
      toast.error(tx("Impossible de charger les alertes de votre secteur.", "Unable to load alerts for your sector."))
    }
  }, [notifications.error, tx])

  useEffect(() => {
    const client = supabase
    if (!client || !userId || isDemo) return
    const channel = client.channel(`heat-alerts:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, () => { void queryClient.invalidateQueries({ queryKey: ["heat-alert-notifications", userId] }) })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [queryClient, userId, isDemo])

  const active = notifications.data?.[0] ?? null

  const alert = useQuery({
    queryKey: ["heat-alert", active?.entity_id],
    enabled: Boolean(supabase && active?.entity_id),
    queryFn: async (): Promise<HeatAlert | null> => {
      if (!supabase || !active) return null
      const { data, error } = await supabase.from("dangers")
        .select("id,title,summary,status,source,affected_sector_ids,recommended_actions,assembly_building_ids")
        .eq("id", active.entity_id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as HeatAlert | null
    },
  })

  const health = useQuery({
    queryKey: ["citizen-health-profile", user?.id],
    enabled: Boolean(supabase && active && user && !user.isDemo && user.citizenId),
    queryFn: async (): Promise<HealthProfile | null> => {
      if (!supabase || !user) return null
      const { data, error } = await supabase.from("citizen_health_profiles")
        .select("health_conditions,consent_recommendations")
        .eq("profile_id", user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as HealthProfile | null
    },
  })

  const knowledge = useQuery({
    queryKey: ["heatwave-knowledge"],
    enabled: Boolean(supabase && active),
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase.from("knowledge_base")
        .select("title,content")
        .eq("id", HEAT_KNOWLEDGE_ID)
        .eq("is_published", true)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const nearby = useQuery({
    queryKey: ["heat-alert-nearby", alert.data?.assembly_building_ids],
    enabled: Boolean(supabase && alert.data?.assembly_building_ids.length),
    queryFn: async (): Promise<NearbyPlace[]> => {
      if (!supabase || !alert.data?.assembly_building_ids.length) return []
      const buildingIds = alert.data.assembly_building_ids
      const { data, error } = await supabase.from("buildings")
        .select("id,name,address,sector_id")
        .in("id", buildingIds)
      if (error) throw new Error(error.message)
      const places = (data ?? []) as NearbyPlace[]
      return places.sort((left, right) =>
        buildingIds.indexOf(left.id) - buildingIds.indexOf(right.id)
      )
    },
  })

  const dismiss = async () => {
    if (!supabase || !active) {
      return
    }
    const { error } = await supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", active.id)
    if (error) {
      toast.error(tx("Impossible de marquer l’alerte comme lue.", "Unable to mark the alert as read."))
      return
    }
    await queryClient.invalidateQueries({ queryKey: ["heat-alert-notifications", user?.id] })
  }

  const extraAdvice = personalizedHeatAdvice(
    ageAtDate(user?.birthDate),
    health.data?.health_conditions ?? [],
    health.data?.consent_recommendations === true,
    locale
  )
  const recommendedActions = alert.data?.recommended_actions ?? []

  return (
    <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open) void dismiss() }}>
      <DialogContent className="max-h-[90svh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto border-destructive/40 p-0">
        <div className="bg-destructive px-6 py-5 text-destructive-foreground">
          <DialogHeader>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"><Flame className="size-4" aria-hidden />{tx("Alerte urgente", "Urgent alert")}</p>
            <DialogTitle className="text-2xl">{alert.data?.title ?? active?.title}</DialogTitle>
            <DialogDescription className="text-destructive-foreground/90">
              {alert.data?.summary ?? active?.body}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-5 px-6 py-5">
          {alert.data?.source?.startsWith("satellite:") && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              {tx("Signalement issu d’une observation satellite simulée, vérifiée par un administrateur.", "Based on a simulated satellite observation verified by an administrator.")}
            </p>
          )}
          {alert.isError && <p role="alert" className="text-sm text-destructive">{alert.error.message}</p>}
          {knowledge.isError && <p role="alert" className="text-sm text-destructive">{knowledge.error.message}</p>}
          {notifications.isError && <p role="alert" className="text-sm text-destructive">{notifications.error.message}</p>}

          <section>
            <h3 className="font-semibold">{tx("Conseils de la base de connaissances", "Knowledge-base guidance")}</h3>
            {knowledge.data ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{knowledge.data.content}</p>
            ) : !knowledge.isError ? (
              <p className="mt-2 text-sm text-muted-foreground">{tx("Chargement des conseils…", "Loading guidance…")}</p>
            ) : null}
          </section>

          {recommendedActions.length > 0 && (
            <section>
              <h3 className="font-semibold">{tx("À faire maintenant", "What to do now")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {recommendedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </section>
          )}

          {extraAdvice.length > 0 && (
            <section aria-labelledby="heat-personal-advice">
              <h3 id="heat-personal-advice" className="font-semibold">{tx("Recommandations adaptées à votre profil", "Guidance tailored to your profile")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {extraAdvice.map((advice) => <li key={advice}>{advice}</li>)}
              </ul>
            </section>
          )}
          {health.isError && <p role="alert" className="text-sm text-destructive">{tx("Vos conseils personnalisés n’ont pas pu être chargés.", "Your personalized advice could not be loaded.")} {health.error.message}</p>}

          <section>
            <h3 className="font-semibold">{tx("Centres de soin à proximité", "Nearby care facilities")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{tx("Vérifiez les horaires avant de vous déplacer ; en cas de symptômes graves, contactez les secours.", "Check opening hours before travelling; for severe symptoms, contact emergency services.")}</p>
            {nearby.isError && <p role="alert" className="mt-2 text-sm text-destructive">{nearby.error.message}</p>}
            <ul className="mt-2 grid gap-2">
              {(nearby.data ?? []).map((place) => (
                <li key={place.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <span><strong className="block">{place.name}</strong>{place.address && <span className="text-muted-foreground">{place.address}</span>}</span>
                  <Button asChild size="sm" variant="outline"><Link to={`/map?sector=${encodeURIComponent(place.sector_id)}`}><MapPin aria-hidden />{tx("Carte", "Map")}</Link></Button>
                </li>
              ))}
              {(nearby.data?.length === 0 || (alert.data && alert.data.assembly_building_ids.length === 0)) && <li className="text-sm text-muted-foreground">{tx("Aucun centre de soin renseigné dans ce secteur.", "No care facility is listed in this sector.")}</li>}
              {nearby.isLoading && <li className="text-sm text-muted-foreground">{tx("Recherche des centres de soin…", "Finding nearby care facilities…")}</li>}
            </ul>
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {alert.data?.affected_sector_ids[0] && (
              <Button asChild variant="outline"><Link to={`/map?sector=${encodeURIComponent(alert.data.affected_sector_ids[0])}`} onClick={() => void dismiss()}>{tx("Voir le secteur sur la carte", "View affected sector on map")}</Link></Button>
            )}
            <Button onClick={() => void dismiss()}>{tx("J’ai compris", "I understand")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
