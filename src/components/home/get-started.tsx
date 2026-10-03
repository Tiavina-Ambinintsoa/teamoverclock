import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

import { Container } from "@/components/layout/container"

interface GetStartedProps {
  /** Image d'arrière-plan */
  backgroundImage?: string
  /** Image de la mer de nuages homogène */
  cloudSeaImage?: string
  /** Image des volutes de nuages */
  cloudImage?: string
}

/**
 * Section 1 : Get Started (haut de page, plein écran 100vh).
 * - Pas de cards.
 * - En bas : nappe de nuages dense et homogène qui assure une transition 100% sans ligne
 *   vers la section CloudCity.
 */
export function GetStarted({
  backgroundImage = `${import.meta.env.BASE_URL}bg-getStarted.jpg`,
  cloudSeaImage = `${import.meta.env.BASE_URL}cloud_sea.jpg`,
  cloudImage = `${import.meta.env.BASE_URL}cloud.png`,
}: GetStartedProps) {
  const sectionRef = useRef<HTMLElement>(null)

  // Fondu de sortie des textes pendant le défilement vers le bas
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  // Les textes s'estompent doucement (1 -> 0) et glissent vers le haut (0 -> -50px)
  const contentOpacity = useTransform(scrollYProgress, [0, 0.38], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.38], [0, -50])
  const contentScale = useTransform(scrollYProgress, [0, 0.38], [1, 0.94])

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full flex items-center justify-center bg-[#c8d8e8] select-none overflow-hidden"
    >
      {/* 1. Image de fond plein écran */}
      <img
        src={backgroundImage}
        alt="Arrière-plan Terra Nova"
        className="absolute inset-0 size-full object-cover object-center pointer-events-none"
      />

      {/* 2. Léger overlay (≈15 % d'opacité) */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* 3. Nappe de nuages et brume au bas de GetStarted (transition 100% invisible vers CloudCity) */}
      <div className="absolute inset-x-0 -bottom-1 h-[48vh] pointer-events-none z-10 overflow-hidden">
        {/* Dégradé de brume lumineuse fondue vers le blanc pur au bord inférieur */}
        <div
          className="absolute inset-0 size-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(240,245,250,0.3) 25%, rgba(255,255,255,0.85) 65%, #ffffff 100%)",
          }}
        />

        {/* Nappe de nuages avec fondu vers le blanc pur en bas pour éliminer toute coupure */}
        <img
          src={cloudSeaImage}
          alt=""
          className="absolute inset-0 size-full object-cover object-bottom"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.85) 55%, transparent 95%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.85) 55%, transparent 95%, transparent 100%)",
          }}
        />

        {/* Volutes vaporeuses organiques pour casser toute ligne horizontale */}
        <div className="absolute -bottom-8 -inset-x-8 h-[36vh] flex pointer-events-none">
          <img
            src={cloudImage}
            alt=""
            className="w-3/5 h-full object-cover object-bottom opacity-80 scale-105"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, white 30%, white 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, white 30%, white 90%, transparent 100%)",
            }}
          />
          <img
            src={cloudImage}
            alt=""
            className="w-3/5 h-full object-cover object-bottom opacity-85 -ml-[20%] scale-120"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, white 30%, white 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, white 30%, white 90%, transparent 100%)",
            }}
          />
        </div>
      </div>



      {/* ──────────────────────────────────────────────────────────────
          4. Contenu textuel centré (avec fondu de sortie au scroll)
      ────────────────────────────────────────────────────────────── */}
      <Container className="relative z-30 max-w-4xl mx-auto text-center px-6">
        <motion.div
          style={{
            opacity: contentOpacity,
            y: contentY,
            scale: contentScale,
          }}
          className="flex flex-col items-center justify-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-tight"
          >
            Bienvenue à <span className="text-primary">Terra Nova</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-lg sm:text-xl text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] max-w-2xl mx-auto leading-relaxed font-light"
          >
            Découvrez une cité où l'homme et la technologie s'élèvent ensemble vers les étoiles.
            Initiez votre voyage au cœur d'une gouvernance citoyenne innovante.
          </motion.p>
        </motion.div>
      </Container>
    </section>
  )
}
