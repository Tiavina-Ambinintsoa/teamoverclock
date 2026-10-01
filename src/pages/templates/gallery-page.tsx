import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Container } from "@/components/layout/container"
import { Lightbox } from "@/components/lightbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Galerie avec filtres et visionneuse plein cadre.
 * Les vignettes sont des dégradés générés (aucune image à fournir, aucun souci de licence).
 * Pour utiliser de vraies images : remplacez le <div> dégradé de chaque vignette par
 * <img src="/images/....jpg" alt="..." className="size-full object-cover" />.
 */

interface Piece {
  title: string
  category: string
  angle: number
  from: string
  to: string
  wide?: boolean
}

const CHART_PAIRS: [string, string][] = [
  ["var(--chart-1)", "var(--chart-2)"],
  ["var(--chart-3)", "var(--chart-1)"],
  ["var(--chart-2)", "var(--chart-4)"],
  ["var(--chart-5)", "var(--chart-3)"],
  ["var(--chart-4)", "var(--chart-2)"],
]

const CATEGORIES = ["Tout", "Portraits", "Lieux", "Objets"]

const PIECES: Piece[] = Array.from({ length: 9 }, (_, i) => ({
  title: `Pièce ${String(i + 1).padStart(2, "0")}`,
  category: CATEGORIES[1 + (i % 3)],
  angle: 35 + ((i * 47) % 90),
  from: CHART_PAIRS[i % CHART_PAIRS.length][0],
  to: CHART_PAIRS[i % CHART_PAIRS.length][1],
  wide: i % 5 === 0,
}))

function Tile({ piece, onOpen }: { piece: Piece; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Agrandir : ${piece.title}`}
      className={`group relative aspect-square overflow-hidden rounded-[var(--radius)] border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${piece.wide ? "sm:col-span-2 sm:aspect-[2/1]" : ""}`}
    >
      <div
        className="size-full transition-transform duration-500 group-hover:scale-110"
        style={{ background: `linear-gradient(${piece.angle}deg, ${piece.from}, ${piece.to})` }}
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 via-transparent p-3 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-sm font-medium">{piece.title}</span>
        <span className="text-xs opacity-80">{piece.category}</span>
      </div>
    </button>
  )
}

export function GalleryPage() {
  const [category, setCategory] = useState("Tout")
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const filtered = useMemo(
    () => PIECES.filter((p) => category === "Tout" || p.category === category),
    [category]
  )
  const current = openIndex !== null ? filtered[openIndex] : null

  const move = (delta: number) => {
    if (openIndex === null) return
    setOpenIndex((openIndex + delta + filtered.length) % filtered.length)
  }

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") move(1)
      if (e.key === "ArrowLeft") move(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, filtered.length])

  return (
    <Container className="py-10">
      <title>Modèle : Galerie</title>
      <TemplateNotice title="Galerie" usage="grille filtrable + visionneuse plein cadre (portfolio, marketplace, photos d'événement)" />

      <h1 className="text-3xl font-semibold sm:text-4xl">Galerie</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Cliquez une vignette pour l'agrandir. Flèches du clavier pour naviguer une fois ouverte.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par catégorie">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            role="tab"
            aria-selected={category === cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCategory(cat)
              setOpenIndex(null)
            }}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((piece, i) => (
          <Tile key={piece.title} piece={piece} onOpen={() => setOpenIndex(i)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Aucune pièce dans cette catégorie.
        </p>
      )}

      <Lightbox open={current !== null} onOpenChange={(o) => setOpenIndex(o ? openIndex : null)} title={current?.title ?? ""}>
        {current && (
          <div className="relative">
            <div
              className="aspect-video w-full rounded-[var(--radius)]"
              style={{ background: `linear-gradient(${current.angle}deg, ${current.from}, ${current.to})` }}
            />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{current.title}</p>
                <Badge variant="secondary" className="mt-1">
                  {current.category}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" aria-label="Précédent" onClick={() => move(-1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" aria-label="Suivant" onClick={() => move(1)}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Lightbox>
    </Container>
  )
}
