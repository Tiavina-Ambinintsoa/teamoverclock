import { isRouteErrorResponse, Link, useRouteError } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

/** Écran d'erreur de route : explique ce qui s'est passé et propose une sortie. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const detail = isRouteErrorResponse(error)
    ? error.statusText || `Erreur ${error.status}`
    : error instanceof Error
      ? error.message
      : "Erreur inconnue"

  return (
    <Container className="py-24">
      <title>{notFound ? "Page introuvable" : "Erreur"}</title>
      <h1 className="text-4xl font-semibold sm:text-5xl">
        {notFound ? "Cette page n'existe pas" : "Cette page n'a pas pu s'afficher"}
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">{detail}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">Retour à l'accueil</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </div>
    </Container>
  )
}
