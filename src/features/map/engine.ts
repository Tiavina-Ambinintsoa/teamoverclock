/* eslint-disable @typescript-eslint/no-explicit-any */
// Nova Terra hologram map engine. Requires: npm i three && npm i -D @types/three
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type Sector = { id: string; code: string; name: string; hex_q: number; hex_r: number; x: number | null; y: number | null; color: string; activity_level: number; description?: string | null }
export type Building = { id: string; name: string; type: string; sector_id: string; status: string; description?: string | null }
export type Transport = { id: string; code: string; type: string; status: string; visibility: string; sector_id: string | null }
export type Danger = { id: string; slug: string; title: string; severity: string; status: string; affected_sector_ids: string[] | null; protocol_steps?: unknown }
export type MapReport = { id: string; title: string; description: string | null; sector_id: string; x: number | null; y: number | null; status: string; source: string; confidence_score: number | null; image_url?: string | null }
export type Observation = { kind: 'camera' | 'satellite'; id: string; sector_id: string; online: boolean }
export type MapData = { sectors: Sector[]; buildings: Building[]; transports: Transport[]; dangers: Danger[]; reports: MapReport[]; observations: Observation[] }
export type Layers = { transit: boolean; dangers: boolean; reports: boolean; labels: boolean; observations: boolean }
export type Pick = { kind: 'sector' | 'building' | 'report' | 'transport'; id: string }
export type Anchor = { x: number; y: number; visible: boolean }
export type EngineEvents = { onSelect?: (p: Pick | null) => void; onAnchor?: (a: Anchor | null) => void; onPick?: (p: { sectorId: string; x: number; y: number }) => void; onHover?: (label: string) => void }
export const EMPTY: MapData = { sectors: [], buildings: [], transports: [], dangers: [], reports: [], observations: [] }

let seed = 1
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const reseed = (n: number) => { seed = n }
const S3 = Math.sqrt(3), Z = 1.9
const hx = (q: number, r: number, s: number) => new THREE.Vector3(s * S3 * (q + r / 2), 0, s * 1.5 * r)
const SEV: Record<string, number> = { info: 0x4de1ff, low: 0x7dff7d, moderate: 0xffd24d, high: 0xff8a4c, extreme: 0xff2d55 }
const ST: Record<string, number> = { validated: 0x4de1ff, received: 0x6aa8ff, to_verify: 0xffb020, rejected: 0xff4d6d, assigned: 0x4dffb0, in_progress: 0x4dffb0, resolved: 0x7dff7d }
const VD: Record<string, number[]> = { maglev: [.22, .14, .9], hover_tram: [.25, .18, .6], shuttle: [.2, .12, .45], cargo_drone: [.3, .1, .3], drone_taxi: [.22, .1, .22], ferry: [.5, .12, 1.1], car: [.2, .1, .4] }
// Transit infrastructure (lines are config; vehicles come from the `transports` table by code)
const LINES: { code: string; c: number; y: number; s?: string[]; ring?: number; cl?: boolean; r: number; k: number; v: number; st?: boolean }[] = [
  { code: 'M1', c: 0x4de1ff, y: 2.4, s: ['S-09', 'S-05', 'S-01', 'S-02', 'S-08'], r: .07, k: 3, v: .07, st: true },
  { code: 'T1', c: 0xff4fd8, y: .8, s: ['S-02', 'S-03', 'S-04', 'S-05', 'S-06', 'S-07'], cl: true, r: .06, k: 2, v: .05, st: true },
  { code: 'P1', c: 0xffffff, y: 3.5, s: ['S-07', 'S-01', 'S-04'], r: .03, k: 2, v: .06 },
  { code: 'P2', c: 0xffffff, y: 3.1, s: ['S-06', 'S-01', 'S-03'], r: .03, k: 2, v: .06 },
  { code: 'SH1', c: 0xffd24d, y: 1.5, s: ['S-07', 'S-10', 'S-02'], r: .04, k: 1, v: .05 },
  { code: 'C1', c: 0xff8a4c, y: 1.9, s: ['S-04', 'S-01', 'S-07'], r: .03, k: 2, v: .05 },
  { code: 'D1', c: 0xb6ff4d, y: 4.3, s: ['S-01', 'S-03', 'S-08', 'S-10', 'S-06'], cl: true, r: .02, k: 2, v: .04 },
  { code: 'F1', c: 0x3a8dff, y: .35, ring: 13.4, cl: true, r: .04, k: 2, v: .02 },
]
const neon = (c: number, k = 1.25) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false })
const clear = (g: THREE.Object3D) => { g.traverse((o: any) => { o.geometry?.dispose?.(); for (const m of [].concat(o.material ?? [])) { const x = m as any; if (x.map && !x.map.userData.keep) x.map.dispose(); x.dispose?.() } }); g.clear() }
const keep = <T extends THREE.Texture>(t: T) => { t.userData.keep = true; return t }

export class NovaTerraEngine {
  private ren: THREE.WebGLRenderer; private sc = new THREE.Scene(); private cam: THREE.PerspectiveCamera; private ctl: OrbitControls
  private comp: EffectComposer; private bloom: UnrealBloomPass; private ro: ResizeObserver; private raf = 0
  private UT = { value: 0 }; private T = 0; private last = performance.now(); private mot = 1; private hc = false
  private d: MapData = EMPTY; private size = 1; private pos = new Map<string, THREE.Vector3>()
  private city = new THREE.Group(); private rep = new THREE.Group(); private dz = new THREE.Group(); private rt = new THREE.Group()
  private gT = new THREE.Group(); private gL = new THREE.Group(); private gO = new THREE.Group()
  private plates: THREE.Mesh[] = []; private veh: any[] = []; private holos: any[] = []; private obs: any[] = []; private pulses: any[] = []; private rocks: any[] = []; private dust!: THREE.Points
  private lay: Layers = { transit: true, labels: true, reports: true, dangers: true, observations: true }
  private dangerId: string | null = null; private routeIds: string[] | null = null; private pickMode = false
  private pickC: THREE.Mesh[] = []; private pickR: THREE.Mesh[] = []; private pickObj = new Map<string, THREE.Object3D>(); private sel: Pick | null = null; private selRing!: THREE.Mesh; private tmp = new THREE.Vector3(); private anchored = false
  private rc = new THREE.Raycaster(); private focus = new THREE.Vector3(); private fly = false; private hover: any = null; private down: { x: number; y: number } | null = null
  private glowT: THREE.Texture; private hatch: THREE.Texture; private win: THREE.Texture; private radar!: THREE.Mesh; private routeCurve: THREE.Curve<THREE.Vector3> | null = null; private routeDot: THREE.Sprite | null = null
  constructor(private el: HTMLElement, private ev: EngineEvents) {
    const w = el.clientWidth || 800, h = el.clientHeight || 600
    this.ren = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    this.ren.setPixelRatio(Math.min(devicePixelRatio, 2)); this.ren.setSize(w, h)
    this.ren.toneMapping = THREE.ACESFilmicToneMapping; this.ren.toneMappingExposure = .85
    this.ren.shadowMap.enabled = true; this.ren.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(this.ren.domElement); this.ren.domElement.style.touchAction = 'none'
    this.sc.background = new THREE.Color(0x050816); this.sc.fog = new THREE.FogExp2(0x050816, 0.011)
    this.cam = new THREE.PerspectiveCamera(45, w / h, .1, 400); this.cam.position.set(18, 20, 26)
    this.ctl = new OrbitControls(this.cam, this.ren.domElement); this.ctl.enableDamping = true; this.ctl.maxPolarAngle = 1.45; this.ctl.minDistance = 8; this.ctl.maxDistance = 90
    this.ctl.addEventListener('start', () => { this.fly = false })
    const pm = new THREE.PMREMGenerator(this.ren); this.sc.environment = pm.fromScene(new RoomEnvironment(), .04).texture; (this.sc as any).environmentIntensity = .35
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 })
    this.comp = new EffectComposer(this.ren, rt); this.comp.setPixelRatio(Math.min(devicePixelRatio, 2)); this.comp.setSize(w, h)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), .18, .5, .92)
    this.comp.addPass(new RenderPass(this.sc, this.cam)); this.comp.addPass(this.bloom); this.comp.addPass(new OutputPass())
    // textures
    const mk = (n: number, f: (g: CanvasRenderingContext2D) => void, h2 = n) => { const c = document.createElement('canvas'); c.width = n; c.height = h2; f(c.getContext('2d')!); return keep(new THREE.CanvasTexture(c)) }
    this.glowT = mk(64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64) })
    this.hatch = mk(64, g => { g.fillStyle = '#fff'; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 72, 64); g.lineTo(i + 64, 64); g.fill() } }); this.hatch.wrapS = this.hatch.wrapT = THREE.RepeatWrapping; this.hatch.repeat.set(3, 3)
    this.win = mk(32, g => { g.fillStyle = '#000'; g.fillRect(0, 0, 32, 64); for (let y = 2; y < 64; y += 4) for (let x = 2; x < 32; x += 4) if (rnd() < .45) { g.fillStyle = rnd() < .7 ? '#9fe9ff' : '#ffd89a'; g.fillRect(x, y, 2, 2) } }, 64); this.win.colorSpace = THREE.SRGBColorSpace; this.win.magFilter = THREE.NearestFilter; this.win.wrapS = this.win.wrapT = THREE.RepeatWrapping
    // lights (moon key with soft shadows + cyan under-glow + magenta core accent)
    this.sc.add(new THREE.HemisphereLight(0x8fa4ff, 0x0a1020, .55))
    const key = new THREE.DirectionalLight(0xbcd0ff, 1.7); key.position.set(-14, 26, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 }); key.shadow.bias = -.0005; this.sc.add(key)
    const un = new THREE.PointLight(0x4de1ff, 130, 40); un.position.set(0, -3, 0); this.sc.add(un)
    const mg = new THREE.PointLight(0xff4fd8, 32, 24); mg.position.set(0, 5, 0); this.sc.add(mg)
    this.selRing = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 6, 6), neon(0xffffff, 2.4)); this.selRing.rotation.x = Math.PI / 2; this.selRing.visible = false; this.sc.add(this.selRing)
    this.buildStatic(mk); this.sc.add(this.city, this.rep, this.dz, this.rt)
    const cv = this.ren.domElement
    cv.addEventListener('pointerdown', e => { this.down = { x: e.clientX, y: e.clientY } })
    cv.addEventListener('pointermove', e => { if (this.down) return; const ht = this.hit(e); this.hover = ht && ht.plate ? ht.obj : null; this.ev.onHover?.(ht ? ht.label : '') })
    cv.addEventListener('pointerup', e => { const m = this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4; this.down = null; if (m) return; this.click(e) })
    this.ro = new ResizeObserver(() => { const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return; this.ren.setSize(W, H); this.comp.setSize(W, H); this.cam.aspect = W / H; this.cam.updateProjectionMatrix() }); this.ro.observe(el)
    this.loop()
  }
  // ---------- public API ----------
  setData(d: MapData) { this.d = d; this.buildCity(); this.buildReports(); this.buildDanger(); this.drawRoute() }
  setLayers(l: Layers) { this.lay = l; this.applyLayers() }
  setDanger(id: string | null) { this.dangerId = id; this.buildDanger() }
  setRoute(ids: string[] | null) { this.routeIds = ids; this.drawRoute() }
  setPickMode(b: boolean) { this.pickMode = b }
  setReports(r: MapReport[]) { if (r === this.d.reports) return; this.d = { ...this.d, reports: r }; this.buildReports() }
  setDangers(ds: Danger[]) { if (ds === this.d.dangers) return; this.d = { ...this.d, dangers: ds }; this.buildDanger() }
  select(p: Pick | null) {
    this.sel = p; if (!p) return
    const o = p.kind === 'sector' ? null : this.pickObj.get(p.kind + ':' + p.id), v = p.kind === 'sector' ? this.pos.get(p.id) : o?.getWorldPosition(new THREE.Vector3())
    if (v) { this.focus.set(v.x, 0, v.z); this.fly = true }
  }
  setPrefs(p: { reduceMotion?: boolean; highContrast?: boolean }) { this.mot = p.reduceMotion ? 0 : 1; this.hc = !!p.highContrast; this.bloom.strength = this.hc ? .1 : .4; (this.sc.background as THREE.Color).setHex(this.hc ? 0 : 0x050816) }
  focusSector(id: string | null) { const p = id && this.pos.get(id); if (p) { this.focus.copy(p); this.fly = true } }
  dispose() { cancelAnimationFrame(this.raf); this.ev.onAnchor?.(null); this.ro.disconnect(); this.ctl.dispose();[this.city, this.rep, this.dz, this.rt].forEach(clear); this.sc.traverse((o: any) => { o.geometry?.dispose?.() }); this.comp.dispose(); this.ren.dispose(); this.ren.forceContextLoss(); this.ren.domElement.remove() }
  // ---------- helpers ----------
  private toWorld(x: number, y: number) { return new THREE.Vector3(x / this.size * Z, 0, y / this.size * Z) }
  private toRef(v: THREE.Vector3) { return { x: v.x / Z * this.size, y: v.z / Z * this.size } }
  private glow(c: number, s: number) { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowT, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); o.scale.set(s, s, 1); return o }
  private holo(o: any) { // hologram shader: fresnel rim, scanlines, rising scan bands, glitch
    const m = new THREE.MeshStandardMaterial(o), U = this.UT; m.transparent = true; m.opacity = Math.min(m.opacity, .9); m.customProgramCacheKey = () => 'holo'
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = U
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 hp_=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nhp_=instanceMatrix*hp_;\n#endif\nvWy=(modelMatrix*hp_).y;')
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWy;\nuniform float uT;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat fr_=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.2);float sl_=.5+.5*sin(gl_FragCoord.y*1.5+uT*5.0);float bd_=pow(max(0.0,sin(vWy*2.0-uT*2.5)),30.0);float gt_=step(.975,fract(sin(floor(uT*5.0)*91.7)*437.5));totalEmissiveRadiance+=diffuseColor.rgb*(fr_*1.2+.1*sl_+bd_*.7+gt_*.2)+vec3(.0,.015,.03);')
    }
    return m
  }
  private label(t: string, t2: string, p: THREE.Vector3, col: string) {
    const direction = p.lengthSq() > .01 ? new THREE.Vector3(p.x, 0, p.z).normalize() : new THREE.Vector3(1, 0, 0)
    const labelPosition = p.clone().addScaledVector(direction, 3.2)
    const leader = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p.x, 1.8, p.z),
      new THREE.Vector3(labelPosition.x, 3.5, labelPosition.z),
    ])
    this.gL.add(new THREE.Line(leader, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .55, depthTest: false })))
    const c = document.createElement('canvas'); c.width = 640; c.height = 160; const g = c.getContext('2d')!; g.textAlign = 'center'; g.shadowColor = '#000'; g.shadowBlur = 8
    g.fillStyle = col; g.font = 'bold 52px system-ui'; g.fillText(t, 320, 64); g.font = '40px system-ui'; g.fillStyle = '#cfe8ff'; g.fillText(t2, 320, 122)
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.position.set(labelPosition.x, 4.3, labelPosition.z); s.scale.set(4.4, 1.1, 1); this.gL.add(s)
  }
  private visibleChain(o: THREE.Object3D | null) { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true }
  private hit(e: PointerEvent, platesOnly = false) {
    const r = this.ren.domElement.getBoundingClientRect(); this.rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), this.cam)
    const list = platesOnly ? this.plates : [...this.pickC, ...this.pickR, ...this.plates]
    for (const h of this.rc.intersectObjects(list, false)) {
      if (!this.visibleChain(h.object)) continue
      const u = h.object.userData, pk = u.pick as Pick | undefined, sid = u.sid as string | null | undefined
      return { obj: h.object as THREE.Mesh, point: h.point, label: (u.label as string) ?? '', plate: !pk, pick: pk ?? (sid ? ({ kind: 'sector', id: sid } as Pick) : null) }
    }
    return null
  }
  private click(e: PointerEvent) {
    if (this.pickMode) {
      const h = this.hit(e, true); if (!h) { this.ev.onSelect?.(null); return }
      const sid = h.obj.userData.sid as string | null; if (sid) this.ev.onPick?.({ sectorId: sid, ...this.toRef(h.point) }); else this.ev.onHover?.('Reports need a built sector'); return
    }
    const p = this.hit(e)?.pick ?? null; this.select(p); this.ev.onSelect?.(p)
  }
  private mark(o: THREE.Object3D, p: Pick, label: string, bucket: 'C' | 'R') {
    if (p.kind === 'transport') o.add(new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })))
    const list = bucket === 'C' ? this.pickC : this.pickR
    o.traverse((m: any) => { if (m.isMesh) { m.userData.pick = p; m.userData.label = label; list.push(m) } })
    this.pickObj.set(p.kind + ':' + p.id, o)
  }
  private track(dt: number) {
    const p = this.sel, o = p && p.kind !== 'sector' ? this.pickObj.get(p.kind + ':' + p.id) : null
    const base = !p ? null : p.kind === 'sector' ? this.pos.get(p.id) : o?.getWorldPosition(this.tmp)
    if (!p || !base) { this.selRing.visible = false; if (this.anchored) { this.anchored = false; this.ev.onAnchor?.(null) } return }
    const k = { sector: [1.55, .12, 3.4], building: [.85, .35, 3.1], report: [.9, .45, 4.9], transport: [.55, base.y, 1.3] }[p.kind]
    this.selRing.visible = true; this.selRing.position.set(base.x, k[1], base.z); this.selRing.scale.setScalar(k[0]); this.selRing.rotation.z += dt * 1.2
    const v = this.tmp.set(base.x, k[2], base.z).project(this.cam), W = this.el.clientWidth, H = this.el.clientHeight
    this.anchored = true; this.ev.onAnchor?.({ x: (v.x * .5 + .5) * W, y: (-v.y * .5 + .5) * H, visible: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 })
  }
  private applyLayers() { const l = this.lay; this.gT.visible = l.transit; this.gL.visible = l.labels; this.gO.visible = l.observations; this.rep.visible = l.reports; this.dz.visible = l.dangers }
  // ---------- static scenery ----------
  private buildStatic(mk: any) {
    reseed(3)
    const sc = this.sc, a: number[] = []
    for (let i = 0; i < 900; i++) { const t = rnd() * 6.28, u = rnd(), s = Math.sqrt(1 - u * u); a.push(160 * s * Math.cos(t), 160 * u + 8, 160 * s * Math.sin(t)) }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 1.6, sizeAttenuation: false, fog: false })))
    const pl = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 32), new THREE.MeshStandardMaterial({ color: 0x4b2fd6, emissive: 0x2a1a8a, emissiveIntensity: .6, roughness: .9, fog: false })); pl.position.set(-100, 60, -130); sc.add(pl)
    const rg = new THREE.Mesh(new THREE.RingGeometry(21, 29, 64), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: .4, side: THREE.DoubleSide, fog: false })); rg.position.copy(pl.position); rg.rotation.set(1.2, .3, 0); sc.add(rg)
    // light grid under the city
    const pts: [THREE.Vector3, number][] = []; for (let q = -24; q <= 24; q++) for (let r = -24; r <= 24; r++) { if (Math.abs(q + r) > 24) continue; const p = hx(q, r, .62), d = p.length(); if (d < 23) pts.push([p, d]) }
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.34, .34, .05, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), pts.length), M = new THREE.Matrix4(), C = new THREE.Color()
    pts.forEach(([p, d], i) => { M.setPosition(p.x, -.3, p.z); im.setMatrixAt(i, M); C.setHSL(.55 + rnd() * .1, .8, Math.max(.03, .26 - d * .0105) * (.5 + rnd())); im.setColorAt(i, C) }); sc.add(im)
    const hull = new THREE.Mesh(new THREE.ConeGeometry(14, 9, 6, 1, true), this.holo({ color: 0x0a1228, metalness: .9, roughness: .35, side: THREE.DoubleSide })); hull.rotation.x = Math.PI; hull.position.y = -4.7
    hull.add(new THREE.LineSegments(new THREE.EdgesGeometry(hull.geometry), new THREE.LineBasicMaterial({ color: 0x4de1ff, transparent: true, opacity: .5 }))); sc.add(hull)
    const rd = mk(256, (g: CanvasRenderingContext2D) => { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(77,225,255,${(1 - i / 40) * .35})`; g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 128, -i * .03, -(i + 1) * .03, true); g.fill() } })
    this.radar = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshBasicMaterial({ map: rd, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.radar.rotation.x = -Math.PI / 2; this.radar.position.y = .06; sc.add(this.radar)
    // projector table with degree ticks + 6 emitters
    const tb = mk(512, (g: CanvasRenderingContext2D) => { g.translate(256, 256); g.strokeStyle = '#4de1ff';[250, 215, 150, 90].forEach((r, i) => { g.lineWidth = i ? 1 : 3; g.globalAlpha = i ? .5 : .9; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke() }); g.globalAlpha = .8; for (let i = 0; i < 120; i++) { g.rotate(Math.PI / 60); g.lineWidth = i % 10 ? 1 : 3; g.beginPath(); g.moveTo(0, i % 10 ? 232 : 222); g.lineTo(0, 250); g.stroke() } })
    const b = new THREE.Mesh(new THREE.CircleGeometry(20, 64), new THREE.MeshBasicMaterial({ map: tb, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.rotation.x = -Math.PI / 2; b.position.y = -9.5; sc.add(b)
    for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3, x = Math.sin(t) * 12, z = Math.cos(t) * 12; const e = new THREE.Mesh(new THREE.CylinderGeometry(.3, .5, .5, 6), neon(0x4de1ff)); e.position.set(x, -9.3, z); sc.add(e)
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(.1, .7, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x4de1ff, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); bm.position.set(x, -5, z); sc.add(bm) }
    // floating rocks (frontier debris)
    const rk = new THREE.IcosahedronGeometry(1, 0)
    for (let i = 0; i < 16; i++) { const t = rnd() * 6.283, r = 17 + rnd() * 12, k = .8 + rnd() * 2.2, o = new THREE.Mesh(rk, new THREE.MeshStandardMaterial({ color: 0x0e1a33, emissive: 0x1a4f8a, emissiveIntensity: .3, flatShading: true, roughness: .85 }))
      o.scale.set(k, k * .6, k); o.position.set(Math.cos(t) * r, -3 + rnd() * 7, Math.sin(t) * r); o.castShadow = true; o.add(new THREE.LineSegments(new THREE.EdgesGeometry(rk), new THREE.LineBasicMaterial({ color: 0x4de1ff, transparent: true, opacity: .5 }))); sc.add(o); this.rocks.push({ o, y: o.position.y, ph: rnd() * 6 }) }
    // atmospheric dust + air traffic
    const dp: number[] = []; for (let i = 0; i < 500; i++) dp.push((rnd() - .5) * 30, rnd() * 9, (rnd() - .5) * 30)
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9bd8ff, size: .06, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(this.dust)
    for (let i = 0; i < 30; i++) { const s = this.glow(i % 3 ? 0x9bffd0 : 0xff4fd8, .6); sc.add(s); const o = { a: rnd() * 6.28, r: 3 + rnd() * 11, y: .8 + rnd() * 4, v: (rnd() < .5 ? -1 : 1) * (.15 + rnd() * .3) }; this.pulses.push((dt: number) => { o.a += o.v * dt; s.position.set(Math.cos(o.a) * o.r, o.y, Math.sin(o.a) * o.r * .9) }) }
  }
  // ---------- city (rebuilt when data changes) ----------
  private building(t: string, col: number) {
    const g = new THREE.Group(), m = this.holo({ color: col, emissive: col, emissiveIntensity: .45, metalness: .5, roughness: .25 }), w = this.holo({ color: 0xdff3ff, emissive: 0xffffff, emissiveMap: this.win, emissiveIntensity: .7, metalness: .3, roughness: .2 }), rd = new THREE.MeshBasicMaterial({ color: 0xff4d6d })
    const cy = new THREE.CylinderGeometry(.5, .5, 1, 6), cn = new THREE.ConeGeometry(.5, 1, 6), bx = new THREE.BoxGeometry(1, 1, 1), sg = new THREE.SphereGeometry(.5, 16, 12)
    const a = (geo: THREE.BufferGeometry, mt: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => { const o = new THREE.Mesh(geo, mt); o.scale.set(sx, sy, sz); o.position.set(x, y + sy / 2, z); o.castShadow = o.receiveShadow = true; g.add(o) }
    if (t === 'administrative') { a(cy, w, 0, 0, 0, 1, 2.3, 1); a(cy, m, 0, 2.3, 0, .6, .5, .6); a(cn, m, 0, 2.8, 0, .3, .9, .3) }
    else if (t === 'residential') { a(bx, w, -.35, 0, 0, .4, 1.6, .4); a(bx, w, .3, 0, .2, .4, 1.1, .4); a(bx, w, 0, 0, -.4, .4, 1.9, .4) }
    else if (t === 'energy') { a(cy, m, 0, 0, 0, .9, .9, .9); a(cy, w, 0, .9, 0, .5, .3, .5); const o = this.glow(0xffe34d, 2); o.position.y = 1.5; g.add(o) }
    else if (t === 'industrial') { a(bx, m, 0, 0, 0, 1.1, .5, .8); a(cy, m, -.3, .5, 0, .2, 1.2, .2); a(cy, m, .3, .5, .1, .2, .9, .2) }
    else if (t === 'public_place') { const o = new THREE.Mesh(new THREE.SphereGeometry(.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x66ffaa, transparent: true, opacity: .35, roughness: .05, metalness: 0, clearcoat: 1, emissive: 0x22c55e, emissiveIntensity: .5 })); g.add(o); a(sg, m, -.2, 0, .1, .25, .4, .25); a(sg, m, .2, 0, -.1, .3, .5, .3) }
    else if (t === 'hospital') { a(bx, w, 0, 0, 0, 1, .9, 1); a(bx, rd, 0, .9, 0, .5, .1, .15); a(bx, rd, 0, .9, 0, .15, .1, .5) }
    else if (t === 'transport_hub') { a(cy, m, 0, 0, 0, 1.5, .1, 1.5); a(cn, w, 0, .1, 0, .3, 1.6, .3); const r = new THREE.Mesh(new THREE.TorusGeometry(.6, .03, 6, 24), neon(0x4de1ff)); r.rotation.x = Math.PI / 2; r.position.y = .9; g.add(r) }
    else if (t === 'telecom') { a(cn, m, 0, 0, 0, .5, 2.4, .5); a(sg, w, 0, 2.4, 0, .3, .3, .3); const o = this.glow(0xb48cff, 1.6); o.position.y = 2.6; g.add(o) }
    else if (t === 'security') { a(bx, m, 0, 0, 0, 1.1, .7, 1.1); a(cn, m, 0, .7, 0, 1, .6, 1) }
    else { a(bx, w, 0, 0, 0, 1.1, .6, .7); a(cy, w, 0, .6, 0, .3, 1.4, .3); a(cn, m, 0, 2, 0, .4, .5, .4) }
    return g
  }
  private buildCity() {
    reseed(7); this.pickC = []; for (const k of [...this.pickObj.keys()]) if (!k.startsWith('report:')) this.pickObj.delete(k)
    clear(this.city); this.gT = new THREE.Group(); this.gL = new THREE.Group(); this.gO = new THREE.Group(); this.city.add(this.gT, this.gL, this.gO)
    this.plates = []; this.veh = []; this.obs = []; this.pos.clear(); const { sectors, buildings, transports, observations } = this.d; if (!sectors.length) return
    const k = sectors.find(s => s.x && s.hex_q + s.hex_r / 2); this.size = k ? (k.x as number) / (S3 * (k.hex_q + k.hex_r / 2)) : 1
    const bySid = new Map(sectors.map(s => [s.id, s])), byCode = new Map(sectors.map(s => [s.code, s])), have = new Set(sectors.map(s => s.hex_q + ',' + s.hex_r))
    const plG = new THREE.CylinderGeometry(Z * .95, Z * .95, .2, 6), L: any[] = [], TW: any[] = []
    const plate = (p: THREE.Vector3, col: number, sid: string | null, label: string, ei: number) => { const m = new THREE.Mesh(plG, this.holo({ color: 0x0a1430, emissive: col, emissiveIntensity: ei, metalness: .7, roughness: .3 })); m.position.set(p.x, -.1, p.z); m.receiveShadow = true; m.userData = { sid, label, base: ei }; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(plG), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: sid ? 1 : .6 }))); this.city.add(m); this.plates.push(m); return m }
    sectors.forEach(s => { const p = hx(s.hex_q, s.hex_r, Z), col = new THREE.Color(s.color).getHex(); this.pos.set(s.id, p); const m = plate(p, col, s.id, `${s.code} ${s.name}${s.description ? ' · ' + s.description : ''}`, .12 + s.activity_level / 100 * .25); (m.userData as any).act = s.activity_level
      const n0 = L.length; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { if (Math.abs(q + r) > 2) continue; const o = hx(q, r, .34), d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); L.push({ x: p.x + o.x, z: p.z + o.z, c: col, h: d ? .05 + rnd() * (.05 + s.activity_level / 100 * .28) : .3, ctr: !d }) }
      L.slice(n0).forEach(l => { if (!l.ctr && rnd() < .4) TW.push({ x: l.x, z: l.z, y: l.h, h: .3 + rnd() * 1.1, c: l.c }) }) })
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) { if (Math.abs(q + r) > 3 || have.has(q + ',' + r)) continue; const p = hx(q, r, Z); plate(p, 0x2a6fa8, null, 'Frontier zone · undeveloped, planned expansion', .12)
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { if (Math.abs(a + b) > 2 || rnd() < .3) continue; const o = hx(a, b, .34); L.push({ x: p.x + o.x, z: p.z + o.z, c: 0x2a6fa8, h: .03 + rnd() * .12 }); if (rnd() < .1) TW.push({ x: p.x + o.x, z: p.z + o.z, y: .1, h: .2 + rnd() * .5, c: 0x5aa8ff }) } }
    const M = new THREE.Matrix4(), C = new THREE.Color(), ep: number[] = [], ec: number[] = []
    const hexG = new THREE.CylinderGeometry(.3, .3, 1, 6); hexG.translate(0, .5, 0)
    const im = new THREE.InstancedMesh(hexG, this.holo({ metalness: .6, roughness: .3 }), L.length); im.castShadow = im.receiveShadow = true
    L.forEach((l, i) => { M.makeScale(1, l.h, 1).setPosition(l.x, 0, l.z); im.setMatrixAt(i, M); C.setHex(l.c).multiplyScalar(.3 + rnd() * .5); im.setColorAt(i, C); C.setHex(l.c)
      for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3, b = (q + 1) * Math.PI / 3; ep.push(l.x + .3 * Math.sin(a), l.h + .01, l.z + .3 * Math.cos(a), l.x + .3 * Math.sin(b), l.h + .01, l.z + .3 * Math.cos(b)); ec.push(C.r, C.g, C.b, C.r, C.g, C.b) } })
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3)); eg.setAttribute('color', new THREE.Float32BufferAttribute(ec, 3))
    const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.holo({ color: 0xffffff, emissive: 0xffffff, emissiveMap: this.win, emissiveIntensity: .75, metalness: .6, roughness: .2 }), TW.length); tm.castShadow = tm.receiveShadow = true
    TW.forEach((w, i) => { const wd = .1 + rnd() * .1; M.makeScale(wd, w.h, wd).setPosition(w.x, w.y + w.h / 2, w.z); tm.setMatrixAt(i, M); C.setHex(w.c).multiplyScalar(.7 + rnd() * .5); tm.setColorAt(i, C) })
    this.city.add(im, tm, new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false })))
    // buildings (first at sector centre, extras on a ring), status rings, labels, light shafts
    const per = new Map<string, Building[]>(); buildings.forEach(b => per.set(b.sector_id, [...(per.get(b.sector_id) ?? []), b]))
    sectors.forEach(s => { const p = this.pos.get(s.id)!, col = new THREE.Color(s.color).getHex(), list = per.get(s.id) ?? []
      list.forEach((b, i) => { const g = this.building(b.type, col), j = i - 1, ring = i === 0 ? 0 : j < 6 ? 1 : 2, ang = ring === 1 ? j / 6 * 6.283 + .5 : (j - 6) / 8 * 6.283 + .2, rad = ring === 1 ? 1 : 1.5
        g.position.set(p.x + (ring ? Math.cos(ang) * rad : 0), .3, p.z + (ring ? Math.sin(ang) * rad : 0)); if (ring) g.scale.setScalar(ring === 1 ? .55 : .42); this.city.add(g); this.mark(g, { kind: 'building', id: b.id }, b.name, 'C')
        if (b.status !== 'operational') { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, .04, 6, 6), neon(b.status === 'temporarily_closed' ? 0xff4d6d : 0xffb020)); r.rotation.x = Math.PI / 2; r.scale.setScalar(g.scale.x); r.position.set(g.position.x, .5, g.position.z); this.city.add(r); this.obs.push({ spin: r }) } })
      const b0 = list[0]; this.label(`${s.code} ${s.name}`, b0 ? b0.name + (b0.status !== 'operational' ? ' · ' + b0.status.replace('_', ' ').toUpperCase() : '') : '', p, '#' + new THREE.Color(s.color).getHexString())
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(.04, .5, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); sh.position.set(p.x, 3.8, p.z); this.city.add(sh) })
    // transit infrastructure + DB-driven vehicles
    const rows = new Map(transports.map(t => [t.code, t]))
    LINES.forEach(Ln => { const pts = Ln.ring ? Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.cos(i / 14 * 6.283) * Ln.ring!, Ln.y, Math.sin(i / 14 * 6.283) * Ln.ring!)) : (Ln.s ?? []).map(c => byCode.get(c)).filter(Boolean).map(s => { const p = this.pos.get(s!.id)!; return new THREE.Vector3(p.x, Ln.y, p.z) }); if (pts.length < 2) return
      const cu = new THREE.CatmullRomCurve3(pts, !!Ln.cl, 'catmullrom', 0), mt = neon(Ln.c); this.gT.add(new THREE.Mesh(new THREE.TubeGeometry(cu, pts.length * 6, Ln.r, 6, !!Ln.cl), mt))
      if (Ln.st) pts.forEach(p => { const o = new THREE.Mesh(new THREE.TorusGeometry(.35, .03, 6, 6), mt); o.rotation.x = Math.PI / 2; o.position.copy(p); this.gT.add(o); const py = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 6), new THREE.MeshBasicMaterial({ color: 0x335577 })); py.scale.y = p.y; py.position.set(p.x, p.y / 2, p.z); this.gT.add(py) })
      const row = rows.get(Ln.code); if (!row) return
      for (let i = 0; i < Ln.k; i++) { const v = this.vehicle(row.type, Ln.c, row.status === 'active'); this.gT.add(v); this.mark(v, { kind: 'transport', id: row.id }, row.code + ' · ' + row.type, 'C')
        if (row.status === 'active') this.veh.push({ v, cu, cl: !!Ln.cl, t: i / Ln.k, sp: Ln.v * (1 + i * .12) }); else { v.position.copy(pts[0]); v.position.y += .12; break } } })
    transports.filter(t => !LINES.some(l => l.code === t.code)).forEach(t => { const s = t.sector_id ? bySid.get(t.sector_id) : null; if (!s) return; const p = this.pos.get(s.id)!, act = t.status === 'active', v = this.vehicle(t.type, 0xffd700, act)
      if (act) { const cu = new THREE.CatmullRomCurve3(Array.from({ length: 10 }, (_, i) => new THREE.Vector3(p.x + Math.cos(i / 10 * 6.283) * 1.5, .5, p.z + Math.sin(i / 10 * 6.283) * 1.5)), true); this.veh.push({ v, cu, cl: true, t: rnd(), sp: .08 }) } else v.position.set(p.x + 1, .45, p.z + .9); this.gT.add(v); this.mark(v, { kind: 'transport', id: t.id }, t.code + ' · ' + t.type, 'C') })
    // admin layer: cameras (scanning cones) + satellites (orbit + beam)
    observations.forEach((o, i) => { const s = bySid.get(o.sector_id); if (!s) return; const p = this.pos.get(s.id)!
      if (o.kind === 'camera') { const c = new THREE.Group(); c.position.set(p.x + 1.3, .6, p.z - .7); const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .3, 8), neon(o.online ? 0x9bffd0 : 0xff4d6d)); c.add(b)
        if (o.online) { const cone = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9bffd0, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.rotation.z = Math.PI / 2; cone.position.x = -.6; const pv = new THREE.Group(); pv.add(cone); pv.position.y = .15; c.add(pv); this.obs.push({ pv }) } this.gO.add(c) }
      else { const m = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .25), neon(0xffffff)); m.add(this.glow(0x9bffd0, 1.4)); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(6).fill(0), 3)); const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9bffd0, transparent: true, opacity: .6 })); this.gO.add(m, ln); this.obs.push({ sat: m, ln, a: i * 2.1, h: 9 + (i % 3), p }) } })
    this.applyLayers()
  }
  private vehicle(type: string, c: number, active: boolean) {
    const v = type === 'sky_pod' ? new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), neon(c)) : new THREE.Mesh(new THREE.BoxGeometry(...((VD[type] ?? VD.car) as [number, number, number])), active ? neon(0xffffff, 1.6) : new THREE.MeshStandardMaterial({ color: 0x555b66, roughness: .6 }))
    if (active) v.add(this.glow(c, .9)); v.castShadow = true; return v
  }
  // ---------- reports (3D pads + hovering holograms) ----------
  private buildReports() {
    reseed(11); this.pickR = []; for (const k of [...this.pickObj.keys()]) if (k.startsWith('report:')) this.pickObj.delete(k)
    clear(this.rep); this.holos = []
    this.d.reports.forEach((r, n) => { const s = this.pos.get(r.sector_id); if (!s) return; let p = r.x != null && r.y != null ? this.toWorld(r.x, r.y) : s.clone().add(new THREE.Vector3(Math.cos(n * 2.1) * .9, 0, Math.sin(n * 2.1) * .9)); if (p.distanceTo(s) > 1.5) p = s.clone()
      const col = ST[r.status] ?? 0x4de1ff, g = new THREE.Group(); g.position.set(p.x, .4, p.z); this.rep.add(g)
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .1, 6), neon(col))); const rg = new THREE.Mesh(new THREE.TorusGeometry(.7, .04, 6, 6), neon(col)); rg.rotation.x = Math.PI / 2; rg.position.y = .2; g.add(rg)
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(.08, .5, 3.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); bm.position.y = 1.7; bm.raycast = () => {}; g.add(bm)
      const c = document.createElement('canvas'); c.width = 1024; c.height = 704; const x = c.getContext('2d')!, tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; let im: HTMLImageElement | null = null; const css = '#' + col.toString(16).padStart(6, '0')
      const draw = () => { x.clearRect(0, 0, 1024, 704); x.fillStyle = 'rgba(8,40,70,.62)'; x.fillRect(0, 0, 1024, 704); x.strokeStyle = css; x.lineWidth = 8; x.strokeRect(8, 8, 1008, 688)
        x.fillStyle = css; x.font = 'bold 60px system-ui'; x.fillText(r.title.slice(0, 28), 40, 92); x.fillRect(40, 116, 944, 4); let tx = 40
        if (im) { const ar = im.width / im.height, tr = 4 / 3; let sw = im.width, sh = im.height; if (ar > tr) sw = sh * tr; else sh = sw / tr; x.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 40, 152, 400, 300); x.strokeRect(40, 152, 400, 300); tx = 472 }
        x.fillStyle = '#d8f8ff'; x.font = '44px system-ui'; const W = im ? 510 : 944, mx = im ? 8 : 9; let l = '', y = 184, k = 0; for (const wd of (r.description || '(no comment)').split(/\s+/)) { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > W && l) { x.fillText(l, tx, y); y += 56; l = wd; if (++k >= mx) { l = ''; break } } else l = t } if (l) x.fillText(l, tx, y)
        x.fillStyle = css; x.font = 'bold 34px system-ui'; x.fillText(`${r.status.toUpperCase()} · ${r.source}${r.confidence_score ? ' · conf ' + r.confidence_score : ''}`, 40, 612); x.font = '30px system-ui'; x.fillText(this.d.sectors.find(z => z.id === r.sector_id)?.name ?? '', 40, 664)
        for (let yy = 0; yy < 704; yy += 6) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, yy, 1024, 2) } tex.needsUpdate = true }
      draw(); if (r.image_url) { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => { im = i; draw() }; i.src = r.image_url }
      const hg = new THREE.Group(); hg.position.y = 3.9; g.add(hg); const pg = new THREE.PlaneGeometry(3.2, 2.2), pm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .92, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
      hg.add(new THREE.Mesh(pg, pm), new THREE.LineSegments(new THREE.EdgesGeometry(pg), neon(col, 1.6))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .06), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); hg.add(sc)
      this.mark(g, { kind: 'report', id: r.id }, r.title, 'R'); this.holos.push({ g, hg, rg, pm, sc, ph: rnd() * 6 }) })
    this.applyLayers()
  }
  // ---------- danger zones + route ----------
  private buildDanger() {
    clear(this.dz); const rank = Object.keys(SEV), worst = new Map<string, string>()
    this.d.dangers.filter(x => x.status === 'active' && (!this.dangerId || x.id === this.dangerId)).forEach(x => (x.affected_sector_ids ?? []).forEach(id => { const c = worst.get(id); if (!c || rank.indexOf(x.severity) > rank.indexOf(c)) worst.set(id, x.severity) }))
    worst.forEach((sev, id) => { const p = this.pos.get(id); if (!p) return; const col = SEV[sev] ?? 0xff2d55, g = new THREE.Group(); g.position.set(p.x, 0, p.z)
      const m = new THREE.Mesh(new THREE.CylinderGeometry(Z * .97, Z * .97, 3.4, 6, 1, true), new THREE.MeshBasicMaterial({ color: col, map: this.hatch, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })); m.position.y = 1.7; g.add(m)
      const r = new THREE.Mesh(new THREE.CylinderGeometry(Z * .97, Z * .97, .06, 6), neon(col, 1.6)); r.position.y = 3.4; g.add(r); this.dz.add(g) }); this.applyLayers()
  }
  private drawRoute() {
    clear(this.rt); this.routeCurve = null; this.routeDot = null; const pts = (this.routeIds ?? []).map(id => this.pos.get(id)).filter(Boolean).map(p => new THREE.Vector3(p!.x, 2.9, p!.z)); if (pts.length < 2) return
    if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], .5)); const cu = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0); this.routeCurve = cu
    this.rt.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 40, .06, 6), neon(0xffffff, 2.5))); this.routeDot = this.glow(0xffffff, 1.4); this.rt.add(this.routeDot)
  }
  // ---------- frame loop ----------
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop); const now = performance.now(), dt = Math.min((now - this.last) / 1000, .1) * this.mot; this.last = now; this.T += dt; this.UT.value = this.T; const T = this.T
    for (const o of this.veh) { o.t = (o.t + o.sp * dt) % 1; const u = o.cl ? o.t : 1 - Math.abs(2 * o.t - 1), p = o.cu.getPointAt(u), tg = o.cu.getTangentAt(u); if (!o.cl && o.t > .5) tg.negate(); o.v.position.copy(p); o.v.position.y += .12; o.v.lookAt(p.clone().add(tg)) }
    for (const o of this.obs) { if (o.pv) o.pv.rotation.y += dt * 1.2; if (o.spin) o.spin.rotation.z += dt * .8
      if (o.sat) { o.a += dt * .25; o.sat.position.set(Math.cos(o.a) * 16, o.h, Math.sin(o.a) * 16); const a = o.ln.geometry.attributes.position; a.setXYZ(0, o.sat.position.x, o.sat.position.y, o.sat.position.z); a.setXYZ(1, o.p.x, 0, o.p.z); a.needsUpdate = true } }
    for (const h of this.holos) { h.hg.position.y = 3.9 + Math.sin(T * 1.5 + h.ph) * .15; h.hg.rotation.y = Math.atan2(this.cam.position.x - h.g.position.x, this.cam.position.z - h.g.position.z); h.rg.rotation.z += dt; h.pm.opacity = .88 + .05 * Math.sin(T * 25 + h.ph); h.sc.position.y = Math.sin(T * 1.2 + h.ph) * 1.05 }
    for (const p of this.plates) { const u = p.userData, hv = p === this.hover; (p.material as THREE.MeshStandardMaterial).emissiveIntensity = (u.base as number) * (hv ? 3 : .7 + .3 * Math.sin(T * 2 + p.position.x)) }
    this.dz.children.forEach((g: any, i) => { const m = g.children[0].material; m.map.offset.y -= dt * .12; m.opacity = .4 + .15 * Math.sin(T * 4 + i) })
    this.pulses.forEach(f => f(dt)); this.rocks.forEach(k => { k.o.position.y = k.y + Math.sin(T * .5 + k.ph) * .4; k.o.rotation.y += dt * .05 }); this.radar.rotation.z -= dt * .6; this.dust.rotation.y += dt * .02
    if (this.routeCurve && this.routeDot) this.routeDot.position.copy(this.routeCurve.getPointAt((T * .25) % 1))
    if (this.fly) { this.ctl.target.lerp(this.focus, .08); if (this.ctl.target.distanceTo(this.focus) < .05) this.fly = false }
    this.track(dt); this.ctl.update(); this.comp.render()
  }
}
