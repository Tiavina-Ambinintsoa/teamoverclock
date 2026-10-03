import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { Link, useParams } from "react-router"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBuildings, useSectors, useService } from "@/features/city/city-queries"
import { describeClosingDays, describeOpeningHours } from "@/features/services/hours"
import { useLocale } from "@/lib/locale"
import { formatDate } from "@/lib/query-helpers"

/** D05 — fiche détaillée d'un service : contact, horaires, démarches, documents, localisation. */
export function ServiceDetailPage() {
  const { slug } = useParams()
  const { tx, locale, tag } = useLocale()
  const service = useService(slug)
  const buildings = useBuildings()
  const sectors = useSectors()

  if (service.isLoading) return <PageLoader />
  const s = service.data
  if (!s) {
    return (
      <Container className="py-16">
        <title>{tx("Service introuvable", "Service not found")}</title>
        <div role="alert" className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold">{tx("Service introuvable", "Service not found")}</h1>
          <p className="mt-2 text-muted-foreground">{tx("Ce service n'existe pas ou n'est pas publié.", "This service does not exist or is not published.")}</p>
          <Button asChild className="mt-4"><Link to="/services">{tx("Tous les services", "All services")}</Link></Button>
        </div>
      </Container>
    )
  }

  const building = buildings.data?.find((b) => b.id === s.building_id)
  const sector = sectors.data?.find((x) => x.id === building?.sector_id)
  const hours = describeOpeningHours(s.opening_hours, locale)
  const closing = describeClosingDays(s.closing_days, locale)
  const closed = s.status !== "open"

  return (
    <Container className="max-w-4xl py-10">
      <title>{s.name}</title>
      <nav aria-label={tx("Fil d'Ariane", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <Link to="/services" className="underline-offset-4 hover:underline">{tx("Services", "Services")}</Link> / {s.name}
      </nav>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold">{s.name}</h1>
          <Badge variant="secondary">{s.category}</Badge>
          {s.is_emergency && <Badge variant="destructive">{tx("Urgence", "Emergency")}</Badge>}
          <StatusBadge kind="service" value={s.status} />
        </div>
        <p className="mt-3 text-muted-foreground">{s.description}</p>
        {closed && (
          <output className="mt-4 block rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
            {tx("Ce service est actuellement fermé ou suspendu. Utilisez le formulaire de contact pour être recontacté.", "This service is currently closed or suspended. Use the contact form to be called back.")}
          </output>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild><Link to={`/app/requests/new?service=${s.slug}`}>{tx("Contacter ce service", "Contact this service")}</Link></Button>
          {s.booking_url && <Button asChild variant="outline"><a href={s.booking_url} target="_blank" rel="noopener noreferrer">{tx("Prendre rendez-vous", "Book an appointment")}</a></Button>}
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="contact" className="rounded-xl border bg-card p-5">
          <h2 id="contact" className="mb-3 font-semibold">{tx("Contact et horaires", "Contact & hours")}</h2>
          <ul className="grid gap-2 text-sm">
            {s.phone && <li className="flex items-center gap-2"><Phone className="size-4" aria-hidden /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{s.phone}</a></li>}
            {s.email && <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden /><a href={`mailto:${s.email}`} className="underline-offset-4 hover:underline">{s.email}</a></li>}
            {s.address && <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{s.address}</li>}
            {hours.map((h) => <li key={h.days} className="flex items-center gap-2"><Clock className="size-4" aria-hidden />{h.days} : {h.hours}</li>)}
            {closing && <li className="text-muted-foreground">{tx("Fermé :", "Closed:")} {closing}</li>}
            <li className="text-muted-foreground">{tx("Langues :", "Languages:")} {s.languages.join(", ")}</li>
          </ul>
        </section>

        <section aria-labelledby="location" className="rounded-xl border bg-card p-5">
          <h2 id="location" className="mb-3 font-semibold">{tx("Localisation", "Location")}</h2>
          <p className="text-sm">{building?.name ?? "—"}{sector ? ` · ${sector.code} ${sector.name}` : ""}</p>
          {building && <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>}
          {building && <div className="mt-2"><StatusBadge kind="building" value={building.status} /></div>}
          <Button asChild variant="outline" size="sm" className="mt-4"><Link to={`/map?building=${building?.id ?? ""}`}>{tx("Voir sur la carte", "View on the map")}</Link></Button>
        </section>

        {s.procedures.length > 0 && (
          <section aria-labelledby="procedures" className="rounded-xl border bg-card p-5">
            <h2 id="procedures" className="mb-3 font-semibold">{tx("Démarches", "Procedures")}</h2>
            <ol className="grid list-decimal gap-1 pl-5 text-sm">{s.procedures.map((p) => <li key={p.step}>{p.text}</li>)}</ol>
          </section>
        )}

        <section aria-labelledby="docs" className="rounded-xl border bg-card p-5">
          <h2 id="docs" className="mb-3 font-semibold">{tx("Documents et tarifs", "Documents & fees")}</h2>
          {s.required_documents.length > 0 ? <ul className="list-disc pl-5 text-sm">{s.required_documents.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="text-sm text-muted-foreground">{tx("Aucun document requis.", "No document required.")}</p>}
          {s.fees && <p className="mt-3 text-sm"><span className="font-medium">{tx("Tarif :", "Fee:")}</span> {s.fees}</p>}
          <p className="mt-3 text-xs text-muted-foreground">{tx("Dernière mise à jour :", "Last updated:")} {formatDate(s.updated_at, tag)}</p>
        </section>
      </div>
    </Container>
  )
}
