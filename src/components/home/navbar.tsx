import { Link } from "react-router"
import { motion } from "framer-motion"
import { Sparkles, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

/**
 * Navbar qui apparaît avec un fondu uniquement en Phase 2 (Get Started).
 */
export function Navbar() {
  const { user } = useAuth()
  const primaryPath = user ? (user.isAdmin ? "/admin" : "/app") : "/inscription"

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo / Nom du projet */}
        <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-foreground">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span>{SITE.name}</span>
        </Link>

        {/* Liens et boutons d'action */}
        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" variant="default">
              <Link to={primaryPath}>
                <User className="mr-1.5 size-3.5" />
                Mon Espace
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                <Link to="/connexion">Connexion</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/inscription">Rejoindre</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
