import type { CSSProperties } from "react"
import { ArrowDown, ArrowRight, Check, Layers3, LockKeyhole, MoonStar, Sparkles, UsersRound } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { Container } from "@/components/layout/container"
import { HomeInteractiveBackground } from "@/components/home-interactive-background"
import { AlternateHomeHero, type HomeHeroVariant } from "@/components/home-presets/alternate-home-heroes"
import { Reveal } from "@/components/reveal"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

/** Rang dans la séquence d'entrée du hero (voir .rise dans index.css). */
const step = (index: number) => ({ "--i": index }) as CSSProperties

/** Accueil affiché par défaut. Options : "classic", "futuriste", "image", "3d". */
export const HOME_HERO_DEFAULT: "classic" | HomeHeroVariant = "classic"

const features = [
  { icon: Sparkles, title: "home.feature1", text: "home.feature1Text" },
  { icon: LockKeyhole, title: "home.feature2", text: "home.feature2Text" },
  { icon: Layers3, title: "home.feature3", text: "home.feature3Text" },
  { icon: MoonStar, title: "home.feature4", text: "home.feature4Text" },
]

export function HomePage() {
  const { user } = useAuth()
  const { t } = useLocale()
  const [searchParams] = useSearchParams()
  const primaryPath = user ? (user.isAdmin ? "/admin" : "/app") : "/inscription"
  const requestedHero = searchParams.get("hero")
  const selectedHero: "classic" | HomeHeroVariant =
    requestedHero === "futuriste" || requestedHero === "image" || requestedHero === "3d"
      ? requestedHero
      : HOME_HERO_DEFAULT

  return (
    <div className="home-page-shell relative isolate">
      <HomeInteractiveBackground />
      <div className="relative z-10">
      <title>{SITE.name}</title>
      <meta name="description" content={SITE.description} />

      {selectedHero === "classic" ? <section className="relative isolate overflow-hidden border-b">
        <Container className="grid min-h-[640px] items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <div className="relative z-10">
            <p className="rise inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm" style={step(0)}>
              <span className="size-1.5 rounded-full bg-highlight" aria-hidden />
              {t("hero.eyebrow")}
            </p>
            <h1 className="rise mt-6 max-w-3xl font-display text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.94] font-semibold tracking-tight" style={step(1)}>
              {t("hero.title")}
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-8 text-muted-foreground" style={step(2)}>{t("hero.description")}</p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={step(3)}>
              <Button asChild size="lg"><Link to={primaryPath}>{user ? t("hero.open") : t("hero.primary")} <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#fonctionnalites">{t("hero.secondary")} <ArrowDown aria-hidden /></a></Button>
            </div>
            <div className="rise mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" style={step(4)}>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" aria-hidden />Mobile-first</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" aria-hidden />Thèmes clair et sombre</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" aria-hidden />Mode démo local</span>
            </div>
          </div>

          <div className="rise relative mx-auto w-full max-w-xl" style={step(2)}>
            <div className="hero-glow absolute -inset-8 rounded-[3rem] bg-primary/10 blur-2xl" aria-hidden />
            <div className="hero-dashboard-float relative rounded-[2rem] border bg-card p-3 shadow-2xl sm:p-5">
              <div className="flex items-center justify-between border-b px-2 pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{SITE.shortName}</p>
                  <p className="mt-1 font-display text-lg font-semibold">Votre espace, en un regard</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-5" aria-hidden /></span>
              </div>
              <div className="grid gap-3 py-4 sm:grid-cols-2">
                <article className="rounded-2xl bg-muted/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Layers3 className="size-4 text-primary" aria-hidden />Vos contenus</div>
                  <div className="mt-4 flex items-end gap-1.5" aria-hidden>
                    <span className="hero-chart-bar h-8 flex-1 rounded-t-md bg-primary/25" style={{ "--bar-index": 0 } as CSSProperties} />
                    <span className="hero-chart-bar h-12 flex-1 rounded-t-md bg-primary/40" style={{ "--bar-index": 1 } as CSSProperties} />
                    <span className="hero-chart-bar h-10 flex-1 rounded-t-md bg-primary/55" style={{ "--bar-index": 2 } as CSSProperties} />
                    <span className="hero-chart-bar h-16 flex-1 rounded-t-md bg-primary/80" style={{ "--bar-index": 3 } as CSSProperties} />
                    <span className="hero-chart-bar h-14 flex-1 rounded-t-md bg-primary/45" style={{ "--bar-index": 4 } as CSSProperties} />
                    <span className="hero-chart-bar h-20 flex-1 rounded-t-md bg-primary" style={{ "--bar-index": 5 } as CSSProperties} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Une base à personnaliser</p>
                </article>
                <article className="rounded-2xl bg-muted/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><UsersRound className="size-4 text-primary" aria-hidden />Votre équipe</div>
                  <div className="mt-4 flex -space-x-2" aria-hidden>
                    {["A", "M", "T", "+"].map((letter, index) => <span key={letter + index} className="grid size-9 place-items-center rounded-full border-2 border-card bg-primary/10 text-xs font-semibold text-primary">{letter}</span>)}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Des rôles prêts à connecter</p>
                </article>
              </div>
              <div className="rounded-2xl border border-dashed p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Un tableau de bord modulable</span>
                  <span className="text-xs text-muted-foreground">Aperçu</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                  <div className="h-14 rounded-xl bg-primary/10" />
                  <div className="h-14 rounded-xl bg-highlight/30" />
                  <div className="h-14 rounded-xl bg-muted" />
                </div>
              </div>
            </div>
            <div className="absolute -right-3 -bottom-5 rounded-2xl border bg-background px-4 py-3 shadow-lg sm:-right-6">
              <p className="text-xs text-muted-foreground">Thème</p>
              <p className="mt-0.5 text-sm font-semibold">À vous de choisir</p>
            </div>
          </div>
        </Container>
      </section> : <AlternateHomeHero variant={selectedHero} primaryPath={primaryPath} />}

      <Container className="py-14 sm:py-20">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">{t("home.kicker")}</p>
          <h2 id="fonctionnalites" className="mt-3 text-3xl font-semibold sm:text-5xl">{t("home.featuresTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("home.featuresIntro")}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delayMs={index * 80} className="h-full">
              <article className="feature-card h-full rounded-2xl border bg-card p-5 sm:p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
                <h3 className="mt-5 font-display text-lg font-semibold">{t(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(text)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>

      <section className="border-y bg-muted/30">
        <Container className="py-14 sm:py-18">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">{t("home.statsTitle")}</h2>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <Reveal delayMs={0}><Stat value="5" label={t("home.stat1")} /></Reveal>
            <Reveal delayMs={90}><Stat value="3" label={t("home.stat2")} /></Reveal>
            <Reveal delayMs={180}><Stat value="100%" label={t("home.stat3")} /></Reveal>
          </div>
          <blockquote className="mx-auto mt-12 max-w-2xl text-center">
            <p className="font-display text-xl sm:text-2xl">{t("home.quote")}</p>
            <footer className="mt-3 text-sm text-muted-foreground">{t("home.quoteBy")}</footer>
          </blockquote>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <Reveal className="rounded-[2rem] bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12 sm:py-14">
            <h2 className="font-display text-3xl font-semibold sm:text-5xl">{t("home.ctaTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/75">{t("home.ctaText")}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to={primaryPath}>{t("home.ctaButton")} <ArrowRight aria-hidden /></Link></Button>
              {env.enableKit && <Button asChild size="lg" variant="outline"><Link to="/modeles" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">Voir les pages modèles</Link></Button>}
            </div>
          </Reveal>
        </Container>
      </section>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card px-5 py-7 text-center">
      <p className="font-display text-4xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
