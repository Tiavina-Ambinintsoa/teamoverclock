import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { useTheme } from "@/components/theme-context"
import { AccessibilityContext, type AccessibilityState } from "@/features/accessibility/accessibility-context"
import { useAuth } from "@/features/auth/auth-context"
import {
  DEFAULT_A11Y_PREFS,
  applyA11yPrefs,
  forcedDarkMode,
  normalizePrefs,
  prefsFromRow,
  prefsToRow,
  readStoredPrefs,
  storePrefs,
  type A11yPrefs,
  type A11yRow,
} from "@/lib/a11y-prefs"
import { supabase } from "@/lib/supabase"
import { useLocale } from "@/lib/locale"

const SAVE_DELAY_MS = 800

/**
 * Préférences d'accessibilité (contraste, taille de texte, voix, parcours terminés).
 * Visiteurs : conservées dans le navigateur. Utilisateurs connectés : synchronisées avec `accessibility_preferences`
 * (la base fait foi après connexion, ce qui permet de retrouver ses réglages sur tous les appareils).
 * À placer à l'intérieur de <ThemeProvider> (un thème contrasté impose clair/sombre) et de <AuthProvider>.
 */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { resolvedMode, preset, setPreset } = useTheme()
  const { tx } = useLocale()
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<A11yPrefs>(readStoredPrefs)
  const userId = user && !user.isDemo ? user.id : null
  const saveTimer = useRef<number | undefined>(undefined)
  const loadedFor = useRef<string | null>(null)
  const latest = useRef(prefs)

  useEffect(() => {
    latest.current = prefs
    const root = document.documentElement
    applyA11yPrefs(root, prefs)
    // Thème par défaut : on rend la main au mode clair/sombre normal.
    if (forcedDarkMode(prefs.theme) === null) root.classList.toggle("dark", resolvedMode === "dark")
  }, [prefs, resolvedMode])

  const save = useCallback(async (id: string, value: A11yPrefs) => {
    if (!supabase) return
    await supabase.from("accessibility_preferences").upsert({ profile_id: id, ...prefsToRow(value) }, { onConflict: "profile_id" })
  }, [])

  // Après connexion : on charge la ligne de la base ; à défaut, on y envoie les réglages locaux déjà choisis.
  useEffect(() => {
    if (!supabase || !userId || loadedFor.current === userId) return
    loadedFor.current = userId
    let active = true
    void (async () => {
      const { data } = await supabase!.from("accessibility_preferences").select("*").eq("profile_id", userId).maybeSingle()
      if (!active) return
      if (data) {
        const next = { ...prefsFromRow(data as A11yRow), speechVoiceURI: latest.current.speechVoiceURI }
        storePrefs(next)
        setPrefs(next)
      } else if (JSON.stringify(latest.current) !== JSON.stringify(DEFAULT_A11Y_PREFS)) {
        await save(userId, latest.current)
      }
    })()
    return () => { active = false }
  }, [userId, save])

  useEffect(() => {
    if (!userId) loadedFor.current = null
  }, [userId])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((current) => {
      const next = normalizePrefs({ ...current, ...patch })
      storePrefs(next)
      if (userId) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => void save(userId, next), SAVE_DELAY_MS)
      }
      return next
    })
  }, [save, userId])

  useEffect(() => {
    if (!user || preset === "lagon" || preset === "minimalist") return
    let switched = false
    const samples: { end: number; duration: number }[] = []
    let observer: PerformanceObserver | undefined
    let lowCoreTimer: number | undefined

    const switchToLagon = () => {
      if (switched) return
      switched = true
      setPreset("lagon")
      update({ reduceMotion: true })
      toast.info(tx("Mode léger activé", "Lightweight mode enabled"), {
        description: tx(
          "Des ralentissements prolongés ont été détectés. Le thème Lagon et la réduction des animations sont activés.",
          "Sustained slowdowns were detected. The Lagon theme and reduced motion are now enabled."
        ),
      })
      observer?.disconnect()
      window.clearTimeout(lowCoreTimer)
    }

    if (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) {
      lowCoreTimer = window.setTimeout(switchToLagon, 12_000)
    }

    if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        const now = performance.now()
        samples.push(...list.getEntries().map((entry) => ({ end: entry.startTime + entry.duration, duration: entry.duration })))
        while (samples.length && samples[0].end < now - 15_000) samples.shift()
        const blockedTime = samples.reduce((total, sample) => total + sample.duration, 0)
        if (samples.length >= 8 && blockedTime >= 1_500) switchToLagon()
      })
      observer.observe({ type: "longtask", buffered: false })
    }

    return () => {
      observer?.disconnect()
      window.clearTimeout(lowCoreTimer)
    }
  }, [user, preset, setPreset, update, tx])

  const reset = useCallback(() => {
    const next = { ...DEFAULT_A11Y_PREFS }
    storePrefs(next)
    setPrefs(next)
    if (userId) void save(userId, next)
  }, [save, userId])

  const value = useMemo<AccessibilityState>(() => ({ prefs, update, reset }), [prefs, update, reset])
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}
