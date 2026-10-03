import { Link, Navigate, Outlet, useLocation } from "react-router"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { homeForRole } from "@/lib/permissions"
import type { UserRole } from "@/lib/types"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

export function ForbiddenPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  return (
    <Container className="py-20">
      <title>403 — {tx("Accès refusé", "Access denied")}</title>
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm font-semibold tracking-widest text-destructive">403</p>
        <h1 className="mt-2 text-2xl font-semibold"><AuroraTitle>{tx("Accès refusé", "Access denied")}</AuroraTitle></h1>
        <p className="mt-3 text-muted-foreground">
          {tx(
            "Votre profil n'a pas les droits nécessaires pour consulter cette page.",
            "Your profile does not have the rights needed to view this page."
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to={homeForRole(user?.profileRole)}>{tx("Retour à mon espace", "Back to my space")}</Link></Button>
          <Button asChild variant="outline"><Link to="/">{tx("Accueil", "Home")}</Link></Button>
        </div>
      </div>
    </Container>
  )
}

export interface RequireRoleProps {
  /** Profils autorisés ; l'administrateur général est toujours admis. */
  allow: readonly UserRole[]
}

/**
 * Garde de route par profil (D09). Elle masque l'interface : la vraie protection reste côté serveur (RLS).
 * Modifier l'URL à la main aboutit ici (403 contrôlée) et non sur des données.
 */
export function RequireRole({ allow }: RequireRoleProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  if (!user.profileLoaded) return <PageLoader />
  if (user.isAdmin || allow.includes(user.profileRole)) return <Outlet />
  return <ForbiddenPage />
}
