import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { GetStarted } from "@/components/home/get-started"
import { Hero } from "@/components/home/hero"
import { Navbar } from "@/components/home/navbar"
import { SITE } from "@/lib/site"

type Phase = "video" | "started"

export function CustomHomePage() {
  // Phase 1 : "video" (Preloader plein écran)
  // Phase 2 : "started" (Transition horizontale vers Get Started)
  const [phase, setPhase] = useState<Phase>("video")
  const [isTransitionComplete, setIsTransitionComplete] = useState<boolean>(false)

  /**
   * Blocage du scroll :
   * Pendant la phase vidéo (et pendant la glissade horizontale),
   * on bloque le défilement vertical du body.
   */
  useEffect(() => {
    if (!isTransitionComplete) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isTransitionComplete])

  // Déclenche le passage à la phase 2
  const handleGoToStarted = () => {
    if (phase !== "started") {
      setPhase("started")
    }
  }

  return (
    <div className="relative w-full min-h-svh overflow-x-hidden bg-background">
      <title>{SITE.name} - Terra Nova</title>
      <meta name="description" content={SITE.description} />

      {/* 1. NAVBAR : Apparaît avec un fondu UNIQUEMENT en phase 2 */}
      <AnimatePresence>
        {phase === "started" && <Navbar />}
      </AnimatePresence>

      {/* 2. CONTENEUR COULISSANT HORIZONTAL (2 panneaux de 100vw côte à côte) */}
      <motion.div
        className="flex w-[200vw] min-h-svh"
        initial={{ x: "0vw" }}
        animate={{ x: phase === "video" ? "0vw" : "-100vw" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (phase === "started") {
            setIsTransitionComplete(true)
          }
        }}
      >
        {/* PANNEAU 1 : Vidéo Preloader (100vw x 100vh) */}
        <div className="w-screen h-svh shrink-0">
          <Hero
            onSkip={handleGoToStarted}
            onEnded={handleGoToStarted}
          />
        </div>

        {/* PANNEAU 2 : Section Get Started (100vw x min-h-svh) */}
        <div className="w-screen min-h-svh shrink-0 overflow-y-auto">
          <GetStarted />
        </div>
      </motion.div>
    </div>
  )
}