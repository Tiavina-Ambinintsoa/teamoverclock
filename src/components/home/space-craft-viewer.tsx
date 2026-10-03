import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { motion } from "framer-motion"

interface SpaceCraftViewerProps {
  modelPath?: string
  className?: string
}

export function SpaceCraftViewer({
  modelPath = `${import.meta.env.BASE_URL}explorative_space_craft.glb`,
  className = "",
}: SpaceCraftViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let animationFrameId: number
    let rafInit: number

    // On diffère l'initialisation au prochain frame de rendu pour que le DOM
    // ait ses vraies dimensions CSS calculées (important avec Framer Motion / flex)
    rafInit = requestAnimationFrame(() => {
      const w = container.offsetWidth || 560
      const h = container.offsetHeight || 500

      // ── 1. Scène, Caméra, Renderer ──────────────────────────────────────
      const scene = new THREE.Scene()

      // FOV plus large + caméra plus loin = plus d'espace vertical pour les antennes
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
      camera.position.set(0, 0.15, 5.0)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      // false = ne pas toucher les CSS : le canvas se redimensionne via CSS 100%/100%
      // Évite tout clipping CSS ou décalage px vs %
      renderer.setSize(w, h, false)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.4
      renderer.outputColorSpace = THREE.SRGBColorSpace

      // Canvas : taille CSS 100%/100% pour remplir le conteneur sans clipping px
      const canvas = renderer.domElement
      canvas.style.position = "absolute"
      canvas.style.inset = "0"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      canvas.style.display = "block"
      canvas.style.touchAction = "none"
      container.appendChild(canvas)

      // ── 2. Éclairage cinématique ─────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 1.6))

      const sun = new THREE.DirectionalLight(0xffffff, 3.4)
      sun.position.set(5, 7, 4)
      scene.add(sun)

      const fill = new THREE.DirectionalLight(0x38bdf8, 2.6)
      fill.position.set(-5, -2, 2)
      scene.add(fill)

      const rim = new THREE.DirectionalLight(0x60a5fa, 2.8)
      rim.position.set(0, 5, -4)
      scene.add(rim)

      const glow = new THREE.PointLight(0x0ea5e9, 5, 15)
      glow.position.set(0, -0.5, 0.8)
      scene.add(glow)

      // ── 3. Groupe principal (animation + interaction) ────────────────────
      const shipGroup = new THREE.Group()
      scene.add(shipGroup)

      let isModelReady = false
      let baseRotY = 0.76
      let baseRotX = 0.14
      let mouseX = 0
      let mouseY = 0

      // ── 4. Chargement du modèle GLB ──────────────────────────────────────
      const loader = new GLTFLoader()
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene

          // Matériaux double face et envmap simple
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial
                mat.side = THREE.DoubleSide
                mat.needsUpdate = true
              }
            }
          })

          // Calcul AVANT ajout au groupe pour avoir les transformations natives
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)

          // targetSize 1.7 u → plenty of margin for antennas at all aspect ratios
          const scaleFactor = 1.7 / (maxDim || 1)

          // Wrapper : isole l'échelle du décalage de centrage
          const wrapper = new THREE.Group()
          // Centre le modèle à l'origine AVANT l'échelle
          model.position.sub(center)
          wrapper.add(model)
          wrapper.scale.setScalar(scaleFactor)

          shipGroup.add(wrapper)
          // Décale très légèrement vers le bas pour que les antennes ne touchent pas le bord haut
          shipGroup.position.y = -0.08
          shipGroup.rotation.set(baseRotX, baseRotY, -0.04)

          isModelReady = true
          setLoading(false)
        },
        undefined,
        (err) => {
          console.error("GLB load error:", err)
          setLoading(false)
        },
      )

      // ── 5. Interactions pointer ──────────────────────────────────────────
      let isDragging = false
      let prevPX = 0
      let prevPY = 0

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true
        prevPX = e.clientX
        prevPY = e.clientY
      }

      const onPointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
          mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        }
        if (isDragging) {
          baseRotY += (e.clientX - prevPX) * 0.008
          baseRotX = Math.max(-0.6, Math.min(0.6, baseRotX + (e.clientY - prevPY) * 0.008))
          prevPX = e.clientX
          prevPY = e.clientY
        }
      }

      const onPointerUp = () => {
        isDragging = false
      }

      container.addEventListener("pointerdown", onPointerDown)
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp)

      // ── 6. Boucle de rendu ───────────────────────────────────────────────
      const clock = new THREE.Clock()

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()

        if (isModelReady) {
          // Lévitation centrée sur -0.08 pour garder les antennes dégagées du bord haut
          shipGroup.position.y = -0.08 + Math.sin(t * 1.5) * 0.06

          const tY = baseRotY + mouseX * 0.22
          const tX = baseRotX - mouseY * 0.18
          shipGroup.rotation.y += (tY - shipGroup.rotation.y) * 0.06
          shipGroup.rotation.x += (tX - shipGroup.rotation.x) * 0.06
          shipGroup.rotation.z = Math.sin(t * 1.1) * 0.03
        }

        renderer.render(scene, camera)
      }
      animate()

      // ── 7. ResizeObserver (résolution interne uniquement, le CSS reste 100%) ─
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: rw, height: rh } = entry.contentRect
          if (rw > 0 && rh > 0) {
            camera.aspect = rw / rh
            camera.updateProjectionMatrix()
            // false = on met à jour la résolution interne SANS toucher le CSS 100%/100%
            renderer.setSize(rw, rh, false)
          }
        }
      })
      ro.observe(container)

      // ── 8. Nettoyage ─────────────────────────────────────────────────────
      cleanupRef.current = () => {
        container.removeEventListener("pointerdown", onPointerDown)
        window.removeEventListener("pointermove", onPointerMove)
        window.removeEventListener("pointerup", onPointerUp)
        ro.disconnect()
        cancelAnimationFrame(animationFrameId)
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
        renderer.dispose()
        scene.clear()
      }
    }) // fin du requestAnimationFrame

    return () => {
      cancelAnimationFrame(rafInit)
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [modelPath])

  return (
    <div
      className={`relative ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* Halo énergétique cyan/bleu derrière le vaisseau */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="rounded-full blur-3xl opacity-50"
          style={{
            width: "80%",
            height: "80%",
            background:
              "radial-gradient(circle, rgba(56,189,248,0.55) 0%, rgba(14,165,233,0.18) 55%, transparent 80%)",
          }}
        />
      </div>

      {/* Conteneur WebGL — prend 100% de l'espace de son parent */}
      <div
        ref={mountRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      />

      {/* Indicateur de chargement */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
        >
          <div className="size-9 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-[11px] font-mono tracking-widest text-primary/80 uppercase">
            Initialisation Vaisseau…
          </span>
        </motion.div>
      )}
    </div>
  )
}
