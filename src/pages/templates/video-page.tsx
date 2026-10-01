import { useState } from "react"
import { Play } from "lucide-react"

import { Container } from "@/components/layout/container"
import { Lightbox } from "@/components/lightbox"
import { VideoPlayer } from "@/components/video-player"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Vidéo : lecteur principal + grille qui s'ouvre en plein cadre.
 * Aucun fichier vidéo n'est fourni (question de poids et de licence) : chaque lecteur affiche
 * un état "Ajoutez votre vidéo" tant que `src` ne pointe pas vers un fichier réel.
 * Déposez vos fichiers dans public/videos/ (poids : voir docs/05-jury-et-rendu.md, section éco-conception)
 * et passez leur chemin ("/videos/....mp4") en prop `src` à <VideoPlayer>.
 */

const CLIPS = ["Démonstration", "Témoignage", "Coulisses"]

export function VideoPage() {
  const [openClip, setOpenClip] = useState<string | null>(null)

  return (
    <Container className="py-10">
      <title>Modèle : Vidéo</title>
      <TemplateNotice title="Vidéo" usage="lecteur avec commandes maison + grille de vidéos — démo produit, témoignages, teaser" />

      <h1 className="text-3xl font-semibold sm:text-4xl">Vidéo</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">Lecture, son, progression, plein écran : tout est déjà câblé.</p>

      <div className="mt-8 max-w-3xl">
        <VideoPlayer label="Vidéo de présentation" />
      </div>

      <h2 className="mt-14 text-xl font-semibold">Grille de vidéos</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">Chaque vignette ouvre la vidéo en plein cadre.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {CLIPS.map((clip, i) => (
          <button
            key={clip}
            type="button"
            onClick={() => setOpenClip(clip)}
            className="group relative aspect-video overflow-hidden rounded-[var(--radius)] border bg-gradient-to-br from-accent to-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-background/90 shadow-sm transition-transform group-hover:scale-110">
                <Play className="size-4 translate-x-0.5" aria-hidden />
              </span>
            </div>
            <span className="absolute bottom-2 left-3 text-sm font-medium text-foreground">{clip}</span>
          </button>
        ))}
      </div>

      <Lightbox open={openClip !== null} onOpenChange={(o) => !o && setOpenClip(null)} title={openClip ?? ""} titleVisible>
        {openClip && <VideoPlayer label={openClip} autoPlay muted />}
      </Lightbox>
    </Container>
  )
}
