import type { ReactNode } from "react"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { ModeToggle } from "@/components/theme-switcher"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export type AuthMode = "signin" | "signup" | "admin" | "recover" | "reset"

const headings: Record<AuthMode, [string, string]> = {
  signin: ["auth.loginTitle", "auth.loginSubtitle"],
  signup: ["auth.signupTitle", "auth.signupSubtitle"],
  admin: ["auth.adminTitle", "auth.adminSubtitle"],
  recover: ["auth.recoverTitle", "auth.recoverSubtitle"],
  reset: ["auth.resetTitle", "auth.resetSubtitle"],
}

export function AuthShell({ mode, children, isExiting = false }: { mode: AuthMode; children: ReactNode; isExiting?: boolean }) {
  const { t } = useLocale()
  const isSignup = mode === "signup"

  return (
    <div className="auth-screen min-h-svh bg-muted/60 px-3 py-4 sm:p-7 lg:grid lg:place-items-center">
      <div data-auth-exiting={isExiting ? "true" : undefined} className="auth-card mx-auto grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border bg-card shadow-2xl lg:min-h-[min(740px,calc(100svh-3.5rem))] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className={"auth-art relative m-2 flex min-h-52 flex-col justify-between overflow-hidden rounded-[1.25rem] bg-primary p-6 text-primary-foreground sm:p-8 lg:min-h-0 " + (isSignup ? "auth-art-signup" : "auth-art-signin")}>
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-primary-foreground/25 bg-primary-foreground/10">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{SITE.shortName}</span>
          </div>

          <div className="relative z-10 my-7 flex flex-1 flex-col justify-center">
            <div className="auth-photo-placeholder mx-auto grid min-h-36 w-full max-w-sm place-items-center rounded-2xl border border-dashed border-primary-foreground/40 bg-primary-foreground/5 px-6 text-center sm:min-h-56">
              <span className="text-sm text-primary-foreground/75">{t("auth.photoHint")}</span>
            </div>
            <p className="mx-auto mt-6 max-w-sm text-center font-display text-2xl font-medium sm:text-3xl">
              {t("auth.photoCaption")}
            </p>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/65">
            TODO(webcup) · Ajoutez ici le visuel de votre thème
          </p>
          <span className="auth-orb auth-orb-one" aria-hidden />
          <span className="auth-orb auth-orb-two" aria-hidden />
        </aside>

        <section className={"auth-form-panel flex min-w-0 flex-col px-5 py-5 sm:px-10 sm:py-8 lg:px-14 lg:py-10 " + (isSignup ? "auth-slide-left" : "auth-slide-right")}>
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("auth.backHome")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>

          <div className="mx-auto my-auto w-full max-w-md py-8">
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-primary">{SITE.name}</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t(headings[mode][0])}</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t(headings[mode][1])}</p>
            </div>
            {children}
          </div>

          <p className="pt-3 text-center text-xs text-muted-foreground">
            {SITE.name} · {new Date().getFullYear()}
          </p>
        </section>
      </div>
    </div>
  )
}
