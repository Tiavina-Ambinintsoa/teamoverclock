import { Link } from "react-router"

import { AuthForm } from "@/features/auth/auth-form"
import { AuthShell } from "@/features/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { SITE } from "@/lib/site"

export function PasswordRecoveryPage() {
  return (
    <>
      <title>Récupération du mot de passe — {SITE.name}</title>
      <AuthShell mode="recover">
        <AuthForm mode="recover" />
        <Button asChild variant="ghost" className="mt-3 w-full">
          <Link to="/connexion">Retour à la connexion</Link>
        </Button>
      </AuthShell>
    </>
  )
}

export function PasswordUpdatePage() {
  return (
    <>
      <title>Nouveau mot de passe — {SITE.name}</title>
      <AuthShell mode="reset">
        <AuthForm mode="reset" />
      </AuthShell>
    </>
  )
}
