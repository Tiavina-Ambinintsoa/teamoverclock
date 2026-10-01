import type { CSSProperties } from "react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { SITE } from "@/lib/site"

/** Rang dans la séquence d'entrée du hero (voir .rise dans index.css). */
const step = (index: number) => ({ "--i": index }) as CSSProperties

// TODO(webcup): remplacer ce bloc par le contenu réel de la page d'accueil.
const MODULES = [
  {
    name: "Connexion",
    text: "Comptes, sessions et route protégée /app. Bascule seule en mode démo si Supabase n'est pas configuré.",
  },
  {
    name: "Données",
    text: "Un exemple complet : liste, création, suppression et page de détail partageable.",
  },
  {
    name: "Thèmes",
    text: "Cinq palettes prêtes, en clair et en sombre. Changez de thème en une ligne dans lib/site.ts.",
  },
  {
    name: "Déploiement",
    text: "Build statique pour le serveur HODI : règles .htaccess, contrôle du poids et des TODO avant le rendu.",
  },
]

export function HomePage() {
  const { user } = useAuth()

  return (
    <>
      <title>{SITE.name}</title>
      <meta name="description" content={SITE.description} />

      <Container className="py-16 sm:py-28">
        <h1
          className="rise font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] font-semibold tracking-tight"
          style={step(0)}
        >
          {SITE.name}
        </h1>
        <p className="rise mt-8 max-w-2xl text-xl text-muted-foreground" style={step(1)}>
          {SITE.tagline}
        </p>
        <div className="rise mt-10 flex flex-wrap gap-3" style={step(2)}>
          <Button asChild size="lg">
            <Link to="/app">Ouvrir l'application</Link>
          </Button>
          {!user && (
            <Button asChild size="lg" variant="outline">
              <Link to="/connexion">Se connecter</Link>
            </Button>
          )}
          {env.enableKit && (
            <Button asChild size="lg" variant="ghost">
              <Link to="/kit">Explorer le kit</Link>
            </Button>
          )}
        </div>
      </Container>

      <Container>
        <section aria-labelledby="modules-titre" className="border-t pt-12">
          <h2 id="modules-titre" className="text-2xl font-semibold">
            Déjà branché dans ce modèle
          </h2>
          <dl className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {MODULES.map((module) => (
              <div key={module.name} className="border-t pt-4">
                <dt className="font-display text-lg font-semibold">{module.name}</dt>
                <dd className="mt-1 max-w-md text-muted-foreground">{module.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Container>
    </>
  )
}
