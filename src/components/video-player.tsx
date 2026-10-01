import { useRef, useState } from "react"
import { Maximize, Pause, Play, VideoOff, Volume2, VolumeX } from "lucide-react"

import { cn } from "@/lib/utils"

export interface VideoPlayerProps {
  /** Chemin ou URL de la vidéo. Fichier local conseillé : placez-le dans public/videos/ (poids et licence maîtrisés), ex. "/videos/demo.mp4". */
  src?: string
  poster?: string
  /** Titre annoncé aux lecteurs d'écran (le lecteur n'a pas de légende visible). */
  label: string
  loop?: boolean
  /** Lecture automatique : toujours combinée à `muted` (obligatoire pour que les navigateurs l'autorisent). */
  autoPlay?: boolean
  muted?: boolean
  className?: string
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Lecteur vidéo avec des commandes maison (accessibles, stylées avec les tokens du thème) :
 * lecture, volume, progression, plein écran. Se dégrade proprement en un état "Ajoutez votre
 * vidéo" si `src` est vide ou introuvable, au lieu de montrer une icône de vidéo cassée.
 */
export function VideoPlayer({ src, poster, label, loop, autoPlay, muted, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted ?? Boolean(autoPlay))
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [errored, setErrored] = useState(false)

  // Réinitialise l'état quand la source change, sans effet : pattern recommandé par React pour
  // "ajuster un état quand une prop change" (react.dev/learn/you-might-not-need-an-effect).
  const [prevSrc, setPrevSrc] = useState(src)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setErrored(false)
    setPlaying(false)
    setCurrentTime(0)
  }

  const missing = !src || errored

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }
  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }
  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen()
  }

  return (
    <div
      ref={containerRef}
      className={cn("group relative aspect-video w-full overflow-hidden rounded-[var(--radius)] border bg-black", className)}
    >
      {missing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-6 text-center text-muted-foreground">
          <VideoOff className="size-7" aria-hidden />
          <p className="text-sm font-medium text-foreground">Aucune vidéo pour l'instant</p>
          <p className="max-w-xs text-xs">
            Ajoutez un fichier dans <code className="rounded bg-background px-1 py-0.5">public/videos/</code> et passez son
            chemin dans la prop <code className="rounded bg-background px-1 py-0.5">src</code>.
          </p>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- gabarit : ajoutez vos pistes de sous-titres (<track>) avec votre vidéo */}
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            aria-label={label}
            loop={loop}
            autoPlay={autoPlay}
            muted={isMuted}
            playsInline
            className="size-full object-cover"
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onError={() => setErrored(true)}
          />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-white">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              aria-label="Progression de la vidéo"
              onChange={(e) => {
                const video = videoRef.current
                if (!video) return
                video.currentTime = Number(e.target.value)
                setCurrentTime(video.currentTime)
              }}
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Mettre en pause" : "Lire"}
                className="rounded-full p-1.5 hover:bg-white/15"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Activer le son" : "Couper le son"}
                className="rounded-full p-1.5 hover:bg-white/15"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <span className="text-xs tabular-nums opacity-90">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Plein écran"
                className="ml-auto rounded-full p-1.5 hover:bg-white/15"
              >
                <Maximize className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
