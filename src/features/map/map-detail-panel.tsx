import { ArrowUpRight, X } from "lucide-react"
import { Link } from "react-router"

import { AuroraTitle } from "@/components/magic-ui/aurora-title"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Pick } from "@/features/map/engine"
import type { PublicReport } from "@/features/reports/report-queries"
import { describeOpeningHours } from "@/features/services/hours"
import type { Building, DangerRow, Sector, Service, Transport } from "@/lib/db-types"
import { useLocale } from "@/lib/locale"
import { BUILDING_TYPE_LABELS, FACILITY_TYPE_LABELS, pickLabel, REPORT_CATEGORY_LABELS, TRANSPORT_TYPE_LABELS } from "@/lib/status-labels"

interface MapDetailPanelProps {
  selected: Pick
  sectors: Sector[]
  buildings: Building[]
  transports: Transport[]
  reports: PublicReport[]
  dangers: DangerRow[]
  services: Service[]
  reportHref: (id: string) => string
  onSelect: (pick: Pick | null) => void
  showReportLink?: boolean
  presentation?: "hologram" | "dialog"
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="holo-eyebrow pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** Fiche holographique de l'élément sélectionné : bâtiment, secteur, signalement ou transport. */
export function MapDetailPanel({ selected, sectors, buildings, transports, reports, dangers, services, reportHref, onSelect, showReportLink = true, presentation = "hologram" }: MapDetailPanelProps) {
  const { tx, locale } = useLocale()
  const sectorOf = (id: string) => sectors.find((s) => s.id === id)
  const sectorLabel = (id: string) => {
    const s = sectorOf(id)
    return s ? `${s.code} · ${s.name}` : "—"
  }

  const building = selected.kind === "building" ? buildings.find((b) => b.id === selected.id) : undefined
  const sector = selected.kind === "sector" ? sectorOf(selected.id) : undefined
  const report = selected.kind === "report" ? reports.find((r) => r.id === selected.id) : undefined
  const transport = selected.kind === "transport" ? transports.find((t) => t.id === selected.id) : undefined

  const eyebrow = { building: tx("Bâtiment", "Building"), sector: tx("Secteur", "Sector"), report: tx("Signalement", "Report"), transport: tx("Transport", "Transport") }[selected.kind]
  const title = building?.name ?? (sector ? `${sector.code} — ${sector.name}` : report?.title ?? transport?.code ?? tx("Élément introuvable", "Item not found"))

  const sectorBuildings = sector ? buildings.filter((b) => b.sector_id === sector.id) : []
  const sectorReports = sector ? reports.filter((r) => r.sector_id === sector.id) : []
  const sectorAlerts = sector ? dangers.filter((d) => d.status === "active" && d.affected_sector_ids.includes(sector.id)) : []
  const buildingServices = building ? services.filter((s) => s.building_id === building.id) : []

  return (
    <section className={presentation === "dialog" ? "map-detail-dialog" : "holo-panel"} aria-labelledby="map-detail-title" aria-live="polite">
      <div className={presentation === "dialog" ? "grid gap-4 text-sm" : "holo-panel__body grid gap-3 text-sm"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="holo-eyebrow">{eyebrow}</p>
            <h2 id="map-detail-title" className="mt-1 font-display text-lg leading-tight font-semibold">
              <AuroraTitle>{title}</AuroraTitle>
            </h2>
          </div>
          {presentation === "hologram" && (
            <Button type="button" size="icon" variant="ghost" className="-mt-1 -mr-2 shrink-0" aria-label={tx("Fermer la fiche", "Close details")} onClick={() => onSelect(null)}>
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>

        {building && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{building.facility_type ? pickLabel(FACILITY_TYPE_LABELS, building.facility_type, locale) : pickLabel(BUILDING_TYPE_LABELS, building.type, locale)}</Badge>
              <StatusBadge kind="building" value={building.status} />
            </div>
            <dl className="grid gap-1.5">
              <Row label={tx("Secteur", "Sector")}>
                <button type="button" className="underline underline-offset-4" onClick={() => onSelect({ kind: "sector", id: building.sector_id })}>{sectorLabel(building.sector_id)}</button>
              </Row>
              {building.address && <Row label={tx("Adresse", "Address")}>{building.address}</Row>}
              {building.phone && <Row label={tx("Téléphone", "Phone")}><a className="underline-offset-4 hover:underline" href={`tel:${building.phone.replace(/\s/g, "")}`}>{building.phone}</a></Row>}
              {building.email && <Row label="Email"><a className="underline-offset-4 hover:underline" href={`mailto:${building.email}`}>{building.email}</a></Row>}
              {describeOpeningHours(building.opening_hours, locale).length > 0 && (
                <Row label={tx("Horaires", "Hours")}>
                  <ul>{describeOpeningHours(building.opening_hours, locale).map((h) => <li key={h.days}>{h.days} : {h.hours}</li>)}</ul>
                </Row>
              )}
            </dl>
            {building.description && <p className="text-muted-foreground">{building.description}</p>}
            {(building.offerings ?? []).length > 0 && (
              <ul className="flex flex-wrap gap-1">{building.offerings.map((offering) => <li key={offering}><Badge variant="secondary">{offering}</Badge></li>)}</ul>
            )}
            {buildingServices.length > 0 && (
              <div>
                <p className="holo-eyebrow mb-1">{tx("Services présents", "Services here")}</p>
                <ul className="grid gap-0.5">{buildingServices.map((s) => <li key={s.id}><Link className="underline underline-offset-4" to={`/services/${s.slug}`}>{s.name}</Link></li>)}</ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link to={`/app/reports/new?sector=${building.sector_id}&building=${building.id}`}>{tx("Signaler ici", "Report here")}</Link></Button>
            </div>
          </>
        )}

        {sector && (
          <>
            {sector.description && <p className="text-muted-foreground">{sector.description}</p>}
            <div>
              <div className="mb-1 flex justify-between"><span className="holo-eyebrow">{tx("Activité", "Activity")}</span><span>{sector.activity_level} %</span></div>
              <div className="holo-meter" aria-hidden="true"><span style={{ width: `${sector.activity_level}%` }} /></div>
            </div>
            {sectorAlerts.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2">
                <p className="holo-eyebrow mb-1 !text-destructive">{tx("Alertes actives", "Active alerts")}</p>
                <ul className="grid gap-0.5">{sectorAlerts.map((d) => <li key={d.id}><Link className="underline underline-offset-4" to={`/dangers/${d.slug}`}>{d.title}</Link></li>)}</ul>
              </div>
            )}
            {sectorBuildings.length > 0 && (
              <div>
                <p className="holo-eyebrow mb-1">{tx(`Bâtiments (${sectorBuildings.length})`, `Buildings (${sectorBuildings.length})`)}</p>
                <ul className="grid gap-0.5">{sectorBuildings.slice(0, 6).map((b) => <li key={b.id}><button type="button" className="text-left underline underline-offset-4" onClick={() => onSelect({ kind: "building", id: b.id })}>{b.name}</button></li>)}</ul>
              </div>
            )}
            {sectorReports.length > 0 && (
              <div>
                <p className="holo-eyebrow mb-1">{tx(`Signalements (${sectorReports.length})`, `Reports (${sectorReports.length})`)}</p>
                <ul className="grid gap-0.5">{sectorReports.slice(0, 6).map((r) => <li key={r.id}><button type="button" className="text-left underline underline-offset-4" onClick={() => onSelect({ kind: "report", id: r.id })}>{r.title}</button></li>)}</ul>
              </div>
            )}
            <Button asChild size="sm" variant="outline"><Link to={`/app/reports/new?sector=${sector.id}`}>{tx("Signaler dans ce secteur", "Report in this sector")}</Link></Button>
          </>
        )}

        {report && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="report" value={report.status} />
              <Badge variant="secondary">{pickLabel(REPORT_CATEGORY_LABELS, report.category, locale)}</Badge>
            </div>
            <dl className="grid gap-1.5">
              <Row label="N°">{report.report_number}</Row>
              <Row label={tx("Secteur", "Sector")}>
                <button type="button" className="underline underline-offset-4" onClick={() => onSelect({ kind: "sector", id: report.sector_id })}>{sectorLabel(report.sector_id)}</button>
              </Row>
              <Row label={tx("Observé le", "Observed")}>{new Date(report.observed_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</Row>
              <Row label={tx("Priorité", "Priority")}>{report.priority}</Row>
            </dl>
            <p className="line-clamp-5 text-muted-foreground">{report.description}</p>
            {showReportLink && (
              <Button asChild size="sm">
                <Link to={reportHref(report.id)}>
                  {tx("Voir le signalement", "View full report")}
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </>
        )}

        {transport && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{pickLabel(TRANSPORT_TYPE_LABELS, transport.type, locale)}</Badge>
              <Badge variant={transport.status === "active" ? "default" : "outline"}>{transport.status}</Badge>
            </div>
            <dl className="grid gap-1.5">
              <Row label={tx("Ligne", "Line")}>{transport.route_name ?? "—"}</Row>
              <Row label={tx("Capacité", "Capacity")}>{transport.capacity}</Row>
              <Row label={tx("Secteur", "Sector")}>
                <button type="button" className="underline underline-offset-4" onClick={() => onSelect({ kind: "sector", id: transport.sector_id })}>{sectorLabel(transport.sector_id)}</button>
              </Row>
            </dl>
          </>
        )}

        {!building && !sector && !report && !transport && <p className="text-muted-foreground">{tx("Cet élément n'existe plus ou n'est pas disponible.", "This item no longer exists or is unavailable.")}</p>}
      </div>
    </section>
  )
}
