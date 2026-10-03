import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FastForward, Radio } from "lucide-react"

import { Button } from "@/components/ui/button"
import { homeAsset } from "@/lib/home-assets"

/**
 * Configuration des messages synchronisés avec la vidéo.
 * Chaque élément possède son texte, ses bornes de temps (en secondes)
 * et son coin d'affichage sur l'écran (PAS au centre).
 */
export const CAPTIONS = [
  {
    start: 1,
    end: 4.5,
    text: "Terre en vue",
    subtext: "Approche orbitale et verrouillage des coordonnées",
    position: "top-right",
  },
  {
    start: 5,
    end: 8.5,
    text: "Découvre notre cité connectée",
    subtext: "Descente atmosphérique • Balises au sol actives",
    position: "bottom-left",
  },
  {
    start: 9,
    end: 13,
    text: "Prêt à commencer ?",
    subtext: "Atterrissage réussi • Accès aux systèmes déverrouillé",
    position: "top-left",
  },
] as const

type PositionKey = (typeof CAPTIONS)[number]["position"]

/**
 * Classes Tailwind adaptées selon le coin d'affichage :
 * - Marges réduites et typographie compacte sur mobile
 * - Alignement adapté (à droite pour top-right, à gauche pour les autres)
 */
const POSITION_CLASSES: Record<PositionKey, string> = {
  "top-right": "top-8 right-6 sm:top-14 sm:right-14 text-right items-end",
  "bottom-left": "bottom-16 left-6 sm:bottom-20 sm:left-14 text-left items-start",
  "top-left": "top-8 left-6 sm:top-14 sm:left-14 text-left items-start",
}

interface HeroProps {
  /** Source de la vidéo (fichier local) */
  videoSrc?: string
  /** Image affichée pendant le chargement */
  poster?: string
  /** Déclenché lors du clic sur le bouton "Passer" */
  onSkip?: () => void
  /** Déclenché lorsque la vidéo se termine */
  onEnded?: () => void
}

export function Hero({
  videoSrc,
  poster = homeAsset("og.png"),
  onSkip,
  onEnded,
}: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeCaptionIndex, setActiveCaptionIndex] = useState<number>(-1)

  /**
   * Forcer muted = true et lancer la lecture dès le montage du composant
   * (indispensable pour contourner les restrictions d'autoplay des navigateurs)
   */
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.defaultMuted = true
      video.muted = true
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Lecture automatique de la vidéo bloquée par le navigateur :", err)
        })
      }
    }

    return () => {
      if (video) {
        video.pause()
      }
    }
  }, [])

  /**
   * Surveille le temps de lecture pour afficher le texte correspondant au créneau.
   */
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime
    const index = CAPTIONS.findIndex((item) => time >= item.start && time < item.end)
    if (index !== activeCaptionIndex) {
      setActiveCaptionIndex(index)
    }
  }

  /**
   * Sécurité sur la fin de la vidéo : ne déclenche la transition vers la phase 2
   * que si la vidéo a bien commencé à tourner au moins 2 secondes
   */
  const handleEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget.currentTime > 2) {
      onEnded?.()
    }
  }

  const currentCaption = activeCaptionIndex >= 0 ? CAPTIONS[activeCaptionIndex] : null

  return (
    <section className="relative h-svh w-full overflow-hidden flex items-center justify-center select-none bg-black">
      {/* 1. VIDÉO PRELOADER (Plein écran, z-index 0) */}
      <video
        ref={videoRef}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="absolute inset-0 h-full w-full object-cover z-0"
      >
        {videoSrc ? (
          <source src={videoSrc} type="video/mp4" />
        ) : (
          <>
            <source src={homeAsset("hero-intro.webm")} type="video/webm" />
            <source src={homeAsset("hero-intro.mp4")} type="video/mp4" />
          </>
        )}
      </video>

      {/* 2. OVERLAY LÉGER : voile noir à environ 20-25% d'opacité (z-index 1) */}
      <div className="absolute inset-0 bg-black/25 z-[1] pointer-events-none" />

      {/* 3. TEXTES POSITIONNÉS DANS LES COINS (z-index 10) */}
      <AnimatePresence mode="wait">
        {currentCaption && (
          <motion.div
            key={activeCaptionIndex}
            initial={{ opacity: 0, y: currentCaption.position.startsWith("top") ? -15 : 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: currentCaption.position.startsWith("top") ? -15 : 15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute flex flex-col max-w-[85vw] sm:max-w-md md:max-w-lg z-10 pointer-events-none ${
              POSITION_CLASSES[currentCaption.position]
            }`}
          >
            {/* Petit badge indicateur */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-mono tracking-wider text-white/90 shadow-sm backdrop-blur-md mb-2">
              <Radio className="size-3 text-primary animate-pulse" />
              <span>TRANSMISSION</span>
            </div>

            {/* Titre avec ombre légère pour une lisibilité parfaite */}
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] leading-tight">
              {currentCaption.text}
            </h1>

            {/* Sous-titre */}
            <p className="mt-2 text-xs sm:text-sm md:text-base text-white/90 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {currentCaption.subtext}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. BOUTON "PASSER" EN BAS À DROITE (z-index 20) */}
      {onSkip && (
        <div className="absolute bottom-6 right-6 z-20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="border-white/30 bg-black/40 text-white backdrop-blur-md hover:bg-white/20 hover:text-white transition-all shadow-lg text-xs font-medium tracking-wide"
          >
            <span>Passer</span>
            <FastForward className="ml-2 size-3.5" />
          </Button>
        </div>
      )}
    </section>
  )
}
