import { Info, Rocket, Sparkles, Zap } from "lucide-react"

import { Container } from "@/components/layout/container"
import { AsyncButton } from "@/components/interactive/async-button"
import { LikeButton } from "@/components/interactive/like-button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCountUp } from "@/hooks/use-count-up"
import { useReveal } from "@/hooks/use-reveal"
import { cn } from "@/lib/utils"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Boutons et animations : les micro-interactions qui donnent une impression de finition,
 * chacune indépendante des autres (copiez uniquement celle qui vous intéresse).
 */

const STATS = [
  { icon: Rocket, value: 24, suffix: "h", label: "pour tout construire" },
  { icon: Zap, value: 3, label: "parcours qui comptent" },
  { icon: Sparkles, value: 98, suffix: "%", label: "de finition visée" },
]

function StatCard({ icon: Icon, value, suffix = "", label, start }: (typeof STATS)[number] & { start: boolean }) {
  const count = useCountUp(value, start)
  return (
    <div className="text-center">
      <Icon className="mx-auto size-5 text-primary" aria-hidden />
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums">
        {count}
        {suffix}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function RevealCard({ title, text, i }: { title: string; text: string; i: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <Card
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: `${i * 90}ms` }}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export function InteractionsPage() {
  const { ref: statsRef, visible: statsVisible } = useReveal<HTMLDivElement>({ threshold: 0.4 })

  return (
    <Container className="py-10">
      <title>Modèle : Boutons et animations</title>
      <TemplateNotice title="Boutons et animations" usage="micro-interactions prêtes à copier, une par une" />

      <h1 className="text-3xl font-semibold sm:text-4xl">Boutons et animations</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Chaque bloc ci-dessous est indépendant : gardez celui qui vous plaît, ignorez le reste.
      </p>

      {/* --- Bouton avec état de chargement --- */}
      <section aria-labelledby="async-titre" className="mt-14">
        <h2 id="async-titre" className="text-xl font-semibold">
          Bouton « Enregistrer » (chargement → succès)
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5">components/interactive/async-button.tsx</code> — passez-lui
          n'importe quelle fonction asynchrone, il gère l'icône et le texte tout seul.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AsyncButton onClick={() => new Promise((r) => setTimeout(r, 1200))}>Publier</AsyncButton>
          <AsyncButton
            variant="outline"
            successLabel="Copié"
            onClick={() => new Promise((r) => setTimeout(r, 600))}
          >
            Copier le lien
          </AsyncButton>
          <AsyncButton
            variant="destructive"
            errorLabel="Réessayez"
            onClick={() => new Promise((_r, reject) => setTimeout(reject, 900))}
          >
            Simuler un échec
          </AsyncButton>
        </div>
      </section>

      {/* --- J'aime --- */}
      <section aria-labelledby="like-titre" className="mt-14">
        <h2 id="like-titre" className="text-xl font-semibold">
          Bouton « J'aime »
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">Un petit éclat de particules à l'activation, sans dépendance.</p>
        <div className="mt-4 flex items-center gap-4">
          <LikeButton />
          <LikeButton defaultLiked />
        </div>
      </section>

      {/* --- Info-bulle --- */}
      <section aria-labelledby="tooltip-titre" className="mt-14">
        <h2 id="tooltip-titre" className="text-xl font-semibold">
          Info-bulle
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">Pour expliquer un bouton-icône sans alourdir l'interface.</p>
        <div className="mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="En savoir plus"
                className="inline-flex size-9 items-center justify-center rounded-full border hover:bg-accent"
              >
                <Info className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Affiché seulement au survol ou au focus clavier</TooltipContent>
          </Tooltip>
        </div>
      </section>

      {/* --- Cartes qui se soulèvent au survol --- */}
      <section aria-labelledby="hover-titre" className="mt-14">
        <h2 id="hover-titre" className="text-xl font-semibold">
          Cartes qui réagissent au survol
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {["Simple", "Soigné", "Rapide"].map((title) => (
            <Card key={title} className="cursor-default transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>transition-all + hover:-translate-y-1, rien de plus.</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Compteurs animés --- */}
      <section aria-labelledby="compteurs-titre" className="mt-14">
        <h2 id="compteurs-titre" className="text-xl font-semibold">
          Compteurs qui s'animent à l'arrivée à l'écran
        </h2>
        <div ref={statsRef} className="mt-6 grid grid-cols-3 gap-4 rounded-lg border bg-card p-6">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} start={statsVisible} />
          ))}
        </div>
      </section>

      {/* --- Révélation au défilement --- */}
      <section aria-labelledby="reveal-titre" className="mt-14">
        <h2 id="reveal-titre" className="text-xl font-semibold">
          Cartes qui apparaissent au défilement
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Faites défiler pour les voir apparaître. Basé sur <code className="rounded bg-muted px-1 py-0.5">hooks/use-reveal.ts</code>{" "}
          (IntersectionObserver). Désactivé automatiquement si l'utilisateur préfère moins d'animations.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RevealCard i={0} title="Un" text="Cette carte glisse et apparaît la première." />
          <RevealCard i={1} title="Deux" text="Celle-ci suit avec un léger délai." />
          <RevealCard i={2} title="Trois" text="Et celle-ci ferme la marche." />
        </div>
      </section>

      <p className="mt-14 max-w-prose text-sm text-muted-foreground">
        Astuce : combinez plusieurs de ces blocs sur une même page d'accueil pour un effet « produit fini ».
      </p>
    </Container>
  )
}
