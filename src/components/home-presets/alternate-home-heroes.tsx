import { ArrowDown, ArrowRight, Cpu, Gamepad2, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { ImageParallaxBackground } from "@/components/image-parallax-background"
import { ThreeViewer } from "@/components/three/three-viewer"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export type HomeHeroVariant = "futuriste" | "image" | "3d"

export function AlternateHomeHero({ variant, primaryPath }: { variant: HomeHeroVariant; primaryPath: string }) {
  const { t } = useLocale()

  if (variant === "futuriste") {
    return (
      <section className="home-futuristic relative isolate min-h-[680px] overflow-hidden border-b">
        <div className="home-futuristic__grid" aria-hidden="true" />
        <div className="home-futuristic__glow home-futuristic__glow--one" aria-hidden="true" />
        <div className="home-futuristic__glow home-futuristic__glow--two" aria-hidden="true" />
        <Container className="relative z-10 grid min-h-[680px] items-center gap-8 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-2xl">
            <p className="home-futuristic__eyebrow"><Gamepad2 className="size-4" aria-hidden /> {SITE.shortName} · NEXT LEVEL</p>
            <h1 className="mt-6 font-display text-[clamp(3.1rem,8vw,6.6rem)] leading-[0.92] font-bold tracking-tight">
              {t("hero.title")} <span className="home-futuristic__accent">∞</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">{t("hero.description")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" shape="pill" className="home-futuristic__button"><Link to={primaryPath}>{t("hero.primary")} <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline" shape="pill" className="border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white"><a href="#fonctionnalites">Explorer <ArrowDown aria-hidden /></a></Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium tracking-wide text-white/55">
              <span className="inline-flex items-center gap-2"><Cpu className="size-4 text-primary" aria-hidden /> MODE FUTUR</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="size-4 text-highlight" aria-hidden /> INTERFACE ADAPTATIVE</span>
            </div>
          </div>
          <div className="home-futuristic__portal mx-auto grid size-[min(76vw,27rem)] place-items-center" aria-hidden="true">
            <div className="home-futuristic__ring home-futuristic__ring--outer" />
            <div className="home-futuristic__ring home-futuristic__ring--middle" />
            <div className="home-futuristic__ring home-futuristic__ring--inner" />
            <div className="home-futuristic__core"><Sparkles className="size-12 sm:size-16" /><span>{SITE.shortName}</span></div>
            <span className="home-futuristic__orbit-dot home-futuristic__orbit-dot--a" />
            <span className="home-futuristic__orbit-dot home-futuristic__orbit-dot--b" />
          </div>
        </Container>
      </section>
    )
  }

  if (variant === "image") {
    return (
      <section className="relative isolate min-h-[720px] overflow-hidden border-b">
        <ImageParallaxBackground src={`${import.meta.env.BASE_URL}images/home-aurora.svg`} pointerDistance={30} scrollDistance={0.16} />
        <Container className="relative z-10 flex min-h-[720px] items-end py-12 sm:items-center sm:py-20">
          <div className="max-w-3xl rounded-[2rem] border border-white/15 bg-slate-950/50 p-6 text-white shadow-2xl backdrop-blur-md sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-100"><Sparkles className="size-4" aria-hidden /> {t("hero.eyebrow")}</p>
            <h1 className="mt-6 font-display text-[clamp(3rem,8vw,6.4rem)] leading-[0.94] font-semibold tracking-tight">{t("hero.title")}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">{t("hero.description")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" shape="pill"><Link to={primaryPath}>{t("hero.primary")} <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline" shape="pill" className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"><a href="#fonctionnalites">Découvrir <ArrowDown aria-hidden /></a></Button>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="home-product-hero relative isolate overflow-hidden border-b">
      <div className="home-product-hero__glow" aria-hidden="true" />
      <Container className="relative z-10 grid min-h-[760px] items-center gap-6 py-12 lg:grid-cols-[0.8fr_1.4fr_0.8fr]">
        <div className="hidden text-right lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">01 · Découvrir</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Présentez l’objet ou l’idée qui rend votre projet mémorable.</p>
        </div>
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur"><Sparkles className="size-4" aria-hidden /> {SITE.shortName} · {t("hero.eyebrow")}</p>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.7rem,6vw,5.3rem)] leading-[0.95] font-semibold tracking-tight">{t("hero.title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("hero.description")}</p>
          <ThreeViewer label="Objet central interactif représentant le produit" className="three-viewer mx-auto mt-2 w-full max-w-[32rem] border-0 bg-transparent shadow-none" />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" shape="pill"><Link to={primaryPath}>{t("hero.primary")} <ArrowRight aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="outline" shape="pill"><a href="#fonctionnalites">Découvrir <ArrowDown aria-hidden /></a></Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-highlight">02 · Explorer</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Laissez glisser la souris ou le doigt sur la scène 3D.</p>
        </div>
      </Container>
    </section>
  )
}
