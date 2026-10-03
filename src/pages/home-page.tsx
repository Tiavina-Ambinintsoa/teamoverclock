import { useState, type FormEvent } from "react"
import { AlertTriangle, ArrowRight, Bot, FileWarning, Map as MapIcon, Newspaper, Phone, Search, Siren } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { HomeInteractiveBackground } from "@/components/home-interactive-background"
import type { HomeHeroVariant } from "@/components/home-presets/alternate-home-heroes"
import { Container } from "@/components/layout/container"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth/auth-context"
import { useDangers, useNews, useServices } from "@/features/city/city-queries"
import { useMyReports } from "@/features/reports/report-queries"
import { effectiveServiceStatus, isFutureTimestamp, isUnexpectedServiceClosure } from "@/features/services/service-availability"
import { useLocale } from "@/lib/locale"
import { formatDate } from "@/lib/query-helpers"
import { homeForRole } from "@/lib/permissions"
import { SITE } from "@/lib/site"
import { useNow } from "@/hooks/use-now"

/** Conservé pour la page de modèles /modeles/accueils (le hero « classique » est remplacé par l'accueil Nova Terra). */
export const HOME_HERO_DEFAULT: "classic" | HomeHeroVariant = "classic"

/** Numéros d'urgence affichés même si l'API est indisponible (D07 : contenus essentiels toujours visibles). */
const EMERGENCY_CONTACTS = [
  { fr: "Police", en: "Police", phone: "+999 112" },
  { fr: "Pompiers", en: "Fire & Rescue", phone: "+999 118" },
  { fr: "Urgences médicales", en: "Medical emergency", phone: "+999 115" },
]

/** D07 — accueil : actions citoyennes en premier, services, actualités, urgences, carte et assistant. */
export function HomePage() {
  const { user } = useAuth()
  const { tx, tag } = useLocale()
  const now = useNow(60_000)
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const services = useServices({})
  const news = useNews({ scope: "active" })
  const dangers = useDangers()
  const reports = useMyReports(user?.citizenId)

  const alerts = (dangers.data ?? []).filter((d) => d.status === "active" && ["high", "extreme"].includes(d.severity))
  const serviceAlerts = (services.data ?? []).filter((service) => isUnexpectedServiceClosure(service, now))
  const reportUpdates = (reports.data ?? []).filter((report) =>
    report.status !== "resolved" && report.status !== "archived" &&
    Boolean(report.postponement_reason || report.next_steps || report.required_documents?.length)
  )
  const topServices = [...(services.data ?? [])]
    .sort((left, right) => Number(effectiveServiceStatus(left, now) !== "open") - Number(effectiveServiceStatus(right, now) !== "open"))
    .slice(0, 6)
  const latestNews = [...(news.data ?? [])].sort((a, b) => Number(b.importance === "urgent") - Number(a.importance === "urgent")).slice(0, 3)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void navigate(query.trim() ? `/services?q=${encodeURIComponent(query.trim())}` : "/services")
  }

  const quickActions = [
    { to: user ? homeForRole(user.profileRole) : "/connexion", icon: ArrowRight, fr: user ? "Mon espace" : "Se connecter", en: user ? "My space" : "Log in", tour: "login" },
    { to: "/services", icon: Search, fr: "Consulter les services", en: "Browse services", tour: "services-cta" },
    { to: user ? "/app/reports/new" : "/connexion", icon: FileWarning, fr: "Signaler un problème", en: "Report a problem", tour: "report-cta" },
    { to: user ? "/app/requests/new" : "/contact", icon: Phone, fr: "Contacter la mairie", en: "Contact city hall", tour: "contact-cta" },
  ]

  return (
    <div className="relative isolate">
      <HomeInteractiveBackground />
      <div className="relative z-10">
        <title>{SITE.name}</title>
        <meta name="description" content={SITE.description} />

        {alerts.length > 0 && (
          <div role="alert" className="border-b border-destructive/50 bg-destructive/10">
            <Container className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              <strong>{tx("Alerte officielle (exercice fictif)", "Official alert (fictional drill)")}</strong>
              {alerts.slice(0, 2).map((a) => (
                <Link key={a.id} to={`/dangers/${a.slug}`} className="underline underline-offset-4">{a.title}</Link>
              ))}
            </Container>
          </div>
        )}
        {serviceAlerts.length > 0 && (
          <section role="alert" aria-label={tx("Fermetures imprévues de services", "Unexpected service closures")} className="border-b border-destructive/50 bg-destructive/10">
            <Container className="py-4">
              <h2 className="font-semibold">{tx("Changements imprévus des services", "Unexpected service changes")}</h2>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {serviceAlerts.map((service) => (
                  <li key={service.id} className="rounded-lg border border-destructive/30 bg-background/80 p-3 text-sm">
                    <Link to={`/services/${service.slug}`} className="font-medium underline underline-offset-4">{service.name}</Link>
                    <StatusBadge kind="service" value={effectiveServiceStatus(service, now)} />
                    {service.status_reason && <p className="mt-1">{service.status_reason}</p>}
                    {isFutureTimestamp(service.reopens_at, now) && service.reopens_at && (
                      <p className="mt-1 text-muted-foreground">{tx("Réouverture prévue :", "Expected to reopen:")} {new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(Date.parse(service.reopens_at))}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )}
        {user && reportUpdates.length > 0 && (
          <section aria-label={tx("Mises à jour de vos signalements", "Your report updates")} className="border-b border-highlight/60 bg-highlight/10">
            <Container className="py-4">
              <h2 className="font-semibold">{tx("Mise à jour de vos signalements", "Updates to your reports")}</h2>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {reportUpdates.slice(0, 4).map((report) => (
                  <li key={report.id} className="rounded-lg border bg-background/80 p-3 text-sm">
                    <Link to={`/app/reports/${report.id}`} className="font-medium underline underline-offset-4">{report.title}</Link>
                    {report.postponement_reason && <p className="mt-1"><strong>{tx("Reporté :", "Postponed:")}</strong> {report.postponement_reason}</p>}
                    {report.next_steps && <p className="mt-1"><strong>{tx("Prochaines étapes :", "Next steps:")}</strong> {report.next_steps}</p>}
                    {(report.required_documents ?? []).length > 0 && (
                      <p className="mt-1"><strong>{tx("Documents requis :", "Documents needed:")}</strong> {(report.required_documents ?? []).join(", ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )}

        <section className="border-b">
          <Container className="py-14 sm:py-20">
            <p className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
              <span className="size-1.5 rounded-full bg-highlight" aria-hidden />
              {tx("Ville fictive et futuriste", "Fictional futuristic city")}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.98] font-semibold tracking-tight">
              {tx("Bienvenue à Nova Terra", "Welcome to Nova Terra")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              {tx("Démarches, services, carte de la ruche, signalements et alertes : tout ce dont vous avez besoin, au même endroit.", "Procedures, services, the hive map, reports and alerts: everything you need in one place.")}
            </p>

            <search className="mt-8 block max-w-xl" data-tour="global-search"><form onSubmit={submit} className="flex gap-2">
              <label htmlFor="home-search" className="sr-only">{tx("Rechercher un service", "Search a service")}</label>
              <Input id="home-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx("Que cherchez-vous ? (police, voirie, santé…)", "What are you looking for? (police, roads, health…)")} className="h-12 text-base" />
              <Button type="submit" size="lg"><Search aria-hidden />{tx("Rechercher", "Search")}</Button>
            </form></search>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={tx("Actions principales", "Main actions")}>
              {quickActions.map(({ to, icon: Icon, fr, en, tour }) => (
                <li key={tour}>
                  <Button asChild size="xl" variant="soft" className="h-auto w-full justify-start py-4 text-base" data-tour={tour}>
                    <Link to={to}><Icon aria-hidden />{tx(fr, en)}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <Container className="grid gap-12 py-12">
          <section aria-labelledby="home-services" data-tour="services">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="home-services" className="font-display text-2xl font-semibold">{tx("Services les plus utilisés", "Most used services")}</h2>
              <Link to="/services" className="text-sm text-primary underline-offset-4 hover:underline">{tx("Tous les services", "All services")}</Link>
            </div>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("Les services s'afficheront ici dès que la connexion sera rétablie.", "Services will appear here as soon as the connection is back.")}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topServices.map((s) => (
                  <li key={s.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold"><Link to={`/services/${s.slug}`} className="underline-offset-4 hover:underline">{s.name}</Link></h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge kind="service" value={effectiveServiceStatus(s)} />
                        {s.is_emergency && <Badge variant="destructive"><Siren aria-hidden />{tx("Urgence", "Emergency")}</Badge>}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="home-news" data-tour="news">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="home-news" className="font-display text-2xl font-semibold"><Newspaper className="mr-2 inline size-5" aria-hidden />{tx("Dernières actualités", "Latest news")}</h2>
              <Link to="/news" className="text-sm text-primary underline-offset-4 hover:underline">{tx("Toutes les actualités", "All news")}</Link>
            </div>
            {latestNews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("Aucune actualité à afficher pour le moment.", "No news to display right now.")}</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-3">
                {latestNews.map((n) => (
                  <li key={n.id} className="rounded-xl border bg-card p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {n.importance !== "normal" && <StatusBadge kind="importance" value={n.importance} />}
                      <span className="text-xs text-muted-foreground">{formatDate(n.published_at, tag)}</span>
                    </div>
                    <h3 className="font-semibold"><Link to={`/news/${n.slug}`} className="underline-offset-4 hover:underline">{n.title}</Link></h3>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{n.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/map" data-tour="map" className="group rounded-xl border bg-card p-5 hover:bg-accent">
              <MapIcon className="mb-3 size-6 text-primary" aria-hidden />
              <h2 className="font-semibold">{tx("Carte interactive", "Interactive map")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tx("Secteurs, bâtiments et transports de la ruche.", "Sectors, buildings and transports of the hive.")}</p>
            </Link>
            <Link to="/app/assistant" data-tour="chatbot" className="group rounded-xl border bg-card p-5 hover:bg-accent">
              <Bot className="mb-3 size-6 text-primary" aria-hidden />
              <h2 className="font-semibold">{tx("Assistant virtuel", "Virtual assistant")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tx("Posez votre question par écrit ou à voix haute.", "Ask your question in writing or out loud.")}</p>
            </Link>
            <Link to="/dangers" className="group rounded-xl border bg-card p-5 hover:bg-accent">
              <AlertTriangle className="mb-3 size-6 text-primary" aria-hidden />
              <h2 className="font-semibold">{tx("Dangers et protocoles", "Dangers & protocols")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tx("Consignes officielles en cas d'alerte.", "Official instructions in case of an alert.")}</p>
            </Link>
          </div>

          <section aria-labelledby="home-emergency" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 id="home-emergency" className="font-display text-xl font-semibold">{tx("Contacts d'urgence", "Emergency contacts")}</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {EMERGENCY_CONTACTS.map((c) => (
                <li key={c.phone}>
                  <Button asChild variant="outline"><a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone aria-hidden />{tx(c.fr, c.en)} · {c.phone}</a></Button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{tx("Numéros fictifs de la simulation Nova Terra.", "Fictional numbers of the Nova Terra simulation.")}</p>
          </section>
        </Container>
      </div>
    </div>
  )
}
