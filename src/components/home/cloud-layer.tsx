import { motion, type MotionValue, useTransform } from "framer-motion"

interface CloudLayerProps {
  /** Source de l'image de nuage */
  image: string
  /** Progression du scroll (0 à 1) lissée avec useSpring */
  progress: MotionValue<number>
  /** Seuil de fin d'animation (0.4 à 1.0) : plus la valeur est basse, plus le nuage disparaît vite */
  speed?: number
  /** Grossissement final du nuage */
  maxScale?: number
  /** Déplacement horizontal vers la gauche (-) ou vers la droite (+) en pixels */
  translateX?: number
  /** Déplacement vertical optionnel */
  translateY?: number
  /** Positionnement / style spécifique */
  className?: string
  /** z-index de la couche (contrôle l'empilement) */
  zIndex?: number
  /** Utiliser mix-blend-mode: screen pour PNG blanc-sur-noir uniquement (défaut : false pour PNG RGBA) */
  blendScreen?: boolean
  /** Inverser verticalement l'image */
  flipY?: boolean
}

/**
 * Composant réutilisable pour une couche de nuages animée au scroll.
 * Anime uniquement scale, opacity et translateX pour des performances 60fps constantes.
 */
export function CloudLayer({
  image,
  progress,
  speed = 0.7,
  maxScale = 2.4,
  translateX = 0,
  translateY = 0,
  className = "",
  zIndex = 10,
  blendScreen = false,
  flipY = false,
}: CloudLayerProps) {
  // Grossissement progressif du nuage
  const scale = useTransform(progress, [0, speed], [1, maxScale])

  // Disparition en fondu : reste opaque au début, puis s'estompe jusqu'à disparaître
  const opacity = useTransform(progress, [0, speed * 0.75, speed], [1, 0.6, 0])

  // Écartement sur le côté pendant le scroll
  const x = useTransform(progress, [0, speed], [0, translateX])
  const y = useTransform(progress, [0, speed], [0, translateY])

  return (
    <motion.div
      style={{
        scale,
        opacity,
        x,
        y,
        zIndex,
        mixBlendMode: blendScreen ? "screen" : "normal",
        position: "absolute",
        inset: 0,
      }}
      className={`size-full pointer-events-none select-none ${className}`}
    >
      <img
        src={image}
        alt="Nuage"
        className="size-full object-cover object-center"
        style={flipY ? { transform: "scaleY(-1)" } : undefined}
      />
    </motion.div>
  )
}
