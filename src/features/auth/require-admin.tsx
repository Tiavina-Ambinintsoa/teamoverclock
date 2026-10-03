import { Link, Navigate, Outlet, useLocation } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/page-loader"
import { useAuth } from "@/features/auth/auth-context"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

export function RequireAdmin() {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/admin/connexion" replace state={{ from: location.pathname }} />

  if (!user.isAdmin) {
    return (
      <Container className="py-20">
        <div role="alert" className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold"><AuroraTitle>Accès administrateur requis</AuroraTitle></h1>
          <p className="mt-3 text-muted-foreground">Ce compte n'a pas le rôle administrateur.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline"><Link to="/admin/connexion">Changer de compte</Link></Button>
            <Button variant="ghost" onClick={() => void signOut()}>Se déconnecter</Button>
          </div>
        </div>
      </Container>
    )
  }

  return <Outlet />
}
