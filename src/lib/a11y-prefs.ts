import { safeStorage } from "@/lib/storage"

/** Miroir de l'enum SQL `ui_theme` (supabase/nova-terra/01_enums_extensions.sql). */
export const UI_THEMES = ["default", "high_contrast_light", "high_contrast_dark", "yellow_on_black"] as const
export type UiTheme = (typeof UI_THEMES)[number]

export const A11Y_STORAGE_KEY = "webcup:a11y"
export const FONT_SCALE_MIN = 0.85
export const FONT_SCALE_MAX = 2
export const LINE_SPACING_MIN = 1
export const LINE_SPACING_MAX = 2
export const TTS_RATE_MIN = 0.5
export const TTS_RATE_MAX = 2

export const A11Y_NEEDS = ["low_vision", "hard_of_hearing"] as const
export type A11yNeed = (typeof A11Y_NEEDS)[number]

export function isA11yNeed(value: unknown): value is A11yNeed {
  return typeof value === "string" && (A11Y_NEEDS as readonly string[]).includes(value)
}

/** Préférences d'accessibilité (colonnes de `accessibility_preferences`, en camelCase). */
export interface A11yPrefs {
  /** Profils déclarés : « mal voyant » (low_vision) et « mal entendant » (hard_of_hearing). */
  needs: A11yNeed[]
  /** Codes des parcours guidés terminés ou masqués. */
  tourCompleted: string[]
  theme: UiTheme
  fontScale: number
  lineSpacing: number
  reduceMotion: boolean
  readScreenAloud: boolean
  voiceNavigation: boolean
  voiceGuide: boolean
  ttsRate: number
  speechLang: string
  captions: boolean
  visualAlerts: boolean
}

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  needs: [],
  tourCompleted: [],
  theme: "default",
  fontScale: 1,
  lineSpacing: 1,
  reduceMotion: false,
  readScreenAloud: false,
  voiceNavigation: false,
  voiceGuide: false,
  ttsRate: 1,
  speechLang: "fr-FR",
  captions: false,
  visualAlerts: false,
}

export function isUiTheme(value: unknown): value is UiTheme {
  return typeof value === "string" && (UI_THEMES as readonly string[]).includes(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Borne la taille de texte (0,85 à 2) ; une valeur invalide retombe sur 1. */
export function clampFontScale(value: unknown): number {
  const n = typeof value === "number" ? value : Number.NaN
  return Number.isFinite(n) ? Math.round(clamp(n, FONT_SCALE_MIN, FONT_SCALE_MAX) * 100) / 100 : 1
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number.NaN
  return Number.isFinite(n) ? Math.round(clamp(n, min, max) * 100) / 100 : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

/** Reconstruit des préférences valides depuis une valeur inconnue (JSON stocké, réponse réseau). */
export function normalizePrefs(raw: unknown): A11yPrefs {
  const d = DEFAULT_A11Y_PREFS
  if (typeof raw !== "object" || raw === null) return { ...d }
  const r = raw as Record<string, unknown>
  return {
    needs: Array.isArray(r.needs) ? Array.from(new Set(r.needs.filter(isA11yNeed))) : [],
    tourCompleted: Array.isArray(r.tourCompleted) ? Array.from(new Set(r.tourCompleted.filter((c): c is string => typeof c === "string" && c.length <= 60))).slice(0, 50) : [],
    theme: isUiTheme(r.theme) ? r.theme : d.theme,
    fontScale: clampFontScale(r.fontScale),
    lineSpacing: clampNumber(r.lineSpacing, LINE_SPACING_MIN, LINE_SPACING_MAX, d.lineSpacing),
    reduceMotion: bool(r.reduceMotion, d.reduceMotion),
    readScreenAloud: bool(r.readScreenAloud, d.readScreenAloud),
    voiceNavigation: bool(r.voiceNavigation, d.voiceNavigation),
    voiceGuide: bool(r.voiceGuide, d.voiceGuide),
    ttsRate: clampNumber(r.ttsRate, TTS_RATE_MIN, TTS_RATE_MAX, d.ttsRate),
    speechLang: typeof r.speechLang === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(r.speechLang) ? r.speechLang : d.speechLang,
    captions: bool(r.captions, d.captions),
    visualAlerts: bool(r.visualAlerts, d.visualAlerts),
  }
}

export function readStoredPrefs(): A11yPrefs {
  const stored = safeStorage.get(A11Y_STORAGE_KEY)
  if (!stored) return { ...DEFAULT_A11Y_PREFS }
  try {
    return normalizePrefs(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_A11Y_PREFS }
  }
}

export function storePrefs(prefs: A11yPrefs): void {
  safeStorage.set(A11Y_STORAGE_KEY, JSON.stringify(prefs))
}

/** true = thème sombre, false = thème clair, null = on laisse le mode clair/sombre normal décider. */
export function forcedDarkMode(theme: UiTheme): boolean | null {
  if (theme === "high_contrast_light") return false
  if (theme === "high_contrast_dark" || theme === "yellow_on_black") return true
  return null
}

/**
 * Applique les préférences au document : thème contrasté (data-contrast), taille de texte (rem),
 * interligne et réduction des animations. Le script de index.html fait la même chose avant le premier rendu.
 */
export function applyA11yPrefs(root: HTMLElement, prefs: A11yPrefs): void {
  if (prefs.theme === "default") delete root.dataset.contrast
  else root.dataset.contrast = prefs.theme

  root.style.fontSize = prefs.fontScale === 1 ? "" : `${prefs.fontScale * 100}%`
  root.style.setProperty("--a11y-line-spacing", String(prefs.lineSpacing))
  root.dataset.a11yLineSpacing = prefs.lineSpacing > 1 ? "on" : "off"
  root.dataset.reduceMotion = prefs.reduceMotion ? "true" : "false"

  const dark = forcedDarkMode(prefs.theme)
  if (dark !== null) root.classList.toggle("dark", dark)
}

/** Ligne de la table `accessibility_preferences` (snake_case). */
export interface A11yRow {
  needs?: string[] | null
  theme?: string | null
  font_scale?: number | string | null
  line_spacing?: number | string | null
  reduce_motion?: boolean | null
  read_screen_aloud?: boolean | null
  voice_navigation?: boolean | null
  voice_guide?: boolean | null
  tts_rate?: number | string | null
  speech_lang?: string | null
  captions?: boolean | null
  visual_alerts?: boolean | null
  tour_completed?: string[] | null
}

export function prefsFromRow(row: A11yRow): A11yPrefs {
  return normalizePrefs({
    needs: row.needs ?? [],
    theme: row.theme,
    fontScale: row.font_scale === null || row.font_scale === undefined ? undefined : Number(row.font_scale),
    lineSpacing: row.line_spacing === null || row.line_spacing === undefined ? undefined : Number(row.line_spacing),
    reduceMotion: row.reduce_motion,
    readScreenAloud: row.read_screen_aloud,
    voiceNavigation: row.voice_navigation,
    voiceGuide: row.voice_guide,
    ttsRate: row.tts_rate === null || row.tts_rate === undefined ? undefined : Number(row.tts_rate),
    speechLang: row.speech_lang,
    captions: row.captions,
    visualAlerts: row.visual_alerts,
    tourCompleted: row.tour_completed ?? [],
  })
}

export function prefsToRow(prefs: A11yPrefs) {
  return {
    needs: prefs.needs,
    theme: prefs.theme,
    font_scale: prefs.fontScale,
    line_spacing: prefs.lineSpacing,
    reduce_motion: prefs.reduceMotion,
    read_screen_aloud: prefs.readScreenAloud,
    voice_navigation: prefs.voiceNavigation,
    voice_guide: prefs.voiceGuide,
    tts_rate: prefs.ttsRate,
    speech_lang: prefs.speechLang,
    captions: prefs.captions,
    visual_alerts: prefs.visualAlerts,
    tour_completed: prefs.tourCompleted,
  }
}

/**
 * Réglages recommandés quand l'utilisateur déclare un profil (il peut ensuite tout ajuster à la main).
 * - low_vision : contraste élevé sombre et texte agrandi ;
 * - hard_of_hearing (comportement demandé) : l'IA lit l'écran, l'utilisateur répond et navigue à la voix, avec sous-titres et alertes visuelles.
 */
export function presetForNeed(need: A11yNeed, current: A11yPrefs): Partial<A11yPrefs> {
  if (need === "low_vision") {
    return {
      theme: current.theme === "default" ? "high_contrast_dark" : current.theme,
      fontScale: current.fontScale < 1.5 ? 1.5 : current.fontScale,
      lineSpacing: current.lineSpacing < 1.25 ? 1.25 : current.lineSpacing,
    }
  }
  return { readScreenAloud: true, voiceNavigation: true, voiceGuide: true, captions: true, visualAlerts: true }
}
