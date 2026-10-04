import type { ReactNode } from "react"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { ModeToggle } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useAccessibility } from "@/features/accessibility/accessibility-context"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

export type AuthMode = "signin" | "signup" | "admin" | "recover" | "reset"

const headings: Record<AuthMode, [string, string]> = {
  signin: ["auth.loginTitle", "auth.loginSubtitle"],
  signup: ["auth.signupTitle", "auth.signupSubtitle"],
  admin: ["auth.adminTitle", "auth.adminSubtitle"],
  recover: ["auth.recoverTitle", "auth.recoverSubtitle"],
  reset: ["auth.resetTitle", "auth.resetSubtitle"],
}
const CURRENT_YEAR = new Date().getFullYear()

export function AuthShell({ mode, children, isExiting = false }: { mode: AuthMode; children: ReactNode; isExiting?: boolean }) {
  const { t } = useLocale()
  const { prefs } = useAccessibility()
  const isSignup = mode === "signup"
  const reduceMotion = prefs.reduceMotion

  return (
    <div className="auth-screen min-h-svh bg-muted/60 px-3 py-4 sm:p-7 lg:grid lg:place-items-center">
      <div data-auth-exiting={isExiting ? "true" : undefined} className="auth-card mx-auto grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border bg-card shadow-2xl lg:min-h-[min(740px,calc(100svh-3.5rem))] lg:grid-cols-[0.92fr_1.08fr]">
        <aside
          data-reduce-motion={reduceMotion ? "true" : "false"}
          className={"auth-art relative m-2 flex min-h-52 flex-col justify-between overflow-hidden rounded-[1.25rem] border border-primary-foreground/10 bg-primary p-5 text-primary-foreground sm:p-8 lg:min-h-0 " + (isSignup ? "auth-art-signup" : "auth-art-signin")}
        >
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-primary-foreground/25 bg-primary-foreground/10">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{SITE.shortName}</span>
          </div>

          <div className="relative z-10 my-6 flex flex-1 flex-col justify-center">
            <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-6 sm:px-8">
              <div className="auth-nova-orb" aria-hidden="true">
                <span className="auth-nova-stars" />
                <span className="auth-nova-ring auth-nova-ring-one" />
                <span className="auth-nova-ring auth-nova-ring-two" />
                <span className="auth-nova-particles" />
                <span className="auth-nova-planet">
                  <span className="auth-nova-atmosphere" />
                  <span className="auth-nova-surface" />
                  <span className="auth-nova-shine" />
                </span>
              </div>
              <div className="max-w-sm text-center">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary-foreground/70">Nova Terra</p>
                <p className="mt-3 text-balance font-display text-2xl font-medium sm:text-3xl">
                  {t("auth.photoCaption")}
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/65">
            Nova Terra · la ville connectée
          </p>
          <span className="auth-orb auth-orb-one" aria-hidden />
          <span className="auth-orb auth-orb-two" aria-hidden />
        </aside>

        <section className={"auth-form-panel flex min-w-0 flex-col bg-card/95 px-5 py-5 sm:px-10 sm:py-8 lg:px-14 lg:py-10 " + (isSignup ? "auth-slide-left" : "auth-slide-right")}>
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("auth.backHome")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
          </div>

          <div className="mx-auto my-auto w-full max-w-md py-8">
            <div className="rounded-[1.5rem] border bg-background/80 p-6 shadow-lg backdrop-blur sm:p-8">
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-primary">{SITE.name}</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"><AuroraTitle>{t(headings[mode][0])}</AuroraTitle></h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t(headings[mode][1])}</p>
            </div>
            {children}
            </div>
          </div>

          <p className="pt-3 text-center text-xs text-muted-foreground">
            {SITE.name} · {CURRENT_YEAR}
          </p>
        </section>
      </div>
    </div>
  )
}
