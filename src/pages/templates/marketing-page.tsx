import { Check, Leaf, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useCountUp } from "@/hooks/use-count-up"
import { useReveal } from "@/hooks/use-reveal"
import { formatAriary } from "@/lib/format"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Sections de page d'accueil / landing (marketing). Chaque <section> est autonome :
 * copiez celles qui vous servent directement dans pages/home-page.tsx, supprimez le reste.
 * Contenus, chiffres et témoignages sont des exemples à remplacer.
 */

const FEATURES = [
  { icon: Zap, title: "Rapide à prendre en main", text: "Une interface claire, pensée pour qu'on s'y retrouve dès la première visite." },
  { icon: ShieldCheck, title: "Fiable", text: "Vos données sont protégées et accessibles seulement par vous, à tout moment." },
  { icon: Leaf, title: "Sobre", text: "Aucune ressource superflue : des pages légères, rapides même sur petite connexion." },
]

const PLANS = [
  { name: "Essentiel", price: 0, tagline: "Pour démarrer", items: ["1 utilisateur", "Fonctions de base", "Support communautaire"] },
  { name: "Équipe", price: 25000, tagline: "Le plus choisi", items: ["5 utilisateurs", "Toutes les fonctions", "Support prioritaire"], highlighted: true },
  { name: "Organisation", price: 60000, tagline: "Pour aller loin", items: ["Utilisateurs illimités", "Accès anticipé", "Accompagnement dédié"] },
]

const TESTIMONIALS = [
  { name: "Voahangy R.", role: "Utilisatrice", quote: "Exactement ce qu'il me fallait : simple, et ça marche du premier coup." },
  { name: "Fenosoa A.", role: "Cliente", quote: "L'équipe a été réactive, et le résultat dépasse ce que j'imaginais." },
  { name: "Tojo M.", role: "Partenaire", quote: "Une prise en main immédiate, aucune formation nécessaire." },
]

const HOME_STATS = [
  { value: 1200, suffix: "+", label: "utilisateurs actifs" },
  { value: 98, suffix: "%", label: "de satisfaction" },
  { value: 24, suffix: "/7", label: "disponibilité" },
]

/** Un composant par chiffre : useCountUp doit s'appeler au niveau racine d'un composant, jamais dans un .map(). */
function HomeStat({ value, suffix, label, start }: (typeof HOME_STATS)[number] & { start: boolean }) {
  const n = useCountUp(value, start)
  return (
    <div>
      <p className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">
        {n}
        {suffix}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

const FAQ = [
  { q: "Combien de temps pour démarrer ?", a: "Quelques minutes : créez un compte et vous êtes prêt." },
  { q: "Puis-je changer de formule plus tard ?", a: "Oui, à tout moment, sans perdre vos données." },
  { q: "Mes données sont-elles en sécurité ?", a: "Oui : chiffrement, sauvegardes régulières, accès restreint à vous seul." },
]

export function MarketingPage() {
  const { ref: statsRef, visible: statsVisible } = useReveal<HTMLDivElement>({ threshold: 0.4 })

  return (
    <>
      <title>Modèle : Sections marketing</title>
      <Container className="py-10">
        <TemplateNotice title="Sections marketing" usage="hero, fonctionnalités, tarifs, avis, FAQ — pour composer une page d'accueil" />
      </Container>

      {/* --- Hero --- */}
      <Container className="py-8 text-center sm:py-16">
        <Badge variant="secondary" className="mb-4">
          Nouveau
        </Badge>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold sm:text-6xl">Une phrase qui donne envie d'essayer</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Une deuxième phrase, plus concrète, qui explique à qui ça sert et ce que ça change.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/inscription">Commencer gratuitement</Link>
          </Button>
          <Button size="lg" variant="outline">
            Voir une démonstration
          </Button>
        </div>
      </Container>

      {/* --- Bande de confiance --- */}
      <div className="border-y bg-muted/40 py-6">
        <Container>
          <p className="text-center text-xs tracking-wide text-muted-foreground uppercase">Utilisé par des équipes à Madagascar</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-medium text-muted-foreground/70">
            {["Antananarivo", "Toamasina", "Fianarantsoa", "Mahajanga", "Toliara"].map((city) => (
              <span key={city}>{city}</span>
            ))}
          </div>
        </Container>
      </div>

      {/* --- Fonctionnalités --- */}
      <Container className="py-16">
        <h2 className="text-center text-3xl font-semibold">Ce que vous obtenez</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-6 text-primary" aria-hidden />
                <p className="mt-3 font-medium">{title}</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* --- Chiffres --- */}
      <div className="border-y bg-muted/40 py-14">
        <Container>
          <div ref={statsRef} className="grid grid-cols-3 gap-6 text-center">
            {HOME_STATS.map((s) => (
              <HomeStat key={s.label} {...s} start={statsVisible} />
            ))}
          </div>
        </Container>
      </div>

      {/* --- Témoignages --- */}
      <Container className="py-16">
        <h2 className="text-center text-3xl font-semibold">Ce qu'on en dit</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="pt-6">
                <Sparkles className="size-4 text-highlight" aria-hidden />
                <p className="mt-3 text-sm">"{t.quote}"</p>
                <p className="mt-4 text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* --- Tarifs --- */}
      <Container className="py-16">
        <h2 className="text-center text-3xl font-semibold">Tarifs</h2>
        <p className="mt-2 text-center text-muted-foreground">Montants d'exemple, en Ariary.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.highlighted ? "border-primary shadow-md" : undefined}>
              <CardHeader>
                {plan.highlighted && (
                  <Badge className="mb-2 w-fit" variant="highlight">
                    Le plus choisi
                  </Badge>
                )}
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-3 font-display text-3xl font-semibold">
                  {plan.price === 0 ? "Gratuit" : formatAriary(plan.price)}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground"> /mois</span>}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={plan.highlighted ? "default" : "outline"}>
                  Choisir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* --- FAQ (accordéon natif <details>, sans JS ni dépendance) --- */}
      <Container className="py-16">
        <h2 className="text-center text-3xl font-semibold">Questions fréquentes</h2>
        <div className="mx-auto mt-8 max-w-2xl divide-y rounded-lg border">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group p-4 open:bg-muted/40">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium marker:content-none">
                {q}
                <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </Container>

      {/* --- Appel à l'action final --- */}
      <div className="bg-primary py-16 text-primary-foreground">
        <Container className="text-center">
          <h2 className="text-3xl font-semibold">Prêt à commencer ?</h2>
          <p className="mx-auto mt-2 max-w-md text-primary-foreground/85">Aucune carte bancaire requise pour essayer.</p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link to="/inscription">Créer un compte gratuit</Link>
          </Button>
        </Container>
      </div>
    </>
  )
}
