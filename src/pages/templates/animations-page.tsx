import { useState, type CSSProperties } from "react"
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Layers3, Sparkles, Waves } from "lucide-react"

import { AnimatedGradientText } from "@/components/animated/animated-gradient-text"
import { AuroraShader } from "@/components/animated/aurora-shader"
import { BorderBeam } from "@/components/animated/border-beam"
import { Marquee } from "@/components/animated/marquee"
import { MeteorField } from "@/components/animated/meteor-field"
import { TextReveal } from "@/components/animated/text-reveal"
import { TransitionLink } from "@/components/animated/transition-link"
import { Container } from "@/components/layout/container"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

const tags = ["React", "Supabase", "OpenRouter", "TypeScript", "WebGL", "shadcn/ui"]

export function AnimationsPage() {
  const [speed, setSpeed] = useState(1)
  const [replay, setReplay] = useState(0)
  const [glow, setGlow] = useState(58)

  return (
    <Container className="py-10">
      <title>Animations et effets — Modèle</title>
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-primary">Modèle de page</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Animations à composer</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Transitions de routes, hero, arrière-plans, texte, slider et accents WebGL. Chaque effet est isolé pour être repris ou ignoré.</p>
        </div>
        <Button asChild variant="outline" shape="pill"><TransitionLink to="/modeles">Tous les modèles <ArrowRight aria-hidden /></TransitionLink></Button>
      </header>

      <section aria-labelledby="transitions-title" className="mb-10 rounded-2xl border bg-muted/30 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Layers3 className="size-5" aria-hidden /></span>
          <div><h2 id="transitions-title" className="text-lg font-semibold">Transitions de pages et navigation</h2><p className="text-sm text-muted-foreground">Les liens de navigation utilisent View Transitions lorsqu'il est pris en charge.</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" shape="pill"><TransitionLink to="/modeles/carte" viewTransition>Voir la carte</TransitionLink></Button>
          <Button asChild variant="secondary" shape="pill"><TransitionLink to="/modeles/agenda" viewTransition>Voir l'agenda</TransitionLink></Button>
          <Button asChild variant="secondary" shape="pill"><TransitionLink to="/modeles/galerie" viewTransition>Voir la galerie</TransitionLink></Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Faites défiler cette page : la barre de navigation du site se détache, se rétrécit et s'arrondit après quelques pixels.</p>
      </section>

      <section aria-labelledby="hero-title" className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="hero-title" className="text-xl font-semibold">Hero avec entrée séquencée</h2><p className="mt-1 text-sm text-muted-foreground">Utilisez un seul effet d'entrée fort, puis gardez le reste du parcours rapide.</p></div>
          <Button variant="outline" size="sm" onClick={() => setReplay((value) => value + 1)}>Rejouer l'entrée</Button>
        </div>
        <div key={replay} className="motion-hero rounded-[2rem] border p-6 sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <p className="rise text-sm font-semibold uppercase tracking-[0.16em] text-primary" style={{ "--i": 0 } as CSSProperties}>Votre équipe · votre prochaine idée</p>
            <TextReveal text="Construisez quelque chose qui compte." as="h2" by="word" effect="rise" delayMs={65} className="mt-4 block font-display text-4xl font-semibold tracking-tight sm:text-6xl" />
            <p className="rise mt-4 max-w-xl text-muted-foreground" style={{ "--i": 5 } as CSSProperties}>Un titre découpé par mots, un sous-titre révélé après lui, puis une action lisible.</p>
            <Button className="rise mt-6" style={{ "--i": 7 } as CSSProperties}>Commencer <ArrowRight aria-hidden /></Button>
          </div>
          <Sparkles className="pointer-events-none absolute right-8 bottom-8 size-20 text-primary/15 sm:right-14 sm:bottom-10 sm:size-36" aria-hidden />
        </div>
      </section>

      <section aria-labelledby="background-title" className="mb-10">
        <div className="mb-4"><h2 id="background-title" className="text-xl font-semibold">Fond animé et shader WebGL</h2><p className="mt-1 text-sm text-muted-foreground">WebGL basse résolution, fallback CSS et arrêt en mode réduction des mouvements ou quand l'onglet est masqué.</p></div>
        <div className="aurora-stage relative isolate min-h-64 overflow-hidden rounded-3xl border p-6 sm:min-h-80 sm:p-9">
          <AuroraShader speed={0.55} className="z-0" />
          <MeteorField count={12} />
          <div className="relative z-10 max-w-lg rounded-2xl border bg-background/65 p-5 shadow-lg backdrop-blur-sm sm:p-7">
            <Waves className="size-6 text-primary" aria-hidden />
            <p className="mt-3 text-sm font-medium text-primary">Aurora · WebGL</p>
            <p className="mt-1 font-display text-2xl font-semibold">Un mouvement discret derrière le contenu.</p>
            <p className="mt-2 text-sm text-muted-foreground">Collez le composant sur un conteneur relatif ; gardez le texte au premier plan.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="text-title" className="mb-10 grid gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <h2 id="text-title" className="text-xl font-semibold">Animations de texte</h2>
            <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"><TextReveal text="Un mot à la fois." by="word" effect="blur" delayMs={95} /></p>
            <p className="mt-5 text-sm text-muted-foreground">Les versions caractères, montée et glissement sont dans <code>TextReveal</code>.</p>
          </CardContent>
          <BorderBeam />
        </Card>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Texte dégradé et marquee</h2>
            <p className="mt-4 text-2xl font-semibold"><AnimatedGradientText speed={Math.max(1, 5 - speed)}>Le détail qui attire l'œil</AnimatedGradientText></p>
            <Marquee speed={Math.max(8, 30 - speed * 8)} className="mt-6 rounded-xl border bg-muted/30 py-3">
              {tags.map((tag) => <span key={tag} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">{tag}</span>)}
            </Marquee>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="slider-title" className="mb-10 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent className="p-6">
            <h2 id="slider-title" className="text-xl font-semibold">Slider animé</h2>
            <p className="mt-2 text-sm text-muted-foreground">Slider HTML accessible : les réglages simples ne nécessitent pas de bibliothèque supplémentaire.</p>
            <label htmlFor="motion-speed" className="mt-6 flex justify-between text-sm font-medium"><span>Vitesse du ruban</span><output>{speed.toFixed(2)}×</output></label>
            <Slider id="motion-speed" min={0.5} max={2.5} step={0.25} value={speed} onValueChange={setSpeed} aria-label="Vitesse du ruban" className="mt-3" />
            <label htmlFor="motion-glow" className="mt-6 flex justify-between text-sm font-medium"><span>Intensité de l'aperçu</span><output>{glow}%</output></label>
            <Slider id="motion-glow" min={15} max={100} value={glow} onValueChange={setGlow} aria-label="Intensité de l'aperçu" className="mt-3" />
          </CardContent>
        </Card>
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-3xl border bg-muted/30 p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_var(--glow),transparent),transparent_68%)] transition-opacity duration-300" style={{ "--glow": `${glow}%` } as CSSProperties} />
          <div className="relative rounded-2xl border bg-card p-6 text-center shadow-xl transition-transform duration-500 hover:scale-[1.03]">
            <ChartNoAxesCombined className="mx-auto size-8 text-primary" aria-hidden />
            <p className="mt-3 font-display text-2xl font-semibold">Aperçu réactif</p>
            <p className="mt-1 text-sm text-muted-foreground">Le contrôle change l'intensité, le ruban change de vitesse.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="bento-title" className="mb-10">
        <div className="mb-4"><h2 id="bento-title" className="text-xl font-semibold">Grille bento et accents Magic UI</h2><p className="mt-1 text-sm text-muted-foreground">Cartes réutilisables, beam de bordure et particules CSS, sans dépendance de mouvement.</p></div>
        <BentoGrid>
          <BentoCard className="sm:col-span-2" icon={<Layers3 className="size-5" aria-hidden />} title="BentoGrid" description="Réorganisez ces cartes pour raconter la fonctionnalité principale du sujet." action="Exemple de carte bento" />
          <BentoCard icon={<CalendarDays className="size-5" aria-hidden />} title="Motion modérée" description="Un seul accent animé par bloc suffit souvent." background={<div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent" />} />
          <BentoCard className="relative" icon={<Sparkles className="size-5" aria-hidden />} title="Meteors" description="Une couche décorative optionnelle à supprimer sur les pages denses." background={<MeteorField count={10} />} />
        </BentoGrid>
      </section>

      <aside className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
        <strong className="text-foreground">Conseil concours :</strong> préférez une transition courte, une animation de hero et un seul effet décoratif. Tous les exemples respectent <code>prefers-reduced-motion</code> ; le shader dispose d'un fond CSS de secours.
      </aside>
    </Container>
  )
}
