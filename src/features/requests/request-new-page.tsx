import { useRef, useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { dueDateFor, safeFileName, validateAttachments } from "@/features/requests/request-workflow"
import { copyLocale, useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"
import { effectiveServiceStatus } from "@/features/services/service-availability"
import { useNow } from "@/hooks/use-now"

const CATEGORIES = [
  { value: "information", fr: "Information", en: "Information" },
  { value: "administrative", fr: "Démarche administrative", en: "Administrative procedure" },
  { value: "infrastructure", fr: "Infrastructure / voirie", en: "Infrastructure / roads" },
  { value: "billing", fr: "Facturation", en: "Billing" },
  { value: "safety", fr: "Sécurité", en: "Safety" },
  { value: "other", fr: "Autre", en: "Other" },
]

/** D04 — formulaire de contact d'un service : numéro de suivi unique, pièces jointes contrôlées, envoi non dupliqué. */
export function RequestNewPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const queryClient = useQueryClient()
  const now = useNow(60_000)
  const [params] = useSearchParams()
  const services = useServices({})
  const published = (services.data ?? []).filter((s) => s.status !== "hidden" && s.published_at)

  const [serviceSlug, setServiceSlug] = useState(params.get("service") ?? "")
  const [category, setCategory] = useState("information")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [consent, setConsent] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [tracking, setTracking] = useState<string | null>(null)
  const selectedService = published.find((service) => service.slug === serviceSlug)
  const serviceAvailable = selectedService ? effectiveServiceStatus(selectedService, now) === "open" : false
  // Identifiant généré une seule fois : un second envoi accidentel échoue sur la clé primaire au lieu de créer un doublon.
  const requestId = useRef(crypto.randomUUID())

  const submit = useMutation({
    mutationFn: async () => {
      if (!supabase || !user) throw new Error(tx("Connexion requise.", "Sign-in required."))
      const service = published.find((s) => s.slug === serviceSlug)
      if (!service) throw new Error(tx("Choisissez un service destinataire.", "Choose a recipient service."))
      if (effectiveServiceStatus(service, now) !== "open") throw new Error(tx("Ce service est temporairement indisponible. Choisissez un autre service ou réessayez plus tard.", "This service is temporarily unavailable. Choose another service or try again later."))
      const fileError = validateAttachments(files)
      if (fileError) throw new Error(fileError)

      const attachments: { path: string; name: string; mime: string }[] = []
      for (const file of files) {
        const path = `${user.id}/${requestId.current}/${safeFileName(file.name)}`
        const { error } = await supabase.storage.from("request-attachments").upload(path, file, { contentType: file.type, upsert: true })
        if (error) throw new Error(error.message)
        attachments.push({ path, name: file.name, mime: file.type })
      }

      const { data, error } = await supabase
        .from("requests")
        .insert({
          id: requestId.current,
          service_id: service.id,
          category,
          subject: subject.trim(),
          description: description.trim(),
          urgency_flag: urgent,
          priority: urgent ? "high" : "medium",
          due_at: dueDateFor(service.default_sla_hours),
          attachments,
        })
        .select("tracking_number")
        .single()
      if (error) {
        // Double envoi : la demande existe déjà, on récupère son numéro.
        if (error.code === "23505") {
          const existing = await supabase.from("requests").select("tracking_number").eq("id", requestId.current).maybeSingle()
          if (existing.data) return existing.data.tracking_number as string
        }
        throw new Error(error.message)
      }
      return data.tracking_number as string
    },
    onSuccess: async (trackingNumber) => {
      setTracking(trackingNumber)
      await queryClient.invalidateQueries({ queryKey: ["my-requests"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!submit.isPending && !tracking) submit.mutate()
  }

  if (tracking) {
    return (
      <Container className="max-w-xl">
        <title>{tx("Demande envoyée", "Request sent")}</title>
        <output className="grid justify-items-center gap-3 rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="size-10 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold"><AuroraTitle>{tx("Demande envoyée", "Request sent")}</AuroraTitle></h1>
          <p>{tx("Votre numéro de suivi :", "Your tracking number:")}</p>
          <p className="rounded-lg bg-muted px-4 py-2 font-mono text-lg">{tracking}</p>
          <p className="text-sm text-muted-foreground">{tx("Vous serez notifié à chaque changement de statut.", "You will be notified of every status change.")}</p>
          <div className="mt-2 flex gap-3">
            <Button asChild><Link to="/app/requests">{tx("Mes demandes", "My requests")}</Link></Button>
            <Button asChild variant="outline"><Link to="/app">{tx("Tableau de bord", "Dashboard")}</Link></Button>
          </div>
        </output>
      </Container>
    )
  }

  return (
    <Container className="max-w-2xl">
      <title>{tx("Contacter un service", "Contact a service")}</title>
      <PageHeader eyebrow={tx("Mon espace", "My space")} title={tx("Contacter un service", "Contact a service")} description={tx("Décrivez votre demande : elle est transmise au service concerné et vous recevez un numéro de suivi.", "Describe your request: it is sent to the relevant service and you receive a tracking number.")} />
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border bg-card p-6" aria-busy={submit.isPending}>
        <div className="grid gap-2">
          <Label htmlFor="r-service">{tx("Service destinataire", "Recipient service")}</Label>
          <Select id="r-service" value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} required>
            <option value="">{tx("Choisir…", "Choose…")}</option>
            {published.map((s) => {
              const available = effectiveServiceStatus(s, now) === "open"
              return <option key={s.id} value={s.slug} disabled={!available}>{s.name}{available ? "" : ` — ${tx("indisponible", "unavailable")}`}</option>
            })}
          </Select>
        </div>
        {selectedService && !serviceAvailable && (
          <output className="rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
            <strong>{tx("Service indisponible.", "Service unavailable.")}</strong>{" "}
            {selectedService.status_reason || tx("Les demandes en ligne sont suspendues pour le moment.", "Online requests are paused right now.")}
            {selectedService.reopens_at && ` ${tx("Réouverture prévue :", "Expected to reopen:")} ${new Intl.DateTimeFormat(locale).format(new Date(selectedService.reopens_at))}`}
          </output>
        )}
        <div className="grid gap-2">
          <Label htmlFor="r-category">{tx("Catégorie", "Category")}</Label>
          <Select id="r-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c[copyLocale(locale)]}</option>)}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="r-subject">{tx("Sujet", "Subject")}</Label>
          <Input id="r-subject" value={subject} minLength={3} maxLength={150} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="r-desc">{tx("Description détaillée", "Detailed description")}</Label>
          <Textarea id="r-desc" value={description} minLength={10} maxLength={5000} className="min-h-32" onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="r-files">{tx("Pièces jointes (facultatif — JPG, PNG, WEBP, PDF ; 5 Mo ; 5 fichiers)", "Attachments (optional — JPG, PNG, WEBP, PDF; 5 MB; 5 files)")}</Label>
          <input id="r-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? [])
              const problem = validateAttachments(list)
              if (problem) {
                toast.error(problem)
                e.target.value = ""
                setFiles([])
              } else setFiles(list)
            }} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />{tx("Cette demande est urgente", "This request is urgent")}</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />{tx("J'accepte le traitement de mes données pour traiter cette demande.", "I accept the processing of my data to handle this request.")}</label>
        <Button type="submit" size="lg" data-voice="envoyer ma demande" data-voice-confirm disabled={submit.isPending || !serviceAvailable || !consent || subject.trim().length < 3 || description.trim().length < 10}>
          {submit.isPending ? tx("Envoi…", "Sending…") : tx("Envoyer ma demande", "Send my request")}
        </Button>
      </form>
    </Container>
  )
}
