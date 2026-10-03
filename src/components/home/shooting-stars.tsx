import { motion } from "framer-motion"

interface Meteor {
  id: number
  top: number // position initiale en % du haut (-5% à 40%)
  left: number // position initiale en % de la gauche (-10% à 95%)
  angle: number // inclinaison (35° à 42°)
  duration: number // durée de passage en vitesse linéaire (1.0s à 2.0s)
  distance: number // longue distance de traversée (1000px à 1700px)
  delay: number // décalage initial (0s à 8s)
  repeatDelay: number // délai court entre chaque boucle (0.8s à 3s)
  trailLength: number // longueur de traînée (200px à 550px)
  trailThickness: number // épaisseur (3px à 9px)
  headSize: number // taille de la tête (8px à 20px)
  glowColor: string
}

// 20 météores pour une vraie pluie dense et ininterrompue
const METEORS: Meteor[] = [
  // 1. Gros bolide traversant tout le ciel
  { id: 1, top: -2, left: 20, angle: 38, duration: 1.6, distance: 1600, delay: 0, repeatDelay: 1.5, trailLength: 520, trailThickness: 9, headSize: 20, glowColor: "rgba(56, 189, 248, 1)" },
  // 2. Météore rapide
  { id: 2, top: 8, left: 60, angle: 37, duration: 1.1, distance: 1300, delay: 0.4, repeatDelay: 1.2, trailLength: 340, trailThickness: 5, headSize: 12, glowColor: "rgba(186, 230, 253, 0.95)" },
  // 3. Météore moyen en hauteur
  { id: 3, top: 2, left: 85, angle: 40, duration: 1.3, distance: 1400, delay: 0.9, repeatDelay: 2.0, trailLength: 390, trailThickness: 6, headSize: 14, glowColor: "rgba(125, 211, 252, 0.95)" },
  // 4. Bolide éclatant
  { id: 4, top: 12, left: 5, angle: 36, duration: 1.5, distance: 1550, delay: 1.3, repeatDelay: 1.8, trailLength: 480, trailThickness: 8, headSize: 18, glowColor: "rgba(14, 165, 233, 1)" },
  // 5. Météore très rapide
  { id: 5, top: 16, left: 40, angle: 39, duration: 1.0, distance: 1250, delay: 1.8, repeatDelay: 1.0, trailLength: 280, trailThickness: 4, headSize: 10, glowColor: "rgba(224, 242, 254, 0.9)" },
  // 6. Grand météore centré
  { id: 6, top: 4, left: 45, angle: 38, duration: 1.4, distance: 1500, delay: 2.2, repeatDelay: 2.2, trailLength: 440, trailThickness: 7, headSize: 16, glowColor: "rgba(56, 189, 248, 0.95)" },
  // 7. Météore fin et rapide
  { id: 7, top: 22, left: 70, angle: 37, duration: 1.2, distance: 1350, delay: 2.7, repeatDelay: 1.4, trailLength: 320, trailThickness: 5, headSize: 11, glowColor: "rgba(186, 230, 253, 0.9)" },
  // 8. Gros bolide imposant
  { id: 8, top: 0, left: 75, angle: 41, duration: 1.7, distance: 1650, delay: 3.1, repeatDelay: 2.5, trailLength: 540, trailThickness: 9, headSize: 19, glowColor: "rgba(56, 189, 248, 1)" },
  // 9. Météore rasoir rapide
  { id: 9, top: 18, left: 15, angle: 36, duration: 1.1, distance: 1300, delay: 3.6, repeatDelay: 1.1, trailLength: 310, trailThickness: 4, headSize: 11, glowColor: "rgba(125, 211, 252, 0.95)" },
  // 10. Météore puissant
  { id: 10, top: 6, left: 30, angle: 38, duration: 1.5, distance: 1550, delay: 4.0, repeatDelay: 1.9, trailLength: 460, trailThickness: 8, headSize: 17, glowColor: "rgba(224, 242, 254, 1)" },
  // 11. Météore lointain
  { id: 11, top: 26, left: 50, angle: 39, duration: 1.3, distance: 1200, delay: 4.5, repeatDelay: 1.6, trailLength: 260, trailThickness: 4, headSize: 9, glowColor: "rgba(56, 189, 248, 0.85)" },
  // 12. Bolide traversier
  { id: 12, top: 1, left: 10, angle: 37, duration: 1.6, distance: 1600, delay: 5.0, repeatDelay: 2.4, trailLength: 500, trailThickness: 8, headSize: 18, glowColor: "rgba(14, 165, 233, 1)" },
  // 13. Météore vif
  { id: 13, top: 14, left: 80, angle: 40, duration: 1.2, distance: 1400, delay: 5.4, repeatDelay: 1.3, trailLength: 350, trailThickness: 5, headSize: 13, glowColor: "rgba(186, 230, 253, 0.95)" },
  // 14. Météore central rapide
  { id: 14, top: 10, left: 52, angle: 38, duration: 1.0, distance: 1350, delay: 5.9, repeatDelay: 1.0, trailLength: 330, trailThickness: 5, headSize: 12, glowColor: "rgba(125, 211, 252, 0.9)" },
  // 15. Grand bolide éclatant
  { id: 15, top: 5, left: 65, angle: 39, duration: 1.5, distance: 1580, delay: 6.3, repeatDelay: 2.1, trailLength: 490, trailThickness: 8, headSize: 17, glowColor: "rgba(56, 189, 248, 1)" },
  // 16. Météore bas rapide
  { id: 16, top: 24, left: 22, angle: 36, duration: 1.2, distance: 1280, delay: 6.8, repeatDelay: 1.5, trailLength: 290, trailThickness: 4, headSize: 10, glowColor: "rgba(224, 242, 254, 0.9)" },
  // 17. Météore haut
  { id: 17, top: -1, left: 38, angle: 38, duration: 1.4, distance: 1500, delay: 7.2, repeatDelay: 1.7, trailLength: 420, trailThickness: 7, headSize: 15, glowColor: "rgba(56, 189, 248, 0.95)" },
  // 18. Météore droit
  { id: 18, top: 15, left: 90, angle: 41, duration: 1.3, distance: 1450, delay: 7.6, repeatDelay: 1.4, trailLength: 370, trailThickness: 6, headSize: 14, glowColor: "rgba(14, 165, 233, 0.95)" },
  // 19. Bolide suprême
  { id: 19, top: 3, left: 18, angle: 37, duration: 1.6, distance: 1650, delay: 8.1, repeatDelay: 2.6, trailLength: 530, trailThickness: 9, headSize: 19, glowColor: "rgba(186, 230, 253, 1)" },
  // 20. Météore de clôture de cycle
  { id: 20, top: 20, left: 35, angle: 38, duration: 1.1, distance: 1300, delay: 8.6, repeatDelay: 1.2, trailLength: 300, trailThickness: 5, headSize: 11, glowColor: "rgba(125, 211, 252, 0.9)" },
]

export function ShootingStars() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      {METEORS.map((meteor) => (
        <MeteorItem key={meteor.id} meteor={meteor} />
      ))}
    </div>
  )
}

function MeteorItem({ meteor }: { meteor: Meteor }) {
  const rad = (meteor.angle * Math.PI) / 180
  const targetX = Math.cos(rad) * meteor.distance
  const targetY = Math.sin(rad) * meteor.distance

  return (
    <motion.div
      style={{
        top: `${meteor.top}%`,
        left: `${meteor.left}%`,
        rotate: meteor.angle,
        transformOrigin: "right center",
      }}
      className="absolute pointer-events-none"
      initial={{
        x: -meteor.trailLength,
        y: -(meteor.trailLength * Math.sin(rad)),
        opacity: 0,
      }}
      animate={{
        x: targetX,
        y: targetY,
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        duration: meteor.duration,
        delay: meteor.delay,
        repeat: Infinity,
        repeatDelay: meteor.repeatDelay,
        ease: "linear", // Vitesse constante continue sans aucun ralentissement
      }}
    >
      <div
        className="relative flex items-center"
        style={{
          width: `${meteor.trailLength}px`,
          height: `${meteor.headSize * 2}px`,
        }}
      >
        {/* Traînée filante luminescente continue */}
        <div
          className="absolute right-0 rounded-full"
          style={{
            width: `${meteor.trailLength}px`,
            height: `${meteor.trailThickness}px`,
            background:
              "linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(186,230,253,0.95) 15%, rgba(56,189,248,0.7) 45%, rgba(14,165,233,0.3) 75%, transparent 100%)",
            filter: `drop-shadow(0 0 10px ${meteor.glowColor})`,
          }}
        />

        {/* Halo large autour du noyau */}
        <div
          className="absolute right-0 rounded-full blur-sm pointer-events-none"
          style={{
            width: `${meteor.headSize * 2.8}px`,
            height: `${meteor.headSize * 2.8}px`,
            background: `radial-gradient(circle, rgba(255,255,255,1) 0%, ${meteor.glowColor} 55%, transparent 100%)`,
            transform: "translate(30%, 0)",
          }}
        />

        {/* Noyau incandescent de l'étoile filante */}
        <div
          className="absolute right-0 rounded-full bg-white pointer-events-none"
          style={{
            width: `${meteor.headSize}px`,
            height: `${meteor.headSize}px`,
            transform: "translate(20%, 0)",
            boxShadow: `0 0 16px 5px rgba(255,255,255,1), 0 0 28px 10px ${meteor.glowColor}, 0 0 50px 16px rgba(56,189,248,0.8)`,
          }}
        />
      </div>
    </motion.div>
  )
}
