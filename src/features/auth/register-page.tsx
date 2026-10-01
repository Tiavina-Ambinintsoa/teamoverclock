import { Navigate, Link, useLocation } from "react-router"

import { Container } from "@/components/layout/container"
import { AuthForm } from "@/features/auth/auth-form"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

export function RegisterPage() {
  const { user } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/app"

  if (user) return <Navigate to={from} replace />

  return (
    <Container className="py-16">
      <title>{`Créer un compte — ${SITE.name}`}</title>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold sm:text-4xl">Créer un compte</h1>
        <p className="mt-2 text-muted-foreground">Quelques secondes suffisent.</p>

        <div className="mt-8">
          <AuthForm mode="signup" />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </Container>
  )
}
