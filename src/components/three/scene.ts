import * as THREE from "three"

import { resolveThemeColor, rgbToHex } from "@/lib/resolve-css-color"

export interface ThreeSceneHandle {
  dispose: () => void
}

/**
 * Scène 3D autonome (sans React) : un solide accompagné d'un halo filaire, éclairé,
 * qui tourne seul et se laisse aussi tourner à la souris ou au doigt. Couleurs = tokens du thème
 * (mises à jour en direct si l'utilisateur change de thème pendant que la scène est ouverte).
 *
 * Fonction pure : ne connaît pas React. Le composant ThreeViewer (three-viewer.tsx) l'appelle
 * dans un useEffect et se contente d'appeler `dispose()` au démontage.
 */
export function createThreeScene(container: HTMLElement, options: { reducedMotion: boolean }): ThreeSceneHandle {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0.4, 5.2)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 2 max : sobriété (pas d'écran Retina à x3)
  renderer.setClearColor(0x000000, 0) // transparent : le fond de page (thème) se voit à travers
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 1.1)
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 4, 5)
  const rim = new THREE.DirectionalLight(0xffffff, 1.1)
  rim.position.set(-4, -2, -3)
  scene.add(ambient, key, rim)

  const group = new THREE.Group()
  scene.add(group)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.3, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15, flatShading: true })
  )
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.85, 1),
    new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.35 })
  )
  group.add(core, halo)

  function applyThemeColors() {
    const primary = rgbToHex(resolveThemeColor("--primary"))
    const highlight = rgbToHex(resolveThemeColor("--highlight"))
    ;(core.material as THREE.MeshStandardMaterial).color.set(primary)
    ;(halo.material as THREE.MeshBasicMaterial).color.set(highlight)
  }
  applyThemeColors()

  // Si l'équipe change de thème (preset ou clair/sombre) pendant que la scène est montée.
  const themeObserver = new MutationObserver(applyThemeColors)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })

  // --- Interaction : glisser pour orienter, la scène continue doucement sur son élan ---
  let velocityX = options.reducedMotion ? 0 : 0.0028
  let velocityY = 0
  let dragging = false
  let lastX = 0
  let lastY = 0

  const onPointerDown = (event: PointerEvent) => {
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    container.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    velocityY = (event.clientX - lastX) * 0.0045
    velocityX = (event.clientY - lastY) * 0.0045
    lastX = event.clientX
    lastY = event.clientY
  }
  const onPointerUp = (event: PointerEvent) => {
    dragging = false
    container.releasePointerCapture(event.pointerId)
  }
  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    camera.position.z = Math.min(7.5, Math.max(3.2, camera.position.z + event.deltaY * 0.0025))
  }

  container.style.touchAction = "none" // laisse le geste vertical tourner l'objet au lieu de faire défiler la page
  container.addEventListener("pointerdown", onPointerDown)
  container.addEventListener("pointermove", onPointerMove)
  container.addEventListener("pointerup", onPointerUp)
  container.addEventListener("pointerleave", onPointerUp)
  container.addEventListener("wheel", onWheel, { passive: false })

  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    if (width === 0 || height === 0) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  let frame = 0
  function animate() {
    frame = requestAnimationFrame(animate)
    if (!dragging) {
      velocityX *= 0.94 // amortissement : l'élan ralentit puis s'éteint
      velocityY *= 0.94
    }
    group.rotation.x += velocityX
    group.rotation.y += velocityY
    halo.rotation.y -= 0.0015
    renderer.render(scene, camera)
  }
  animate()

  function dispose() {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    themeObserver.disconnect()
    container.removeEventListener("pointerdown", onPointerDown)
    container.removeEventListener("pointermove", onPointerMove)
    container.removeEventListener("pointerup", onPointerUp)
    container.removeEventListener("pointerleave", onPointerUp)
    container.removeEventListener("wheel", onWheel)
    core.geometry.dispose()
    halo.geometry.dispose()
    ;(core.material as THREE.Material).dispose()
    ;(halo.material as THREE.Material).dispose()
    renderer.dispose()
    if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
  }

  return { dispose }
}
