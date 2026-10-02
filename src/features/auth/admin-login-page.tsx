import { useState } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"

import { AuthForm } from "@/features/auth/auth-form"
import { AuthShell } from "@/features/auth/auth-shell"
import { useAuth } from "@/features/auth/auth-context"
import { Button } from "@/components/ui/button"
import { SITE } from "@/lib/site"

export function AdminLoginPage() {
  const { user, loading, backend, signInAdmin } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!loading && user?.isAdmin) return <Navigate to="/admin" replace />

  const openDemo = async () => {
    setBusy(true)
    try {
      await signInAdmin("", "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <title>Administration — {SITE.name}</title>
      <AuthShell mode="admin">
        <AuthForm mode="admin" />
        {backend === "local" && (
          <div className="mt-5 border-t pt-5">
            <p className="mb-3 text-center text-sm text-muted-foreground">
              Mode démo local : ce compte ne protège aucune donnée réelle.
            </p>
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => void openDemo()}>
              {busy ? "Ouverture…" : "Ouvrir la démo administrateur"}
            </Button>
          </div>
        )}
      </AuthShell>
    </>
  )
}
