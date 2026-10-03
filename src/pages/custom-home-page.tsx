import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { CloudCity } from "@/components/home/cloud-city"
import { GetStarted } from "@/components/home/get-started"
import { Hero } from "@/components/home/hero"
import { Navbar } from "@/components/home/navbar"
import { SITE } from "@/lib/site"

export function CustomHomePage() {
  const [showPreloader, setShowPreloader] = useState(true)

  // Bloquer le défilement pendant la lecture de la vidéo de préchargement
  useEffect(() => {
    if (showPreloader) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [showPreloader])

  const handleFinishPreloader = () => {
    setShowPreloader(false)
  }

  return (
    <div className="relative w-full bg-[#c8d8e8]">
      <title>{SITE.name} - Terra Nova</title>
      <meta name="description" content={SITE.description} />

      {/* 1. Vidéo de préchargement plein écran avec fondu de sortie */}
      <AnimatePresence>
        {showPreloader && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-black"
          >
            <Hero
              onSkip={handleFinishPreloader}
              onEnded={handleFinishPreloader}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Barre de navigation (visible après le preloader) */}
      <Navbar />

      {/* 3. Section Get Started */}
      <GetStarted />

      {/* 4. Section CloudCity avec parallaxe */}
      <CloudCity />
    </div>
  )
}