import { useCallback, useEffect, useState } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"

import { AuthForm } from "@/features/auth/auth-form"
import { AuthShell } from "@/features/auth/auth-shell"
import { useAuth } from "@/features/auth/auth-context"
import { Button } from "@/components/ui/button"
import { SITE } from "@/lib/site"

export function LoginPage() {
  const { user, loading, backend, signInDemo } = useAuth()
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<"idle" | "authenticating" | "exiting" | "ready">("idle")

  const finishLogin = useCallback(async () => {
    setPhase("exiting")
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 0 : 520))
    setPhase("ready")
  }, [])

  // Couvre aussi le retour OAuth et une session déjà ouverte sur la page de connexion.
  useEffect(() => {
    if (!loading && user && phase === "idle") {
      const timer = window.setTimeout(() => void finishLogin(), 0)
      return () => window.clearTimeout(timer)
    }
  }, [finishLogin, loading, phase, user])

  if (!loading && user && phase === "ready") return <Navigate to={user.isAdmin ? "/admin" : "/app"} replace />

  const tryDemo = async () => {
    setBusy(true)
    setPhase("authenticating")
    try {
      await signInDemo()
      await finishLogin()
    } catch (error) {
      setPhase("idle")
      toast.error(error instanceof Error ? error.message : "Connexion impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <title>Connexion — {SITE.name}</title>
      <AuthShell mode="signin" isExiting={phase === "exiting"}>
        <AuthForm
          mode="signin"
          onLoginStart={() => setPhase("authenticating")}
          onLoginFailure={() => setPhase("idle")}
          onLoginSuccess={finishLogin}
        />
        {backend === "local" && (
          <div className="mt-5 border-t pt-5">
            <p className="mb-3 text-center text-sm text-muted-foreground">
              Démo locale : aucune donnée n'est envoyée à un serveur.
            </p>
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => void tryDemo()}>
              {busy ? "Ouverture…" : "Essayer le compte démo"}
            </Button>
          </div>
        )}
      </AuthShell>
    </>
  )
}
