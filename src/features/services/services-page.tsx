import { useMemo } from "react"
import { Clock, Phone, Siren } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useServices } from "@/features/city/city-queries"
import { describeOpeningHours } from "@/features/services/hours"
import { effectiveServiceStatus } from "@/features/services/service-availability"
import { useLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { useNow } from "@/hooks/use-now"

/** D05 — liste des services municipaux : recherche par mot-clé, filtre par catégorie, services fermés signalés. */
export function ServicesPage() {
  const { tx, locale } = useLocale()
  const now = useNow(60_000)
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const category = params.get("category") ?? ""

  const all = useServices({})
  const services = useServices({ search: q, category })
  const categories = useMemo(() => Array.from(new Set((all.data ?? []).map((s) => s.category))).sort(), [all.data])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  return (
    <Container className="py-10">
      <title>{tx("Services municipaux", "Municipal services")}</title>
      <PageHeader
        eyebrow={tx("La ville", "The city")}
        title={tx("Services municipaux", "Municipal services")}
        description={tx("Trouvez un service, ses horaires, ses démarches et les documents à fournir.", "Find a service, its opening hours, its procedures and the documents to provide.")}
      />

      <search className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor="service-search">{tx("Rechercher un service", "Search a service")}</Label>
          <Input id="service-search" type="search" value={q} onChange={(e) => update({ q: e.target.value })} placeholder={tx("Police, voirie, santé…", "Police, roads, health…")} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{tx("Catégorie", "Category")}</legend>
          <div className="flex flex-wrap gap-2">
            {["", ...categories].map((c) => (
              <button
                key={c || "all"}
                type="button"
                aria-pressed={category === c}
                onClick={() => update({ category: c })}
                className={cn("rounded-full border px-3 py-1.5 text-sm", category === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                {c || tx("Toutes", "All")}
              </button>
            ))}
          </div>
        </fieldset>
      </search>

      <DataState
        data={services.data}
        isLoading={services.isLoading}
        error={services.error}
        onRetry={() => void services.refetch()}
        emptyTitle={tx("Aucun service trouvé", "No service found")}
        emptyDescription={tx("Essayez un autre mot-clé ou retirez le filtre de catégorie.", "Try another keyword or remove the category filter.")}
      >
        {(items) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="services">
            {items.map((service) => {
              const hours = describeOpeningHours(service.opening_hours, locale)[0]
              const serviceStatus = effectiveServiceStatus(service, now)
              const closed = serviceStatus !== "open"
              return (
                <li key={service.id} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5", closed && "border-dashed")}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      <Link to={`/services/${service.slug}`} className="underline-offset-4 hover:underline">{service.name}</Link>
                    </h2>
                    {service.is_emergency && <Badge variant="destructive"><Siren aria-hidden />{tx("Urgence", "Emergency")}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{service.category}</Badge>
                    <StatusBadge kind="service" value={serviceStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  {closed && service.status_reason && <p className="rounded-md border border-highlight/60 bg-highlight/10 p-2 text-sm">{service.status_reason}</p>}
                  <dl className="mt-auto grid gap-1 text-sm">
                    {hours && <div className="flex items-center gap-2"><Clock className="size-4 shrink-0" aria-hidden /><dt className="sr-only">{tx("Horaires", "Hours")}</dt><dd>{hours.days} · {hours.hours}</dd></div>}
                    {service.phone && <div className="flex items-center gap-2"><Phone className="size-4 shrink-0" aria-hidden /><dt className="sr-only">{tx("Téléphone", "Phone")}</dt><dd><a className="underline-offset-4 hover:underline" href={`tel:${service.phone.replace(/\s/g, "")}`}>{service.phone}</a></dd></div>}
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
