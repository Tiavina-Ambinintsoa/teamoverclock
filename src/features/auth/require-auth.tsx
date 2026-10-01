import { Navigate, Outlet, useLocation } from "react-router"

import { PageLoader } from "@/components/page-loader"
import { useAuth } from "@/features/auth/auth-context"

/** Route protégée : redirige vers /connexion et revient ensuite à la page demandée. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  return <Outlet />
}
