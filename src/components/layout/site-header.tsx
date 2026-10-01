import { LogOut } from "lucide-react"
import { Link, NavLink, useNavigate } from "react-router"

import { ModeToggle } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { useAuth } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

function HeaderLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn("shrink-0 rounded-md px-3 py-1.5 transition-colors hover:bg-accent", isActive && "bg-accent font-medium")
      }
    >
      {children}
    </NavLink>
  )
}

export function SiteHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-14 items-center gap-3">
        <Link to="/" className="shrink-0 font-display text-lg font-semibold tracking-tight">
          {SITE.shortName}
        </Link>
        <nav
          aria-label="Navigation principale"
          className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <HeaderLink to="/app">Application</HeaderLink>
          {env.enableKit && <HeaderLink to="/modeles">Modèles</HeaderLink>}
          {env.enableKit && <HeaderLink to="/kit">Kit</HeaderLink>}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ModeToggle />
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                // On quitte d'abord la page protégée : sinon RequireAuth redirigerait vers /connexion.
                await navigate("/")
                await signOut()
              }}
            >
              <LogOut />
              Se déconnecter
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/connexion">Se connecter</Link>
            </Button>
          )}
        </div>
      </Container>
    </header>
  )
}
