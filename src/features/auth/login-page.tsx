import { useState } from "react"
import { Info } from "lucide-react"
import { Link, Navigate, useLocation } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { AuthForm } from "@/features/auth/auth-form"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

export function LoginPage() {
  const { user, backend, signInDemo } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/app"
  const [demoBusy, setDemoBusy] = useState(false)

  // Une fois connecté (Supabase ou mode local), on renvoie vers la page demandée.
  if (user) return <Navigate to={from} replace />

  const tryDemo = async () => {
    setDemoBusy(true)
    try {
      await signInDemo()
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <Container className="py-16">
      <title>{`Connexion — ${SITE.name}`}</title>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold sm:text-4xl">Se connecter</h1>

        {backend === "local" && (
          <p className="mt-4 flex gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Mode démo local : aucune donnée n'est envoyée, tout reste dans ce navigateur. Renseignez Supabase dans
              .env.local pour utiliser une vraie base.
            </span>
          </p>
        )}

        <div className="mt-8">
          <AuthForm mode="signin" />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
            Créer un compte
          </Link>
        </p>

        <div className="mt-8 border-t pt-6">
          <p className="mb-3 text-sm text-muted-foreground">Vous évaluez cette application ?</p>
          <Button variant="highlight" className="w-full" disabled={demoBusy} onClick={tryDemo}>
            Essayer avec le compte démo
          </Button>
        </div>
      </div>
    </Container>
  )
}
