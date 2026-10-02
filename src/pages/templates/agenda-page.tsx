import { useMemo, useState } from "react"
import { CalendarDays, Clock3, MapPin, Search } from "lucide-react"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AgendaFilter = "all" | "upcoming" | "past"

interface AgendaEntry {
  id: string
  offsetDays: number
  time: string
  title: string
  detail: string
  place: string
  category: string
}

// Exemples de contenu : reliez cette liste à votre API ou à votre CRUD métier.
const ENTRIES: AgendaEntry[] = [
  { id: "kickoff", offsetDays: 0, time: "09:00", title: "Point de lancement", detail: "Aligner les objectifs et les rôles de l'équipe.", place: "Salle principale", category: "Équipe" },
  { id: "atelier", offsetDays: 1, time: "11:30", title: "Atelier de conception", detail: "Partager les parcours et choisir la prochaine étape.", place: "Espace projet", category: "Atelier" },
  { id: "demo", offsetDays: 3, time: "15:00", title: "Démonstration", detail: "Présenter l'avancement aux personnes invitées.", place: "En ligne", category: "Présentation" },
  { id: "retour", offsetDays: -1, time: "16:00", title: "Revue des retours", detail: "Regrouper les retours et noter les suites à donner.", place: "Espace projet", category: "Équipe" },
]

function formatDay(offsetDays: number) {
  if (offsetDays === 0) return "Aujourd'hui"
  if (offsetDays === 1) return "Demain"
  if (offsetDays === -1) return "Hier"
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date)
}

export function AgendaPage() {
  const [filter, setFilter] = useState<AgendaFilter>("upcoming")
  const [query, setQuery] = useState("")
  const entries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr")
    return ENTRIES.filter((entry) => {
      const matchesFilter = filter === "all" || (filter === "upcoming" ? entry.offsetDays >= 0 : entry.offsetDays < 0)
      const matchesQuery = !normalized || `${entry.title} ${entry.detail} ${entry.place} ${entry.category}`.toLocaleLowerCase("fr").includes(normalized)
      return matchesFilter && matchesQuery
    }).sort((a, b) => a.offsetDays - b.offsetDays || a.time.localeCompare(b.time))
  }, [filter, query])

  return (
    <Container className="py-10">
      <title>Agenda — Modèle</title>
      <PageHeader
        eyebrow="Modèle de page"
        title="Un agenda pour faire avancer le projet"
        description="Regroupez événements, rendez-vous et échéances dans une liste facile à filtrer. Les dates et contenus sont des exemples à relier à votre CRUD."
        className="mb-8"
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Planning de l'équipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">Les dates se mettent à jour par rapport au jour courant.</p>
            </div>
            <div className="relative sm:w-72">
              <label htmlFor="agenda-search" className="sr-only">Rechercher dans l'agenda</label>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="agenda-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un événement…" className="pl-9" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrer les événements">
            {(["upcoming", "all", "past"] as const).map((value) => (
              <Button key={value} type="button" size="sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === "upcoming" ? "À venir" : value === "all" ? "Tout" : "Terminés"}
              </Button>
            ))}
            <Badge className="ml-auto self-center" variant="secondary">{entries.length} événement{entries.length > 1 ? "s" : ""}</Badge>
          </div>

          <div className="mt-5 grid gap-3">
            {entries.map((entry) => (
              <article key={entry.id} className="grid gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[8.5rem_1fr_auto] sm:items-center sm:p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                  <span>{formatDay(entry.offsetDays)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{entry.title}</h3>
                    <Badge variant="outline">{entry.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden />{entry.time}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{entry.place}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">Exemple à connecter</span>
              </article>
            ))}
            {entries.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Aucun événement ne correspond à ces filtres.</p>}
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
