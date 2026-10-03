import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { motion, type MotionValue } from "framer-motion"

function extractScrollValue(val: number | MotionValue<number> | undefined): number | undefined {
  if (typeof val === "number" && !Number.isNaN(val)) return val
  if (val && typeof (val as { get?: () => unknown }).get === "function") {
    const res = (val as { get: () => unknown }).get()
    if (typeof res === "number" && !Number.isNaN(res)) return res
  }
  return undefined
}

export interface SpaceCraftViewerProps {
  modelPath?: string
  className?: string
  /** Field of view in degrees (default: 48) */
  cameraFov?: number
  /** Target camera FOV at end of scroll */
  targetCameraFov?: number
  /** Camera Z distance (default: 4.7 — smaller = more zoomed) */
  cameraZ?: number
  /** Camera Y position (default: 0) */
  cameraY?: number
  /** Target camera Y at end of scroll */
  targetCameraY?: number
  /** Normalized target size in scene units (default: 2.6) */
  targetSize?: number
  /** Initial ship X position offset (default: 0) */
  initialPosX?: number
  /** Target ship X position offset at end of scroll (default: 0) */
  targetPosX?: number
  /** Initial Y rotation in radians (default: 0.76) */
  initialRotY?: number
  /** Target Y rotation at end of scroll */
  targetRotY?: number
  /** Initial X rotation in radians (default: 0.14) */
  initialRotX?: number
  /** Target X rotation at end of scroll */
  targetRotX?: number
  /** Initial Z rotation in radians (default: -0.04) */
  initialRotZ?: number
  /** Target Z rotation at end of scroll */
  targetRotZ?: number
  /** Phase 2 target camera Z at end of scroll (enables multi-phase choreography) */
  phase2CameraZ?: number
  /** Phase 2 target Y rotation at end of scroll */
  phase2RotY?: number
  /** Phase 2 target X rotation at end of scroll */
  phase2RotX?: number
  /** Phase 2 target Z rotation at end of scroll */
  phase2RotZ?: number
  /** Phase 2 target camera Y at end of scroll */
  phase2CameraY?: number
  /** Phase 2 target camera FOV at end of scroll */
  phase2CameraFov?: number
  /** Enable mouse drag / pointer interaction (default: true) */
  enableInteraction?: boolean
  /** External scroll progress 0–1 (number or MotionValue) */
  scrollProgress?: number | MotionValue<number>
  /** Camera Z range for scroll animation [far, close] (default: [4.7, 2.0]) */
  scrollZRange?: [number, number]
}

export function SpaceCraftViewer({
  modelPath = `${import.meta.env.BASE_URL}explorative_space_craft.glb`,
  className = "",
  cameraFov = 48,
  targetCameraFov,
  cameraZ = 4.7,
  cameraY = 0,
  targetCameraY,
  targetSize = 2.6,
  initialPosX = 0,
  targetPosX = 0,
  initialRotY = 0.76,
  targetRotY,
  initialRotX = 0.14,
  targetRotX,
  initialRotZ = -0.04,
  targetRotZ,
  phase2CameraZ,
  phase2RotY,
  phase2RotX,
  phase2RotZ,
  phase2CameraY,
  phase2CameraFov,
  enableInteraction = true,
  scrollProgress,
  scrollZRange = [4.7, 2.0],
}: SpaceCraftViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  // Refs for external scroll-driven camera & transforms
  const scrollProgressRef = useRef(scrollProgress)
  const scrollZRangeRef = useRef(scrollZRange)
  // Stable refs for props to avoid re-creating Three.js scene on prop change
  const cameraFovRef = useRef(cameraFov)
  const targetCameraFovRef = useRef(targetCameraFov)
  const cameraZRef = useRef(cameraZ)
  const cameraYRef = useRef(cameraY)
  const targetCameraYRef = useRef(targetCameraY)
  const targetSizeRef = useRef(targetSize)
  const initialPosXRef = useRef(initialPosX)
  const targetPosXRef = useRef(targetPosX)
  const initialRotYRef = useRef(initialRotY)
  const targetRotYRef = useRef(targetRotY)
  const initialRotXRef = useRef(initialRotX)
  const targetRotXRef = useRef(targetRotX)
  const initialRotZRef = useRef(initialRotZ)
  const targetRotZRef = useRef(targetRotZ)
  const phase2CameraZRef = useRef(phase2CameraZ)
  const phase2RotYRef = useRef(phase2RotY)
  const phase2RotXRef = useRef(phase2RotX)
  const phase2RotZRef = useRef(phase2RotZ)
  const phase2CameraYRef = useRef(phase2CameraY)
  const phase2CameraFovRef = useRef(phase2CameraFov)
  const enableInteractionRef = useRef(enableInteraction)
  const [loading, setLoading] = useState(true)

  // Keep all prop refs in sync on every render (no re-mount)
  useEffect(() => {
    scrollProgressRef.current = scrollProgress
    scrollZRangeRef.current = scrollZRange
    cameraFovRef.current = cameraFov
    targetCameraFovRef.current = targetCameraFov
    cameraZRef.current = cameraZ
    cameraYRef.current = cameraY
    targetCameraYRef.current = targetCameraY
    targetSizeRef.current = targetSize
    initialPosXRef.current = initialPosX
    targetPosXRef.current = targetPosX
    initialRotYRef.current = initialRotY
    targetRotYRef.current = targetRotY
    initialRotXRef.current = initialRotX
    targetRotXRef.current = targetRotX
    initialRotZRef.current = initialRotZ
    targetRotZRef.current = targetRotZ
    phase2CameraZRef.current = phase2CameraZ
    phase2RotYRef.current = phase2RotY
    phase2RotXRef.current = phase2RotX
    phase2RotZRef.current = phase2RotZ
    phase2CameraYRef.current = phase2CameraY
    phase2CameraFovRef.current = phase2CameraFov
    enableInteractionRef.current = enableInteraction
  })

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

      const camera = new THREE.PerspectiveCamera(cameraFovRef.current, w / h, 0.01, 1000)
      camera.position.set(0, cameraYRef.current, cameraZRef.current)
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
      let userDragY = 0
      let userDragX = 0
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

          // targetSize from props
          const scaleFactor = targetSizeRef.current / (maxDim || 1)

          // Wrapper : isole l'échelle du décalage de centrage
          const wrapper = new THREE.Group()
          // Centre le modèle à l'origine AVANT l'échelle
          model.position.sub(center)
          wrapper.add(model)
          wrapper.scale.setScalar(scaleFactor)

          shipGroup.add(wrapper)
          // Légère compensation verticale pour équilibrer la position des antennes
          shipGroup.position.y = -0.1
          shipGroup.position.x = initialPosXRef.current ?? 0
          shipGroup.rotation.set(initialRotXRef.current, initialRotYRef.current, initialRotZRef.current)

          isModelReady = true
          setLoading(false)
        },
        undefined,
        (err) => {
          console.error("GLB load error:", err)
          setLoading(false)
        },
      )

      // ── 5. Interactions pointer (optionnel) ──────────────────────────────
      let isDragging = false
      let prevPX = 0
      let prevPY = 0

      const onPointerDown = (e: PointerEvent) => {
        if (!enableInteractionRef.current) return
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
        if (enableInteractionRef.current && isDragging) {
          userDragY += (e.clientX - prevPX) * 0.008
          userDragX = Math.max(-0.5, Math.min(0.5, userDragX + (e.clientY - prevPY) * 0.008))
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
          // Lévitation douce
          shipGroup.position.y = -0.1 + Math.sin(t * 1.5) * 0.05

          let currentRotY = initialRotYRef.current
          let currentRotX = initialRotXRef.current
          let currentRotZ = initialRotZRef.current
          let targetShipX = initialPosXRef.current ?? 0

          // Scroll-driven camera zoom & mise en position sur le tronc
          const rawSp = extractScrollValue(scrollProgressRef.current)
          if (rawSp !== undefined) {
            const sp = Math.max(0, Math.min(1, rawSp))
            const [zFar, zClose] = scrollZRangeRef.current
            const fovStart = cameraFovRef.current
            const fovClose = targetCameraFovRef.current ?? Math.max(26, fovStart - 10)
            const camYStart = cameraYRef.current
            const camYClose = targetCameraYRef.current ?? camYStart
            const rotYStart = initialRotYRef.current
            const rotYClose = targetRotYRef.current ?? rotYStart
            const rotXStart = initialRotXRef.current
            const rotXClose = targetRotXRef.current ?? rotXStart
            const rotZStart = initialRotZRef.current
            const rotZClose = targetRotZRef.current ?? rotZStart

            if (phase2CameraZRef.current !== undefined) {
              // Chorégraphie en 2 phases :
              // Phase 1 (0 -> 0.48) : Zoom macro sur le tronc
              // Phase 2 (0.48 -> 1.0) : Recul en vol panoramique / croisière au lieu de nuages
              if (sp <= 0.48) {
                const t1 = sp / 0.48
                camera.position.z = THREE.MathUtils.lerp(zFar, zClose, t1)
                camera.fov = THREE.MathUtils.lerp(fovStart, fovClose, t1)
                camera.position.y = THREE.MathUtils.lerp(camYStart, camYClose, t1)
                currentRotY = THREE.MathUtils.lerp(rotYStart, rotYClose, t1)
                currentRotX = THREE.MathUtils.lerp(rotXStart, rotXClose, t1)
                currentRotZ = THREE.MathUtils.lerp(rotZStart, rotZClose, t1)
              } else {
                const t2 = (sp - 0.48) / 0.52
                const p2Z = phase2CameraZRef.current
                const p2Fov = phase2CameraFovRef.current ?? fovStart
                const p2CamY = phase2CameraYRef.current ?? 0
                const p2RotY = phase2RotYRef.current ?? rotYClose
                const p2RotX = phase2RotXRef.current ?? rotXClose
                const p2RotZ = phase2RotZRef.current ?? rotZClose
                camera.position.z = THREE.MathUtils.lerp(zClose, p2Z, t2)
                camera.fov = THREE.MathUtils.lerp(fovClose, p2Fov, t2)
                camera.position.y = THREE.MathUtils.lerp(camYClose, p2CamY, t2)
                currentRotY = THREE.MathUtils.lerp(rotYClose, p2RotY, t2)
                currentRotX = THREE.MathUtils.lerp(rotXClose, p2RotX, t2)
                currentRotZ = THREE.MathUtils.lerp(rotZClose, p2RotZ, t2)
              }
            } else {
              camera.position.z = THREE.MathUtils.lerp(zFar, zClose, sp)
              camera.fov = THREE.MathUtils.lerp(fovStart, fovClose, sp)
              camera.position.y = THREE.MathUtils.lerp(camYStart, camYClose, sp)

              if (targetRotYRef.current !== undefined) {
                currentRotY = THREE.MathUtils.lerp(rotYStart, rotYClose, sp)
              }
              if (targetRotXRef.current !== undefined) {
                currentRotX = THREE.MathUtils.lerp(rotXStart, rotXClose, sp)
              }
              if (targetRotZRef.current !== undefined) {
                currentRotZ = THREE.MathUtils.lerp(rotZStart, rotZClose, sp)
              }
            }
            camera.updateProjectionMatrix()

            if (initialPosXRef.current !== undefined && targetPosXRef.current !== undefined) {
              const centerT = Math.min(1, sp / 0.45)
              targetShipX = THREE.MathUtils.lerp(initialPosXRef.current, targetPosXRef.current, centerT)
            }
          }

          shipGroup.position.x += (targetShipX - shipGroup.position.x) * 0.08

          const mouseInfluence = enableInteractionRef.current ? 0.2 : 0.05
          const tY = currentRotY + mouseX * mouseInfluence + userDragY
          const tX = currentRotX - mouseY * (enableInteractionRef.current ? 0.16 : 0.04) + userDragX
          shipGroup.rotation.y += (tY - shipGroup.rotation.y) * 0.06
          shipGroup.rotation.x += (tX - shipGroup.rotation.x) * 0.06
          shipGroup.rotation.z = currentRotZ + Math.sin(t * 1.1) * 0.02
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
