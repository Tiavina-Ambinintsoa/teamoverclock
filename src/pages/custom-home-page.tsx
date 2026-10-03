import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { CloudCity } from "@/components/home/cloud-city"
import { GetStarted } from "@/components/home/get-started"
import { Hero } from "@/components/home/hero"
import { Navbar } from "@/components/home/navbar"
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
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#c8d8e8]">
      <title>{SITE.name} - Terra Nova</title>
      <meta name="description" content={SITE.description} />

      {/* 1. NAVBAR : N'apparaît JAMAIS pendant la vidéo, s'affiche en fondu uniquement en phase 'started' */}
      <AnimatePresence>
        {phase === "started" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="fixed top-0 inset-x-0 z-40"
          >
            <Navbar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PANNEAU 1 : Vidéo Preloader (glisse vers la gauche à -100vw) */}
      {!isTransitionComplete && (
        <motion.div
          className="fixed inset-0 z-50 size-full bg-black"
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
      )}

      {/* 3. PANNEAU 2 : Contenu principal (glisse de 100vw vers 0vw, puis libère les styles pour le sticky) */}
      <motion.div
        className="w-full"
        initial={{ x: "100vw" }}
        animate={{ x: phase === "video" ? "100vw" : "0vw" }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        style={isTransitionComplete ? { transform: "none" } : undefined}
      >
        <GetStarted />
        <CloudCity />
      </motion.div>
    </div>
  )
}