import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <Container className="py-24">
      <title>Page introuvable</title>
      <h1 className="text-4xl font-semibold sm:text-5xl">Cette page n'existe pas</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        Le lien est peut-être incorrect ou la page a été déplacée.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </Container>
  )
}
