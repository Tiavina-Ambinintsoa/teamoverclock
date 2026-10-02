import { Navigate } from "react-router"

import { AuthForm } from "@/features/auth/auth-form"
import { AuthShell } from "@/features/auth/auth-shell"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

export function RegisterPage() {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to="/app" replace />

  return (
    <>
      <title>Créer un compte — {SITE.name}</title>
      <AuthShell mode="signup">
        <AuthForm mode="signup" />
      </AuthShell>
    </>
  )
}
