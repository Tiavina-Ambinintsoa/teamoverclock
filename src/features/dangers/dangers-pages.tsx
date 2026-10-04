import { useState } from "react"
import { Phone } from "lucide-react"
import { Link, useParams } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { useBuildings, useDanger, useDangers, useSectors, useServices } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { formatDate } from "@/lib/query-helpers"
import { cn } from "@/lib/utils"
import { localizedField, localizedStructuredField } from "@/features/i18n/content-translations"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

/** Liste des alertes et protocoles : actives d'abord, archives ensuite. Ton calme, jamais alarmiste. */
export function DangersPage() {
  const { tx, tag, locale } = useLocale()
  const dangers = useDangers()
  const items = dangers.data ?? []
  const active = items.filter((d) => d.status === "active")
  const archived = items.filter((d) => d.status === "archived")

  const card = (d: (typeof items)[number]) => {
    const title = localizedField(d.translations, "title", locale, d.title)
    const summary = localizedField(d.translations, "summary", locale, d.summary)
    return (
      <li key={d.id} className="rounded-xl border bg-card p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge kind="severity" value={d.severity} />
          <StatusBadge kind="danger" value={d.status} />
          
        </div>
        <h3 className="text-lg font-semibold"><Link to={`/dangers/${d.slug}`} className="underline-offset-4 hover:underline">{title}</Link></h3>
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">{tx("Valable depuis le", "Valid since")} {formatDate(d.valid_from, tag)}{d.valid_until ? ` ${tx("jusqu'au", "until")} ${formatDate(d.valid_until, tag)}` : ""}</p>
      </li>
    )
  }

  return (
    <Container className="py-10">
      <title>{tx("Dangers et protocoles", "Dangers & protocols")}</title>
      <PageHeader eyebrow={tx("La ville", "The city")} title={tx("Dangers et protocoles", "Dangers & protocols")} description={tx("Mesures de sécurité intergalactiques et protocole en cas d'invasion extraterrestre. Gardez votre calme : suivez les consignes officielles.", "Intergalactic safety measures and the extraterrestrial invasion protocol. Stay calm: follow the official instructions.")} />

      <DataState data={items} isLoading={dangers.isLoading} error={dangers.error} onRetry={() => void dangers.refetch()} emptyTitle={tx("Aucune alerte", "No alert")}>
        {() => (
          <div className="grid gap-8">
            <section aria-labelledby="active"><h2 id="active" className="mb-3 font-display text-2xl font-semibold">{tx("Alertes et procédures actives", "Active alerts and procedures")}</h2>
              {active.length ? <ul className="grid gap-4 md:grid-cols-2">{active.map(card)}</ul> : <p className="text-sm text-muted-foreground">{tx("Aucune alerte active.", "No active alert.")}</p>}
            </section>
            {archived.length > 0 && <section aria-labelledby="archived"><h2 id="archived" className="mb-3 font-display text-2xl font-semibold">{tx("Archives", "Archive")}</h2><ul className="grid gap-4 md:grid-cols-2">{archived.map(card)}</ul></section>}
          </div>
        )}
      </DataState>
    </Container>
  )
}

/** Fiche d'un danger : consignes, interdits, contacts d'urgence, points de rassemblement et protocole pas à pas. */
export function DangerDetailPage() {
  const { slug } = useParams()
  const { tx, tag, locale } = useLocale()
  const danger = useDanger(slug)
  const sectors = useSectors()
  const buildings = useBuildings()
  const services = useServices({})
  const [step, setStep] = useState(0)

  if (danger.isLoading) return <PageLoader />
  const d = danger.data
  if (!d) {
    return (
      <Container className="py-16">
        <title>{tx("Alerte introuvable", "Alert not found")}</title>
        <div role="alert" className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold"><AuroraTitle>{tx("Alerte introuvable", "Alert not found")}</AuroraTitle></h1>
          <Button asChild className="mt-4"><Link to="/dangers">{tx("Toutes les alertes", "All alerts")}</Link></Button>
        </div>
      </Container>
    )
  }

  const title = localizedField(d.translations, "title", locale, d.title)
  const summary = localizedField(d.translations, "summary", locale, d.summary)
  const recommendedActions = localizedStructuredField(d.translations, "recommended_actions", locale, d.recommended_actions, (value): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === "string"))
  const forbiddenActions = localizedStructuredField(d.translations, "forbidden_actions", locale, d.forbidden_actions, (value): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === "string"))
  const translatedSteps = localizedStructuredField(d.translations, "protocol_steps", locale, d.protocol_steps, (value): value is typeof d.protocol_steps =>
    Array.isArray(value) && value.every((entry) =>
      typeof entry === "object" && entry !== null && "order" in entry &&
      typeof entry.order === "number" && "title" in entry &&
      typeof entry.title === "string" && "detail" in entry && typeof entry.detail === "string"
    ))
  const steps = [...translatedSteps].sort((a, b) => a.order - b.order)
  const zones = (sectors.data ?? []).filter((s) => d.affected_sector_ids.includes(s.id))
  const assembly = (buildings.data ?? []).filter((b) => d.assembly_building_ids.includes(b.id))
  const owner = services.data?.find((s) => s.id === d.responsible_service_id)
  const ownerName = owner ? localizedField(owner.translations, "name", locale, owner.name) : "—"

  return (
    <Container className="max-w-4xl py-10">
      <title>{title}</title>
      <nav aria-label={tx("Fil d'Ariane", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground"><Link to="/dangers" className="underline-offset-4 hover:underline">{tx("Dangers", "Dangers")}</Link> / {title}</nav>
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge kind="severity" value={d.severity} /><StatusBadge kind="danger" value={d.status} /></div>
        <h1 className="font-display text-3xl font-semibold"><AuroraTitle>{title}</AuroraTitle></h1>
        <p className="mt-2 text-muted-foreground">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {tx("Procédure v", "Procedure v")}{d.procedure_version} · {tx("validée le", "validated on")} {formatDate(d.validated_at, tag)} · {ownerName} · {d.source ?? "—"}
        </p>

      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="do" className="rounded-xl border bg-card p-5"><h2 id="do" className="mb-2 font-semibold">{tx("À faire", "What to do")}</h2><ul className="list-disc pl-5 text-sm">{recommendedActions.map((a) => <li key={a}>{a}</li>)}</ul></section>
        <section aria-labelledby="dont" className="rounded-xl border bg-card p-5"><h2 id="dont" className="mb-2 font-semibold">{tx("À ne pas faire", "What not to do")}</h2><ul className="list-disc pl-5 text-sm">{forbiddenActions.map((a) => <li key={a}>{a}</li>)}{forbiddenActions.length === 0 && <li>—</li>}</ul></section>
        <section aria-labelledby="zones" className="rounded-xl border bg-card p-5">
          <h2 id="zones" className="mb-2 font-semibold">{tx("Zones concernées", "Affected areas")}</h2>
          <ul className="list-disc pl-5 text-sm">{zones.map((z) => <li key={z.id}>{z.code} {z.name}</li>)}{zones.length === 0 && <li>—</li>}</ul>
          <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/map">{tx("Voir sur la carte", "View on the map")}</Link></Button>
        </section>
        <section aria-labelledby="assembly" className="rounded-xl border bg-card p-5"><h2 id="assembly" className="mb-2 font-semibold">{tx("Points de rassemblement", "Assembly points")}</h2>        <ul className="list-disc pl-5 text-sm">{assembly.map((b) => <li key={b.id}><Link className="underline underline-offset-4" to={`/map?building=${b.id}`}>{localizedField(b.translations, "name", locale, b.name)}</Link></li>)}{assembly.length === 0 && <li>—</li>}</ul></section>
      </div>

      <section aria-labelledby="contacts" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 id="contacts" className="mb-3 font-semibold">{tx("Contacts d'urgence", "Emergency contacts")}</h2>
        <ul className="flex flex-wrap gap-3">{d.emergency_contacts.map((c) => <li key={c.phone + c.service}><Button asChild variant="outline"><a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone aria-hidden />{c.service} · {c.phone}</a></Button></li>)}</ul>
      </section>

      {steps.length > 0 && (
        <section aria-labelledby="protocol" className="mt-5 rounded-xl border bg-card p-5">
          <h2 id="protocol" className="mb-3 font-semibold">{tx("Protocole pas à pas", "Step-by-step protocol")}</h2>
          <ol className="grid gap-2">
            {steps.map((s, i) => (
              <li key={s.order} aria-current={i === step ? "step" : undefined} className={cn("rounded-lg border p-3 text-sm", i === step && "border-primary bg-primary/5", i < step && "opacity-60")}>
                <button type="button" className="text-left" onClick={() => setStep(i)}><span className="font-semibold">{s.order}. {s.title}</span></button>
                {i === step && <p className="mt-1">{s.detail}</p>}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" disabled={step === 0} onClick={() => setStep((n) => Math.max(0, n - 1))}>{tx("Étape précédente", "Previous step")}</Button>
            <Button size="sm" disabled={step >= steps.length - 1} onClick={() => setStep((n) => Math.min(steps.length - 1, n + 1))}>{tx("Étape suivante", "Next step")}</Button>
          </div>
        </section>
      )}
    </Container>
  )
}
