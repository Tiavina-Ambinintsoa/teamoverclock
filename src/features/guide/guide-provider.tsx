import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAccessibility } from "@/features/accessibility/accessibility-context"
import { useAuth } from "@/features/auth/auth-context"
import { GuideContext, type GuideState } from "@/features/guide/guide-context"
import {
  mergeTours,
  currentPageTour,
  pendingWelcome,
  popoverPosition,
  stepsFor,
  tourTitle,
  toursForRole,
  type GuideStep,
  type GuideTour,
  type Rect,
} from "@/features/guide/guide-tours"
import { speak, stopSpeaking } from "@/features/voice/speech"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import type { UserRole } from "@/lib/types"

interface TourRow { id: string; code: string; title: string; description: string | null; audience: UserRole[]; route_scope: string; estimated_minutes: number }
interface StepRow extends GuideStep { tour_id: string }

function useDbTours() {
  return useQuery({
    queryKey: ["guide-tours"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GuideTour[]> => {
      if (!supabase) return []
      const [tours, steps] = await Promise.all([
        supabase.from("guide_tours").select("id,code,title,description,audience,route_scope,estimated_minutes").eq("is_published", true),
        supabase.from("guide_tour_steps").select("tour_id,step_order,route,target_selector,title,body,voice_script,placement,locale"),
      ])
      const stepRows = (steps.data ?? []) as StepRow[]
      return ((tours.data ?? []) as TourRow[]).map((t) => ({
        code: t.code, title: t.title, description: t.description ?? "", audience: t.audience, route_scope: t.route_scope, estimated_minutes: t.estimated_minutes,
        steps: stepRows.filter((s) => s.tour_id === t.id).map((s) => ({ step_order: s.step_order, route: s.route, target_selector: s.target_selector, title: s.title, body: s.body, voice_script: s.voice_script, placement: s.placement, locale: s.locale })),
      }))
    },
  })
}

const PROMPT_KEY = "webcup:tour-prompt-dismissed"
const CURRENT_PAGE_TOUR = "current-page"

/** Mesure le rectangle d'un élément ciblé (null si introuvable). */
function measure(selector: string | null): { rect: Rect; element: Element } | null {
  if (!selector) return null
  const element = document.querySelector(selector)
  if (!element) return null
  const box = element.getBoundingClientRect()
  return { rect: { top: box.top, left: box.left, width: box.width, height: box.height }, element }
}

/**
 * Visite guidée textuelle : popover ancré sur `[data-tour]`, navigation clavier, reprise et rejeu, narration vocale facultative.
 * Les parcours viennent de la base (guide_tours) avec repli sur des parcours intégrés.
 */
export function GuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { prefs, update } = useAccessibility()
  const { locale, tag, tx } = useLocale()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const dbTours = useDbTours()
  const tours = useMemo(() => toursForRole(mergeTours(dbTours.data ?? []), user?.profileRole ?? null), [dbTours.data, user?.profileRole])

  const [active, setActive] = useState<{ code: string; index: number } | null>(null)
  const [pageTour, setPageTour] = useState<GuideTour | null>(null)
  const [target, setTarget] = useState<Rect | null>(null)
  const [promptHidden, setPromptHidden] = useState(() => {
    try { return window.sessionStorage.getItem(PROMPT_KEY) === "1" } catch { return false }
  })
  const cardRef = useRef<HTMLDialogElement>(null)

  const tour = active?.code === CURRENT_PAGE_TOUR ? pageTour : tours.find((t) => t.code === active?.code) ?? null
  const steps = useMemo(() => (tour ? stepsFor(tour, locale) : []), [tour, locale])
  const step: GuideStep | null = active && steps[active.index] ? steps[active.index] : null

  const complete = useCallback((code: string) => {
    if (!prefs.tourCompleted.includes(code)) update({ tourCompleted: [...prefs.tourCompleted, code] })
  }, [prefs.tourCompleted, update])

  const close = useCallback((markCompleted = false) => {
    if (markCompleted && active) complete(active.code)
    setActive(null)
    setTarget(null)
    stopSpeaking()
  }, [active, complete])

  const start = useCallback((code: string) => {
    setActive({ code, index: 0 })
  }, [])

  const startPage = useCallback(() => {
    const title = document.querySelector("main h1")?.textContent?.trim() || document.title
    setPageTour(currentPageTour(pathname, title, locale))
    setActive({ code: CURRENT_PAGE_TOUR, index: 0 })
  }, [locale, pathname])

  // Aller sur la route de l'étape, puis mesurer et suivre la cible (défilement, redimensionnement, rendu tardif).
  const stepRoute = step?.route ?? null
  const stepSelector = step?.target_selector ?? null
  useEffect(() => {
    if (!stepRoute) return
    if (stepRoute !== pathname && !pathname.startsWith(stepRoute === "/" ? "/#" : stepRoute)) void navigate(stepRoute)
  }, [stepRoute, pathname, navigate])

  useEffect(() => {
    if (!step) return
    let tries = 0
    let scrolled = false
    const refresh = () => {
      const found = measure(stepSelector)
      if (found && !scrolled) {
        scrolled = true
        found.element.scrollIntoView({ block: "center", behavior: "auto" })
      }
      setTarget(found?.rect ?? null)
      tries += 1
    }
    refresh()
    const timer = window.setInterval(() => { if (tries < 40) refresh(); else window.clearInterval(timer) }, 250)
    const onChange = () => setTarget(measure(stepSelector)?.rect ?? null)
    window.addEventListener("resize", onChange)
    window.addEventListener("scroll", onChange, true)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("resize", onChange)
      window.removeEventListener("scroll", onChange, true)
    }
  }, [step, stepSelector])

  // Narration et focus à chaque étape
  useEffect(() => {
    if (!step) return
    cardRef.current?.focus()
    if ((prefs.voiceGuide || prefs.voiceNavigation || prefs.readScreenAloud) && step.voice_script) {
      speak(step.voice_script, { lang: tag, rate: prefs.ttsRate })
    }
  }, [step, prefs.voiceGuide, prefs.voiceNavigation, prefs.readScreenAloud, prefs.ttsRate, tag])

  const go = (delta: number) => {
    if (!active) return
    const next = active.index + delta
    if (next < 0) return
    if (next >= steps.length) {
      close(true)
      return
    }
    setActive({ code: active.code, index: next })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); close(false) }
    else if (event.key === "ArrowRight") { event.preventDefault(); go(1) }
    else if (event.key === "ArrowLeft") { event.preventDefault(); go(-1) }
    else if (event.key === "Tab") {
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>("button")
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  const value = useMemo<GuideState>(
    () => ({ tours, activeCode: active?.code ?? null, start, startPage, close, isCompleted: (code) => prefs.tourCompleted.includes(code) }),
    [tours, active?.code, start, startPage, close, prefs.tourCompleted]
  )

  const welcome = pendingWelcome(tours, prefs.tourCompleted)
  const showPrompt = !active && !promptHidden && pathname === "/" && welcome !== null
  const dismissPrompt = (forever: boolean) => {
    if (forever) complete("welcome")
    setPromptHidden(true)
    try { window.sessionStorage.setItem(PROMPT_KEY, "1") } catch { /* stockage indisponible : ignoré */ }
  }

  const pos = step ? popoverPosition(target, step.placement, { width: window.innerWidth, height: window.innerHeight }) : null

  return (
    <GuideContext.Provider value={value}>
      {children}

      {showPrompt && (
        <section aria-label={tx("Visite guidée", "Guided tour")} className="fixed bottom-4 left-4 z-50 grid max-w-xs gap-2 rounded-xl border bg-popover p-4 text-sm shadow-lg">
          <p className="font-medium">{tx("Première visite ? Faites le tour du portail en 10 étapes.", "First visit? Take a 10-step tour of the portal.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { dismissPrompt(false); start("welcome") }}>{tx("Commencer", "Start")}</Button>
            <Button size="sm" variant="outline" onClick={() => dismissPrompt(false)}>{tx("Plus tard", "Later")}</Button>
            <Button size="sm" variant="ghost" onClick={() => dismissPrompt(true)}>{tx("Ne plus afficher", "Don't show again")}</Button>
          </div>
        </section>
      )}

      {step && active && pos && (
        <>
          {target && (
            <div aria-hidden className="pointer-events-none fixed z-[60] rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background"
              style={{ top: target.top - 4, left: target.left - 4, width: target.width + 8, height: target.height + 8 }} />
          )}
          <dialog
            open
            ref={cardRef}
            aria-labelledby="guide-title"
            aria-describedby="guide-body"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="fixed z-[70] m-0 w-[min(340px,calc(100vw-24px))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl outline-none"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="text-xs text-muted-foreground" aria-live="polite">{tx("Étape", "Step")} {active.index + 1}/{steps.length} · {tour ? tourTitle(tour, locale) : ""}</p>
            <h2 id="guide-title" className="mt-1 text-lg font-semibold">{step.title}</h2>
            <p id="guide-body" className="mt-2 text-sm">{step.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={active.index === 0} onClick={() => go(-1)}>{tx("Précédent", "Back")}</Button>
              <Button size="sm" onClick={() => go(1)}>{active.index + 1 >= steps.length ? tx("Terminer", "Finish") : tx("Suivant", "Next")}</Button>
              <Button size="sm" variant="ghost" onClick={() => close(false)}>{tx("Passer", "Skip")}</Button>
              <Button size="sm" variant="ghost" onClick={() => close(true)}>{tx("Ne plus afficher", "Don't show again")}</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{tx("Raccourcis : ← → pour naviguer, Échap pour fermer.", "Shortcuts: ← → to navigate, Esc to close.")}</p>
          </dialog>
        </>
      )}
    </GuideContext.Provider>
  )
}
