import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { CloudCity } from "@/components/home/cloud-city"
import { GetStarted } from "@/components/home/get-started"
import { Hero } from "@/components/home/hero"
import { HistoriqueSection } from "@/components/home/historique-section"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Navbar } from "@/components/home/navbar"
import { RaisonSection } from "@/components/home/raison-section"
import { SITE } from "@/lib/site"

type Phase = "video" | "started"

export function CustomHomePage() {
  const [phase, setPhase] = useState<Phase>("video")
  const [isTransitionComplete, setIsTransitionComplete] = useState<boolean>(false)

  // Bloquer le scroll pendant la vidéo et pendant la glissade horizontale
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

  const handleGoToStarted = () => {
    if (phase !== "started") {
      setPhase("started")
    }
  }

  return (
    <div className="relative w-full bg-[#c8d8e8]">
      <title>{SITE.name} - Terra Nova</title>
      <meta name="description" content={SITE.description} />

      {/* 1. NAVBAR : N'apparaît JAMAIS pendant la vidéo, s'affiche en fondu uniquement en phase 'started' */}
      <AnimatePresence>
        {phase === "started" && <Navbar />}
      </AnimatePresence>
      {phase === "video" && (
        <div className="fixed right-4 top-4 z-[60] rounded-md bg-background/90 p-1 shadow-lg">
          <LanguageSwitcher />
        </div>
      )}

      {/* 2. OVERLAYS DE GLISSADE HORIZONTALE (uniquement actifs pendant la phase vidéo + transition) */}
      {!isTransitionComplete && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {/* Panneau 1 : Vidéo Preloader (glisse vers la gauche à -100vw) */}
          <motion.div
            className="absolute inset-0 size-full bg-black pointer-events-auto"
            initial={{ x: "0vw" }}
            animate={{ x: phase === "video" ? "0vw" : "-100vw" }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              if (phase === "started") {
                setIsTransitionComplete(true)
              }
            }}
          >
            <Hero
              onSkip={handleGoToStarted}
              onEnded={handleGoToStarted}
            />
          </motion.div>
        </div>
      )}

      {/* 3. PAGE NORMALE : Flux DOM standard sans aucun transform parent pour que CloudCity sticky fonctionne à 100% */}
      <div className="w-full">
        <GetStarted isPaused={phase === "video"} />
        <CloudCity />
        <HistoriqueSection />
        <RaisonSection />
      </div>
    </div>
  )
}