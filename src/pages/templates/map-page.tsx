import { useMemo, useState } from "react"
import { ExternalLink, MapPin, MapPinned, Search } from "lucide-react"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Place {
  id: string
  name: string
  region: string
  description: string
  latitude: number
  longitude: number
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY?.trim() ?? ""
const MAPTILER_FRAME_SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"

// Exemples à remplacer par les lieux et les données du sujet.
const PLACES: Place[] = [
  { id: "tana", name: "Antananarivo", region: "Analamanga", description: "Point de départ et centre de l'équipe.", latitude: -18.8792, longitude: 47.5079 },
  { id: "tamatave", name: "Toamasina", region: "Atsinanana", description: "Exemple de lieu côtier à afficher sur la carte.", latitude: -18.1492, longitude: 49.4023 },
  { id: "majunga", name: "Mahajanga", region: "Boeny", description: "Un autre point pour illustrer une carte multi-sites.", latitude: -15.7167, longitude: 46.3167 },
]

function mapEmbedUrl(place: Place, apiKey: string) {
  const url = new URL("https://api.maptiler.com/maps/streets-v4/")
  url.searchParams.set("key", apiKey)
  url.hash = `13/${place.latitude}/${place.longitude}`
  return url.toString()
}

function MapTilerFrame({ place, apiKey }: { place: Place; apiKey: string }) {
  return (
    // This fixed provider iframe needs scripts and its own origin to load the map viewer and tiles.
    <iframe
      key={place.id}
      title={`Carte interactive de ${place.name}`}
      src={mapEmbedUrl(place, apiKey)}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox={MAPTILER_FRAME_SANDBOX}
      allow="fullscreen"
      className="block h-[24rem] w-full border-0 sm:h-[32rem]"
    />
  )
}

function mapPageUrl(place: Place) {
  return `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=13/${place.latitude}/${place.longitude}`
}

function MapPreview({ places, selected, onSelect }: { places: Place[]; selected: Place; onSelect: (id: string) => void }) {
  return (
    <div className="relative isolate grid h-[24rem] place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklch,var(--primary)_12%,var(--background)),var(--background)_72%)] sm:h-[32rem]">
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative aspect-square w-[min(100%,28rem)]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="size-full opacity-50" aria-hidden>
            <defs>
              <linearGradient id="madagascar-land" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity=".24" />
                <stop offset="100%" stopColor="var(--highlight)" stopOpacity=".5" />
              </linearGradient>
            </defs>
            <path d="M56 2 C44 4 37 12 32 22 C27 31 23 40 19 48 C16 55 22 62 26 68 C28 75 35 86 42 94 C47 100 53 97 57 91 C63 83 66 76 70 68 C74 61 80 55 86 49 C93 43 91 38 83 32 C75 26 73 18 67 11 C64 6 60 3 56 2Z" fill="url(#madagascar-land)" stroke="var(--primary)" strokeOpacity=".55" strokeWidth=".8" />
            <path d="M8 26 C22 20 28 31 39 27 S58 18 72 25 S88 35 96 30 M4 72 C18 65 31 76 43 70 S67 59 80 66 S91 76 99 71" fill="none" stroke="var(--primary)" strokeOpacity=".12" strokeWidth=".5" />
          </svg>
          <fieldset className="pointer-events-none absolute inset-0 border-0 p-0">
            <legend className="sr-only">Lieux d'exemple sur Madagascar</legend>
            {places.map((place) => {
              const isSelected = selected.id === place.id
              const left = ((place.longitude - 42.5) / 8.3) * 100
              const top = ((-11 - place.latitude) / 15) * 100
              return (
                <button
                  key={place.id}
                  type="button"
                  aria-label={`Sélectionner ${place.name}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(place.id)}
                  className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-ring"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <span className={`grid place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg transition-transform ${isSelected ? "size-10 scale-110" : "size-8 group-hover:scale-110"}`}>
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className={`absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-card/95 px-2 py-1 text-xs font-medium text-card-foreground shadow-sm backdrop-blur ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>{place.name}</span>
                </button>
              )
            })}
          </fieldset>
        </div>
      </div>
      <div className="absolute top-3 left-3 rounded-lg border bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur sm:top-5 sm:left-5">
        <p className="font-semibold">Aperçu schématique · Madagascar</p>
        <p className="mt-0.5 text-muted-foreground">Configurez MapTiler pour la carte interactive détaillée.</p>
      </div>
      <span className="absolute right-3 bottom-3 rounded-md bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur sm:right-5 sm:bottom-5">Lieux d'exemple</span>
    </div>
  )
}

export function MapPage() {
  const [selectedId, setSelectedId] = useState(PLACES[0].id)
  const [query, setQuery] = useState("")
  const selected = PLACES.find((place) => place.id === selectedId) ?? PLACES[0]
  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr")
    return normalized
      ? PLACES.filter((place) => `${place.name} ${place.region}`.toLocaleLowerCase("fr").includes(normalized))
      : PLACES
  }, [query])

  return (
    <Container className="py-10">
      <title>Carte des lieux — Modèle</title>
      <PageHeader
        eyebrow="Modèle de page"
        title="Une carte pour vos lieux"
        description="Un exemple de carte interactive avec recherche, lieux sélectionnables et attribution cartographique. Remplacez les exemples par les lieux de votre projet."
        className="mb-8"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.7fr)]">
        <Card className="h-fit">
          <CardContent className="p-4 sm:p-5">
            <label htmlFor="map-search" className="sr-only">Rechercher une ville ou une région</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="map-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ville ou région…" className="pl-9" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Lieux</h2>
              <Badge variant="secondary">{filteredPlaces.length}</Badge>
            </div>
            <div className="mt-3 grid gap-2" aria-label="Choisir un lieu">
              {filteredPlaces.map((place) => {
                const isSelected = place.id === selected.id
                return (
                  <button
                    key={place.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(place.id)}
                    className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}
                  >
                    <span className="flex items-start gap-3">
                      <MapPin className={`mt-0.5 size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium">{place.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{place.region} · {place.description}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
              {filteredPlaces.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aucun lieu ne correspond à cette recherche.</p>}
            </div>
          </CardContent>
        </Card>

        <section aria-label={`Carte centrée sur ${selected.name}`} className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><MapPinned className="size-5" aria-hidden /></span>
              <div><h2 className="font-semibold">{selected.name}</h2><p className="text-sm text-muted-foreground">{selected.region}</p></div>
            </div>
            <a href={mapPageUrl(selected)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ouvrir la carte <ExternalLink className="size-4" aria-hidden />
            </a>
          </div>
          {MAPTILER_API_KEY ? (
            <MapTilerFrame place={selected} apiKey={MAPTILER_API_KEY} />
          ) : (
            <MapPreview places={PLACES} selected={selected} onSelect={setSelectedId} />
          )}
          <p className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
            {MAPTILER_API_KEY ? <>Carte © <a className="underline underline-offset-2" href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> · <a className="underline underline-offset-2" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap et ses contributeurs</a></> : <>Aperçu schématique · Exemples de lieux, à remplacer avant publication.</>}
          </p>
        </section>
      </div>
    </Container>
  )
}
