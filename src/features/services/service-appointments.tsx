import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/auth-context"
import type { Service, ServiceAppointment } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { effectiveServiceStatus, isWithinServiceHours, parseClockTime } from "@/features/services/service-availability"
import { useNow } from "@/hooks/use-now"

const APPOINTMENT_SELECT = "id,service_id,profile_id,starts_at,purpose,status,created_at,updated_at"

function localDate(value: string | number): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function describeAppointmentTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function ServiceAppointmentCalendar({ service, mode }: { service: Service; mode: "public" | "manage" }) {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const now = useNow(60_000)
  const [date, setDate] = useState("")
  const agendaDate = date || localDate(now)
  const [time, setTime] = useState("09:00")
  const [purpose, setPurpose] = useState("")
  const status = effectiveServiceStatus(service, now)
  const manager = Boolean(user?.isAdmin || (user?.profileRole === "service_admin" && user.serviceIds.includes(service.id)))

  const appointments = useQuery({
    queryKey: ["service-appointments", service.id, user?.id, mode],
    enabled: Boolean(supabase && user && !user.isDemo && (mode === "public" || manager)),
    queryFn: async (): Promise<ServiceAppointment[]> => {
      if (!supabase) return []
      let query = supabase.from("service_appointments").select(APPOINTMENT_SELECT)
        .eq("service_id", service.id)
        .neq("status", "cancelled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
      if (mode === "public" && user) query = query.eq("profile_id", user.id)
      const result = await query.limit(mode === "manage" ? 100 : 50)
      if (result.error) throw new Error(result.error.message)
      return (result.data ?? []) as ServiceAppointment[]
    },
  })

  const selectedDateAppointments = useMemo(
    () => (appointments.data ?? []).filter((item) => localDate(item.starts_at) === agendaDate),
    [appointments.data, agendaDate]
  )

  const book = useMutation({
    mutationFn: async () => {
      if (!supabase || !user || user.isDemo) throw new Error(tx("Connectez-vous avec un compte actif pour demander un rendez-vous.", "Sign in with an active account to request an appointment."))
      if (status !== "open") throw new Error(tx("Ce service n'accepte pas de rendez-vous pour le moment.", "This service is not accepting appointments right now."))
      const selectedMinute = parseClockTime(time)
      const [year, month, day] = date.split("-").map(Number)
      const startsAt = selectedMinute === null
        ? new Date(Number.NaN)
        : new Date(year, month - 1, day, Math.floor(selectedMinute / 60), selectedMinute % 60)
      if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
        throw new Error(tx("Choisissez une date et une heure dans le futur.", "Choose a date and time in the future."))
      }
      if (!isWithinServiceHours(service, date, time)) {
        throw new Error(tx("Ce créneau est en dehors des horaires d'ouverture du service.", "This time is outside the service's opening hours."))
      }
      const { error } = await supabase.from("service_appointments").insert({
        service_id: service.id,
        profile_id: user.id,
        starts_at: startsAt.toISOString(),
        purpose: purpose.trim(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Demande de rendez-vous envoyée.", "Appointment request sent."))
      setPurpose("")
      await queryClient.invalidateQueries({ queryKey: ["service-appointments", service.id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateStatus = useMutation({
    mutationFn: async (input: { id: string; status: "confirmed" | "cancelled" }) => {
      if (!supabase || !manager) throw new Error(tx("Vous n'avez pas l'autorisation de gérer ces rendez-vous.", "You are not allowed to manage these appointments."))
      const { error } = await supabase.from("service_appointments").update({ status: input.status }).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-appointments", service.id] })
      toast.success(tx("Rendez-vous mis à jour.", "Appointment updated."))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (mode === "manage") {
    if (!manager) return null
    return (
      <section className="mt-4 rounded-lg border p-4" aria-label={tx(`Agenda de ${service.name}`, `Appointments for ${service.name}`)}>
        <h3 className="font-semibold">{tx("Agenda des rendez-vous", "Appointment agenda")}</h3>
        <DataState data={appointments.data} isLoading={appointments.isLoading} error={appointments.error}
          onRetry={() => void appointments.refetch()} emptyTitle={tx("Aucun rendez-vous à venir", "No upcoming appointments")}>
          {(items) => (
            <ul className="mt-3 grid gap-2">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <time dateTime={item.starts_at} className="font-medium">{describeAppointmentTime(item.starts_at, locale)}</time>
                    <p className="text-muted-foreground">{item.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "confirmed" ? "secondary" : "highlight"}>
                      {item.status === "confirmed" ? tx("Confirmé", "Confirmed") : tx("À confirmer", "Awaiting confirmation")}
                    </Badge>
                    {item.status === "requested" && (
                      <Button size="sm" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: item.id, status: "confirmed" })}>
                        {tx("Confirmer", "Confirm")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: item.id, status: "cancelled" })}>
                      {tx("Annuler", "Cancel")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </section>
    )
  }

  return (
    <section aria-labelledby="service-appointments-title" className="rounded-xl border bg-card p-5">
      <h2 id="service-appointments-title" className="font-semibold">{tx("Agenda et rendez-vous", "Calendar and appointments")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{tx("Choisissez une date dans le calendrier et demandez un créneau auprès de ce service.", "Choose a date in the calendar and request an appointment with this service.")}</p>
      {!user || user.isDemo ? (
        <p className="mt-3 text-sm">{tx("Connectez-vous avec un compte actif pour réserver un rendez-vous.", "Sign in with an active account to request an appointment.")}{" "}
          <Link className="underline underline-offset-4" to="/connexion">{tx("Connexion", "Sign in")}</Link>
        </p>
      ) : status !== "open" ? (
        <output className="mt-3 block rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
          {tx("Les rendez-vous sont indisponibles tant que le service est fermé.", "Appointments are unavailable while the service is closed.")}
        </output>
      ) : (
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); book.mutate() }}>
          <div className="grid gap-1">
            <Label htmlFor="appointment-date">{tx("Date", "Date")}</Label>
            <Input id="appointment-date" type="date" min={localDate(now)} value={agendaDate} onChange={(event) => setDate(event.target.value)} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="appointment-time">{tx("Heure", "Time")}</Label>
            <Input id="appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="appointment-purpose">{tx("Motif du rendez-vous", "Appointment purpose")}</Label>
            <Input id="appointment-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} minLength={3} maxLength={1000} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={book.isPending || status !== "open"}>{tx("Demander ce rendez-vous", "Request this appointment")}</Button>
          </div>
        </form>
      )}
      <div className="mt-5 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{tx("Mon agenda", "My calendar")}</h3>
          <label htmlFor="appointment-agenda-date" className="sr-only">{tx("Afficher les rendez-vous de cette date", "Show appointments on this date")}</label>
          <Input id="appointment-agenda-date" type="date" value={agendaDate} onChange={(event) => setDate(event.target.value)} className="max-w-48" />
        </div>
        {appointments.isLoading ? <p className="mt-2 text-sm text-muted-foreground">{tx("Chargement de l'agenda…", "Loading calendar…")}</p>
          : appointments.error ? <p role="alert" className="mt-2 text-sm text-destructive">{appointments.error.message}</p>
            : selectedDateAppointments.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {selectedDateAppointments.map((item) => (
                  <li key={item.id} className="rounded-md border p-3 text-sm">
                    <time dateTime={item.starts_at} className="font-medium">{describeAppointmentTime(item.starts_at, locale)}</time>
                    <Badge className="ml-2" variant={item.status === "confirmed" ? "secondary" : "highlight"}>
                      {item.status === "confirmed" ? tx("Confirmé", "Confirmed") : tx("À confirmer", "Awaiting confirmation")}
                    </Badge>
                    <span className="text-muted-foreground"> · {item.purpose}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted-foreground">{tx("Aucun rendez-vous personnel pour cette date.", "No personal appointments on this date.")}</p>}
      </div>
    </section>
  )
}
