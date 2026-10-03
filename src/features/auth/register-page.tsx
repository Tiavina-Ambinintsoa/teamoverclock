import { Navigate } from "react-router"

import { AuthShell } from "@/features/auth/auth-shell"
import { SignupForm } from "@/features/auth/signup-form"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

export function RegisterPage() {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to="/app" replace />

  return (
    <>
      <title>Créer un compte — {SITE.name}</title>
      <AuthShell mode="signup">
        <SignupForm />
      </AuthShell>
    </>
  )
}
