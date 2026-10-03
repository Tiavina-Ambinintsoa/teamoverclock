import { useRef } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import { SpaceCraftViewer } from "@/components/home/space-craft-viewer"

interface ShipCloseUpProps {
  cloudSeaImage?: string
  cloudImage?: string
}

/**
 * Section "Gros plan du vaisseau" (200vh sticky).
 * Positionnée entre GetStarted et CloudCity.
 * Au fil du scroll, la caméra Three.js plonge vers le corps du vaisseau spatial.
 */
export function ShipCloseUp({
  cloudSeaImage = `${import.meta.env.BASE_URL}cloud_sea.jpg`,
  cloudImage = `${import.meta.env.BASE_URL}cloud.png`,
}: ShipCloseUpProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 22,
    restDelta: 0.001,
  })
  // Supprimer le blocage d'opacité initial pour que le vaisseau soit immédiatement visible
  const cloudSeaOpacity = useTransform(smoothProgress, [0.45, 0.9], [0, 1])
  const cloudSeaScale = useTransform(smoothProgress, [0.45, 1], [1.1, 1.35])
  const cloudFgOpacity = useTransform(smoothProgress, [0.6, 0.95], [0, 0.9])
  const cloudFgScale = useTransform(smoothProgress, [0.6, 1], [1.0, 1.5])
  const cloudFgX = useTransform(smoothProgress, [0.6, 1], [0, -120])
  const cloudFg2Opacity = useTransform(smoothProgress, [0.65, 0.95], [0, 0.85])
  const cloudFg2Scale = useTransform(smoothProgress, [0.65, 1], [1.0, 1.45])
  const cloudFg2X = useTransform(smoothProgress, [0.65, 1], [0, 140])
  const textOpacity = useTransform(smoothProgress, [0.03, 0.22, 0.45], [0, 1, 0])
  const textY = useTransform(smoothProgress, [0.03, 0.45], [25, -25])

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "200vh" }}>
      {/* Conteneur sticky 100% visible sans masquage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Fond stratosphérique ciel et nuages harmonieux */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #0f253f 0%, #173d66 22%, #295b8e 48%, #578eb9 72%, #a8cce4 88%, #ffffff 100%)",
          }}
        />

        {/* Étoiles et poussières stellaires en haute altitude */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${(i % 3) * 0.8 + 0.6}px`,
                height: `${(i % 3) * 0.8 + 0.6}px`,
                top: `${(i * 37) % 65}%`,
                left: `${(i * 61) % 100}%`,
                opacity: (i % 5) * 0.14 + 0.2,
              }}
            />
          ))}
        </div>

        {/* Halo cyan volumétrique doux centré sur le réacteur/tronc */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="rounded-full blur-3xl opacity-40"
            style={{
              width: "70vw",
              height: "70vw",
              background:
                "radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(14,165,233,0.15) 50%, transparent 75%)",
            }}
          />
        </div>

        {/* Vaisseau spatial GÉANT remplissant l'écran avec macro-zoom sur le tronc */}
        <SpaceCraftViewer
          className="absolute inset-0 w-full h-full"
          cameraFov={46}
          targetCameraFov={36}
          cameraZ={2.3}
          cameraY={-0.06}
          targetCameraY={-0.08}
          targetSize={3.8}
          initialRotY={0.24}
          targetRotY={0.05}
          initialRotX={0.08}
          targetRotX={0.02}
          initialRotZ={-0.04}
          targetRotZ={-0.01}
          enableInteraction={false}
          scrollProgress={smoothProgress}
          scrollZRange={[2.3, 1.3]}
        />

        {/* Texte d'ambiance cinématique */}
        <motion.div
          className="absolute inset-x-0 bottom-24 flex flex-col items-center pointer-events-none select-none z-20 px-4 text-center"
          style={{ opacity: textOpacity, y: textY }}
        >
          <p className="font-mono text-xs tracking-[0.35em] text-cyan-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] uppercase mb-3">
            Structure Orbitale — Terra Nova I
          </p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)] leading-tight">
            Au plus près du <span className="text-cyan-400">cœur de propulsion</span>
          </h2>
        </motion.div>

        {/* Mer de nuages qui monte au fil du plongeon */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ opacity: cloudSeaOpacity, scale: cloudSeaScale }}
        >
          <img src={cloudSeaImage} alt="" className="size-full object-cover object-bottom" />
        </motion.div>

        {/* Volutes vaporeuses de premier plan */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ opacity: cloudFgOpacity, scale: cloudFgScale, x: cloudFgX }}
        >
          <img
            src={cloudImage}
            alt=""
            className="absolute left-0 bottom-0 w-[55%] h-[55%] object-cover object-bottom"
            style={{
              maskImage: "linear-gradient(to right, white 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, white 40%, transparent 100%)",
            }}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ opacity: cloudFg2Opacity, scale: cloudFg2Scale, x: cloudFg2X }}
        >
          <img
            src={cloudImage}
            alt=""
            className="absolute right-0 bottom-0 w-[55%] h-[55%] object-cover object-bottom"
            style={{
              maskImage: "linear-gradient(to left, white 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to left, white 40%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* Fondu blanc absolu en bas vers CloudCity */}
        <div
          className="absolute inset-x-0 bottom-0 h-40 pointer-events-none z-30"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.85) 75%, #ffffff 100%)",
          }}
        />
      </div>
    </div>
  )
}
