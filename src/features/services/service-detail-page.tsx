import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { Link, useParams } from "react-router"
import { useState } from "react"
import { useSearchParams } from "react-router"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { filterBuildingsForService, filterFacilities, useBuildings, useSectors, useService } from "@/features/city/city-queries"
import { HexMap, type MapLayers, type MapSelection } from "@/features/map/hex-map"
import { describeClosingDays, describeOpeningHours } from "@/features/services/hours"
import { useLocale } from "@/lib/locale"
import { formatDate } from "@/lib/query-helpers"
import { FACILITY_TYPE_LABELS, pickLabel } from "@/lib/status-labels"

const FACILITY_MAP_LAYERS: MapLayers = {
  sectors: true, buildings: true, transports: false, dangers: false, reports: false, observations: false,
}

/** D05 — fiche détaillée d'un service : contact, horaires, démarches, documents, localisation. */
export function ServiceDetailPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const { tx, locale, tag } = useLocale()
  const service = useService(slug)
  const buildings = useBuildings()
  const sectors = useSectors()
  const [mapSelection, setMapSelection] = useState<MapSelection>(null)
  const facilitySearch = params.get("q") ?? ""
  const facilityType = params.get("type") ?? ""

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
  const serviceFacilities = filterBuildingsForService(buildings.data ?? [], s.id)
  const facilities = filterFacilities(serviceFacilities, facilitySearch, facilityType)
  const facilityTypes = Array.from(new Set(serviceFacilities.flatMap((facility) => facility.facility_type ? [facility.facility_type] : []))).sort()
  const updateFacilityFilters = (patch: { q?: string; type?: string }) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }
  const selectedFacility = mapSelection?.type === "building"
    ? facilities.find((facility) => facility.id === mapSelection.id)
    : undefined

  return (
    <Container className="max-w-6xl py-10">
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
      <section aria-labelledby="facilities" className="mt-6 rounded-xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="facilities" className="font-semibold">{tx("Établissements de ce service", "Facilities for this service")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tx("Les lieux de proximité rattachés à ce service.", "Local facilities assigned to this service.")}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to={`/map?service=${encodeURIComponent(s.id)}&q=${encodeURIComponent(facilitySearch)}&type=${encodeURIComponent(facilityType)}`}>{tx("Ouvrir la carte filtrée", "Open filtered map")}</Link></Button>
        </div>
        {buildings.isLoading ? (
          <p className="text-sm text-muted-foreground">{tx("Chargement des établissements…", "Loading facilities…")}</p>
        ) : buildings.error ? (
          <p role="alert" className="text-sm text-destructive">{tx("Impossible de charger les établissements.", "Unable to load facilities.")} {buildings.error.message}</p>
        ) : serviceFacilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("Aucun établissement n'est encore rattaché à ce service.", "No facilities are assigned to this service yet.")}</p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid gap-1">
                <Label htmlFor="facility-search">{tx("Rechercher un établissement ou une prestation", "Search facilities or services offered")}</Label>
                <Input id="facility-search" type="search" value={facilitySearch} onChange={(event) => updateFacilityFilters({ q: event.target.value })} placeholder={tx("Urgences, chirurgie, pharmacie…", "Emergency care, surgery, pharmacy…")} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="facility-type">{tx("Type d'établissement", "Facility type")}</Label>
                <Select id="facility-type" value={facilityType} onChange={(event) => updateFacilityFilters({ type: event.target.value })}>
                  <option value="">{tx("Tous les types", "All types")}</option>
                  {facilityTypes.map((type) => <option key={type} value={type}>{pickLabel(FACILITY_TYPE_LABELS, type, locale)}</option>)}
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{tx(`${facilities.length} établissement(s) trouvé(s)`, `${facilities.length} facility/facilities found`)}</p>
            {facilities.length === 0 ? (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">{tx("Aucun établissement ne correspond à ces filtres.", "No facilities match these filters.")}</p>
            ) : <div className="grid gap-4 lg:grid-cols-2">
            <ul className="grid content-start gap-2">
              {facilities.map((facility) => (
                <li key={facility.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">
                        <button type="button" className="text-left underline-offset-4 hover:underline" onClick={() => setMapSelection({ type: "building", id: facility.id })}>{facility.name}</button>
                      </h3>
                      <p className="text-sm text-muted-foreground">{facility.facility_type ? pickLabel(FACILITY_TYPE_LABELS, facility.facility_type, locale) : ""}</p>
                    </div>
                    <StatusBadge kind="building" value={facility.status} />
                  </div>
                  <dl className="mt-2 grid gap-1 text-sm">
                    {facility.address && <div><dt className="sr-only">{tx("Adresse", "Address")}</dt><dd>{facility.address}</dd></div>}
                    {facility.phone && <div><dt className="sr-only">{tx("Téléphone", "Phone")}</dt><dd><a className="underline-offset-4 hover:underline" href={`tel:${facility.phone.replace(/\s/g, "")}`}>{facility.phone}</a></dd></div>}
                    {facility.email && <div><dt className="sr-only">E-mail</dt><dd><a className="underline-offset-4 hover:underline" href={`mailto:${facility.email}`}>{facility.email}</a></dd></div>}
                    {describeOpeningHours(facility.opening_hours, locale).map((entry) => <div key={entry.days}><dt className="sr-only">{tx("Horaires", "Hours")}</dt><dd>{entry.days} : {entry.hours}</dd></div>)}
                    {facility.description && <div className="text-muted-foreground"><dt className="sr-only">{tx("Description", "Description")}</dt><dd>{facility.description}</dd></div>}
                  </dl>
                  {(facility.offerings ?? []).length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium">{tx("Soins et prestations", "Treatments and services")}</h4>
                      <ul className="mt-1 flex flex-wrap gap-1.5">{(facility.offerings ?? []).map((offering) => <li key={offering}><Badge variant="secondary">{offering}</Badge></li>)}</ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div>
              <HexMap
                sectors={sectors.data ?? []}
                buildings={facilities}
                transports={[]}
                layers={FACILITY_MAP_LAYERS}
                selected={mapSelection}
                onSelect={setMapSelection}
                mapClassName="h-[min(45vh,420px)]"
              />
              {selectedFacility && (
                <div className="mt-3 rounded-lg border p-3 text-sm" aria-live="polite">
                  <p className="font-medium">{selectedFacility.name}</p>
                  <p>{selectedFacility.address}</p>
                  {selectedFacility.phone && <a className="underline-offset-4 hover:underline" href={`tel:${selectedFacility.phone.replace(/\s/g, "")}`}>{selectedFacility.phone}</a>}
                  {selectedFacility.email && <p><a className="underline-offset-4 hover:underline" href={`mailto:${selectedFacility.email}`}>{selectedFacility.email}</a></p>}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{tx("Carte des seuls établissements rattachés à ce service.", "Map showing only facilities assigned to this service.")}</p>
            </div>
            </div>}
          </div>
        )}
      </section>
    </Container>
  )
}
