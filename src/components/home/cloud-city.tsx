import { useRef } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"

import { CloudLayer } from "@/components/home/cloud-layer"
import { homeAsset } from "@/lib/home-assets"

interface CloudCityProps {
  /** Image de la ville flottante (arrière-plan) */
  cityImage?: string
  /** Image des nuages (PNG RGBA) */
  cloudImage?: string
  /** Image de la mer de nuages homogène */
  cloudSeaImage?: string
}

/**
 * Section 2 : Parallax sticky 300vh.
 *
 * EMPILEMENT (z-index) :
 *   z-0  → ville flottante (fond, révélé au fur et à mesure du scroll)
 *   z-5  → nappe de nuages dense et homogène (couvre 100% de l'écran au départ)
 *   z-10 → nuage d'arrière-plan avec dérive
 *   z-20 → nuage intermédiaire
 *   z-30 → nuage de premier plan (zoom rapide & écartement)
 *   z-40 → texte final
 *
 * Au début du scroll (progress = 0) :
 *   L'écran est 100% recouvert par une mer de nuages blanche et homogène.
 *   Il n'y a AUCUNE ligne visible entre GetStarted et CloudCity.
 *
 * Au fil du scroll (progress > 0) :
 *   La nappe s'ouvre et s'estompe, les nuages dérivent vers les côtés,
 *   dévoilant majestueusement la mégapole Terra Nova !
 */
export function CloudCity({
  cityImage = homeAsset("city-terra-nova.webp"),
  cloudImage = homeAsset("cloud.webp"),
  cloudSeaImage = homeAsset("cloud_sea.webp"),
}: CloudCityProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Suivi de la progression du scroll sur toute la hauteur 300vh
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // 2. Amortissement fluide (effet ressort)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  })

  // 3. Léger zoom sur la ville (1.0 → 1.15) pour donner l'impression de s'en approcher
  const cityScale = useTransform(smoothProgress, [0, 1], [1.0, 1.15])

  // 4. Nappe dense de nuages (fond homogène) : 100% opaque au départ, s'efface entre 0.08 et 0.35
  const cloudSeaOpacity = useTransform(smoothProgress, [0, 0.08, 0.35], [1, 0.9, 0])
  const cloudSeaScale = useTransform(smoothProgress, [0, 0.45], [1.0, 1.25])

  // 5. Apparition du texte de conclusion (entre 40% et 65% du scroll pour être bien visible)
  const textOpacity = useTransform(smoothProgress, [0.4, 0.65], [0, 1])
  const textY = useTransform(smoothProgress, [0.4, 0.65], [25, 0])

  return (
    <section ref={containerRef} className="relative h-[300vh] w-full">
      {/* Conteneur sticky : reste épinglé sur l'écran pendant 300vh de défilement */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* ─────────────────────────────────────────────
            COUCHE z-0 : Ville flottante (fond fixe)
        ───────────────────────────────────────────── */}
        <motion.div
          style={{ scale: cityScale }}
          className="absolute inset-0 z-0 size-full select-none"
        >
          <img
            src={cityImage}
            alt="Cité sous dôme Terra Nova"
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-center"
          />
          {/* Voile sombre subtil */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </motion.div>

        {/* ─────────────────────────────────────────────
            COUCHE z-5 : Nappe de nuages dense et brume
            Démarre en blanc pur (#ffffff) au sommet pour
            une fusion 100% invisible avec le bas de GetStarted.
        ───────────────────────────────────────────── */}
        <motion.div
          style={{
            opacity: cloudSeaOpacity,
            scale: cloudSeaScale,
          }}
          className="absolute inset-0 z-5 size-full pointer-events-none select-none"
        >
          {/* Fond de brume blanche uniforme qui relie les deux sections sans aucune couture */}
          <div className="absolute inset-0 size-full bg-gradient-to-b from-white via-white/90 to-transparent pointer-events-none" />

          {/* Mer de nuages avec transition douce depuis la brume blanche */}
          <img
            src={cloudSeaImage}
            alt="Mer de nuages"
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 15%, black 45%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 15%, black 45%, black 100%)",
            }}
          />
        </motion.div>

        {/* ─────────────────────────────────────────────
            COUCHES z-10 / z-20 / z-30 : Volutes 3D
            Donnent du relief et du dynamisme pendant
            l'ouverture des nuages.
        ───────────────────────────────────────────── */}

        {/* Nuage arrière : glisse vers la gauche */}
        <CloudLayer
          image={cloudImage}
          progress={smoothProgress}
          speed={0.55}
          maxScale={1.8}
          translateX={-100}
          translateY={-30}
          zIndex={10}
          className="opacity-90"
        />

        {/* Nuage intermédiaire : glisse vers la droite */}
        <CloudLayer
          image={cloudImage}
          progress={smoothProgress}
          speed={0.45}
          maxScale={2.2}
          translateX={130}
          translateY={25}
          zIndex={20}
          className="scale-110 opacity-95"
        />

        {/* Nuage premier plan : zoom rapide et écartement vers la gauche */}
        <CloudLayer
          image={cloudImage}
          progress={smoothProgress}
          speed={0.35}
          maxScale={2.6}
          translateX={-160}
          translateY={40}
          zIndex={30}
          className="scale-125 opacity-100"
        />

        {/* ─────────────────────────────────────────────
            COUCHE z-40 : Texte final
            Apparaît en fondu une fois les nuages dissipés.
        ───────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        >

          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] max-w-4xl leading-tight">
            La cité par-delà les cieux
          </h2>

          <p className="mt-6 text-base sm:text-xl text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-2xl font-light leading-relaxed">
            Là où l'horizon s'ouvre sur un monde nouveau. Bienvenue au cœur de la mégapole
            flottante, prête à accueillir ses premiers pionniers.
          </p>
        </motion.div>

      </div>
    </section>
  )
}
