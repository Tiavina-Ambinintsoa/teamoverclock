import { useState } from "react"
import { Box, Gamepad2, Image, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { AlternateHomeHero, type HomeHeroVariant } from "@/components/home-presets/alternate-home-heroes"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

const VARIANTS: { id: HomeHeroVariant; title: string; summary: string; icon: typeof Sparkles }[] = [
  { id: "futuriste", title: "Gaming futuriste", summary: "Néons, grille animée, anneaux et contraste marqué.", icon: Gamepad2 },
  { id: "image", title: "Image en parallaxe", summary: "Visuel SVG local, profondeur au pointeur et déplacement au scroll.", icon: Image },
  { id: "3d", title: "Objet 3D central", summary: "Objet interactif Three.js, couleurs liées à la palette active.", icon: Box },
]

export function HomeVariantsPage() {
  const [active, setActive] = useState<HomeHeroVariant>("futuriste")
  const { user } = useAuth()
  const primaryPath = user ? (user.isAdmin ? "/admin" : "/app") : "/inscription"
  const current = VARIANTS.find((variant) => variant.id === active) ?? VARIANTS[0]

  return (
    <Container className="py-10">
      <title>Variantes d'accueil — {SITE.name}</title>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-primary">Modèle de page</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Choisir une direction pour l'accueil</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Prévisualisez plusieurs styles, puis ouvrez l'accueil avec la variante sélectionnée.</p>
        </div>
        <Button asChild variant="outline" shape="pill"><Link to="/">Accueil actuel</Link></Button>
      </header>

      <fieldset className="mb-6 grid gap-3 border-0 p-0 sm:grid-cols-3">
        <legend className="sr-only">Choisir un style de hero</legend>
        {VARIANTS.map(({ id, title, summary, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            onClick={() => setActive(id)}
            className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring ${active === id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card"}`}
          >
            <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span><span className="font-semibold">{title}</span></span>
            <span className="mt-3 block text-sm leading-6 text-muted-foreground">{summary}</span>
          </button>
        ))}
      </fieldset>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <AlternateHomeHero variant={active} primaryPath={primaryPath} />
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4 sm:p-5">
        <div><p className="font-semibold">{current.title}</p><p className="mt-1 text-sm text-muted-foreground">Le lien de prévisualisation garde le choix dans l'URL.</p></div>
        <Button asChild shape="pill"><Link to={`/?hero=${active}`}>Prévisualiser à l'accueil <Sparkles aria-hidden /></Link></Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Pour garder le choix, remplacez <code>HOME_HERO_DEFAULT</code> dans <code>src/pages/home-page.tsx</code>. Placez votre propre image dans <code>public/images/</code> et changez <code>home-aurora.svg</code> dans le composant parallaxe.</p>
    </Container>
  )
}
