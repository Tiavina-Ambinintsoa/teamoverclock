import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import { ShootingStars } from "@/components/home/shooting-stars"
import { SpaceCraftViewer } from "@/components/home/space-craft-viewer"
import { Container } from "@/components/layout/container"
import { homeAsset } from "@/lib/home-assets"
import { useLocale } from "@/lib/locale"

interface GetStartedProps {
  /** Image d'arrière-plan */
  backgroundImage?: string
  /** Met en pause le rendu Three.js et les particules (pendant le preloader vidéo) */
  isPaused?: boolean
}

/**
 * Section GetStarted interactive avec zoom cinématographique immersif (sticky 260vh) :
 * 1. Écran d'accueil : le vaisseau spatial flotte à gauche du texte "Bienvenue à Terra Nova".
 * 2. Au scroll (Phase 1) : zoom direct et plongeon de caméra sur le tronc/réacteur du vaisseau.
 * 3. Au scroll (Phase 2) : au lieu d'une couverture de nuages, le vaisseau effectue un survol
 *    panoramique en haute atmosphère avec une nouvelle vue complète de profil et télémétrie active.
 */
export function GetStarted({
  backgroundImage = `${import.meta.env.BASE_URL}bg-getStarted.webp`,
  isPaused = false,
}: GetStartedProps) {
  const { tx } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Suivi de la progression du scroll sur toute la hauteur sticky 260vh
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // Ressort fluide pour un zoom d'une douceur absolue
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 24,
    restDelta: 0.001,
  })

  // ── Phase 1 : Disparition en douceur du texte d'accueil ──────────────
  const heroTextOpacity = useTransform(smoothProgress, [0, 0.18], [1, 0])
  const heroTextY = useTransform(smoothProgress, [0, 0.18], [0, -45])
  const heroTextScale = useTransform(smoothProgress, [0, 0.18], [1, 0.94])

  // ── Phase 2 : Texte du macro-zoom sur le tronc ──────────────────────
  const closeUpTextOpacity = useTransform(smoothProgress, [0.30, 0.44, 0.58], [0, 1, 0])
  const closeUpTextY = useTransform(smoothProgress, [0.30, 0.58], [25, -25])

  // ── Phase 3 : Nouvelle section du vaisseau (remplace la section de nuages) ──
  const flightTextOpacity = useTransform(smoothProgress, [0.65, 0.78, 0.94], [0, 1, 0])
  const flightTextY = useTransform(smoothProgress, [0.65, 0.94], [30, -15])

  // Fondu atmosphérique terminal vers CloudCity
  const exitFadeOpacity = useTransform(smoothProgress, [0.90, 0.99], [0, 1])

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "260vh" }}>
      {/* ── Conteneur sticky 100vh : reste FIXÉ pendant tout le défilement ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden select-none bg-[#c8d8e8]">
        {/* 1. Arrière-plan ciel stratosphérique */}
        <img
          src={backgroundImage}
          alt={tx("Arrière-plan Terra Nova", "Nova Terra background")}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center pointer-events-none"
        />

        {/* 2. Léger overlay sombre pour contraste */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Étoiles filantes dans le ciel supérieur */}
        {!isPaused && <ShootingStars />}

        {/* Halo cyan volumétrique doux qui accompagne le vaisseau */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="rounded-full blur-3xl opacity-40"
            style={{
              width: "65vw",
              height: "65vw",
              background:
                "radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(14,165,233,0.12) 55%, transparent 75%)",
            }}
          />
        </div>

        {/* ──────────────────────────────────────────────────────────────
            3. Vaisseau 3D plein écran en 2 phases continues :
               - Phase 1 (0 -> 0.48) : Décalé à gauche, puis zoom macro sur le tronc
               - Phase 2 (0.48 -> 1.0) : Recul en vol panoramique / virage de croisière
                 (remplace entièrement la section de nuage)
        ────────────────────────────────────────────────────────────── */}
        <SpaceCraftViewer
          enabled={!isPaused}
          className="absolute inset-0 w-full h-full"
          paused={isPaused}
          cameraFov={48}
          targetCameraFov={36}
          cameraZ={4.6}
          cameraY={0}
          targetCameraY={-0.07}
          targetSize={3.6}
          initialPosX={isMobile ? 0 : -1.25}
          targetPosX={0}
          initialRotY={0.76}
          targetRotY={0.06}
          initialRotX={0.14}
          targetRotX={0.03}
          initialRotZ={-0.04}
          targetRotZ={-0.01}
          phase2CameraZ={3.2}
          phase2CameraFov={46}
          phase2CameraY={0}
          phase2RotY={-0.55}
          phase2RotX={0.08}
          phase2RotZ={-0.04}
          enableInteraction={true}
          scrollProgress={smoothProgress}
          scrollZRange={[4.6, 1.35]}
        />

        {/* ──────────────────────────────────────────────────────────────
            4. Texte d'accueil Hero (à droite du vaisseau sur desktop)
        ────────────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center">
          <Container className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-6 md:gap-8 lg:gap-12 w-full">
              {/* Espace gauche réservé au vaisseau au repos */}
              <div className="hidden sm:block sm:col-span-6" />

              {/* Contenu textuel à droite */}
              <motion.div
                style={{
                  opacity: heroTextOpacity,
                  y: heroTextY,
                  scale: heroTextScale,
                }}
                className="sm:col-span-6 text-center sm:text-left flex flex-col items-center sm:items-start pointer-events-auto"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="font-display text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-tight"
                >
                  {tx("Bienvenue à", "Welcome to")} <span className="text-primary">Terra Nova</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-base sm:text-lg lg:text-xl text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-xl leading-relaxed font-light"
                >
                  {tx(
                    "Découvrez une cité où l'homme et la technologie s'élèvent ensemble vers les étoiles. Initiez votre voyage au cœur d'une gouvernance citoyenne innovante.",
                    "Discover a city where people and technology rise together toward the stars. Begin your journey into innovative civic life."
                  )}
                </motion.p>
              </motion.div>
            </div>
          </Container>
        </div>

        {/* ──────────────────────────────────────────────────────────────
            5. Titre de la section gros plan / macro sur le tronc
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: closeUpTextOpacity, y: closeUpTextY }}
          className="absolute inset-x-0 bottom-24 flex flex-col items-center pointer-events-none select-none z-20 px-4 text-center"
        >
          <p className="font-mono text-xs sm:text-sm tracking-[0.35em] text-cyan-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] uppercase mb-3">
            {tx("Structure Orbitale — Terra Nova I", "Orbital structure — Nova Terra I")}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.95)] leading-tight">
            {tx("Au plus près du", "Up close to the")} <span className="text-cyan-400">{tx("cœur de propulsion", "propulsion core")}</span>
          </h2>
        </motion.div>

        {/* ──────────────────────────────────────────────────────────────
            6. NOUVEAU : Affichage du vaisseau en phase de vol atmosphérique
               (Remplace complètement la section de nuages bloquante)
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: flightTextOpacity, y: flightTextY }}
          className="absolute inset-x-0 bottom-16 sm:bottom-20 flex flex-col items-center pointer-events-none select-none z-20 px-4 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-400/40 backdrop-blur-md mb-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[11px] sm:text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
              {tx("Phase de Vol — Propulsion Active", "Flight phase — propulsion active")}
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.95)] leading-tight">
            {tx("Traversée de la", "Crossing the")} <span className="text-cyan-400">{tx("haute atmosphère", "upper atmosphere")}</span>
          </h2>

          <p className="mt-3 text-sm sm:text-base text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-xl font-light">
            {tx("Le vaisseau mère déploie sa pleine envergure et stabilise son vecteur d'approche.", "The mothership unfolds to its full span and stabilizes its approach vector.")}
          </p>

          {/* Badges télémétrie discrets */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-cyan-200 backdrop-blur-md">
              {tx("ALT", "ALT")} : 14 200 m
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-cyan-200 backdrop-blur-md">
              {tx("POUSSÉE", "THRUST")} : 100% {tx("NOMINALE", "NOMINAL")}
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-cyan-200 backdrop-blur-md">
              {tx("VITESSE", "SPEED")} : MACH 4.8
            </span>
          </div>
        </motion.div>

        {/* ──────────────────────────────────────────────────────────────
            7. Fondu doux transparent vers CloudCity (sans aucun mur opaque)
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-30"
          style={{
            opacity: exitFadeOpacity,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(200,216,232,0.4) 50%, #c8d8e8 100%)",
          }}
        />
      </div>
    </div>
  )
}
