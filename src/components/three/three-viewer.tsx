import { useEffect, useRef, useState } from "react"
import { Hand, RotateCw } from "lucide-react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

export interface ThreeViewerProps {
  className?: string
  /** Texte pour les lecteurs d'écran : le canevas 3D est purement décoratif (aria-hidden), ce texte porte l'information. */
  label?: string
}

function hasWebGLSupport(): boolean {
  const canvas = document.createElement("canvas")
  return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
}

/**
 * Vitrine 3D interactive (three.js), sans dépendance à React Three Fiber.
 * - `import()` dynamique : le code three.js (~600 Ko) ne charge QUE quand cette page est visitée,
 *   jamais sur les autres pages de l'application (voir le découpage des routes dans app/router.tsx).
 * - Un seul solide procédural : aucune image ni modèle 3D à fournir. Remplacez la géométrie dans
 *   components/three/scene.ts par votre propre forme (ou un modèle .glb via GLTFLoader) si besoin.
 * - Couleurs alignées sur le thème actif (primary/highlight), mises à jour en direct si on change de thème.
 */
export function ThreeViewer({ className, label = "Objet 3D interactif" }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  // Capacité statique du navigateur : calculée une seule fois à l'initialisation, jamais réévaluée.
  const [webglSupported] = useState(hasWebGLSupport)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!webglSupported) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let handle: { dispose: () => void } | undefined

    import("@/components/three/scene").then(({ createThreeScene }) => {
      if (cancelled || !containerRef.current) return
      handle = createThreeScene(containerRef.current, { reducedMotion })
      setReady(true)
    })

    return () => {
      cancelled = true
      handle?.dispose()
    }
  }, [reducedMotion, webglSupported])

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[var(--radius)] border bg-gradient-to-b from-accent/40 to-transparent sm:aspect-video",
        className
      )}
    >
      <span className="sr-only">{label}</span>
      {/* Purement décoratif (aria-hidden) : glisser l'objet n'apporte aucune information que le texte de la page ne donne déjà. */}
      <div ref={containerRef} aria-hidden="true" className="size-full cursor-grab active:cursor-grabbing" />

      {webglSupported && !ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground" aria-hidden>
          <RotateCw className="size-5 animate-spin" />
        </div>
      )}

      {!webglSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <p>La 3D (WebGL) n'est pas disponible sur cet appareil ou ce navigateur.</p>
          <p>Prévoyez toujours une image de repli pour les visiteurs dans ce cas.</p>
        </div>
      )}

      {webglSupported && ready && (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          aria-hidden
        >
          <Hand className="size-3.5" />
          Glissez pour orienter
        </div>
      )}
    </div>
  )
}
