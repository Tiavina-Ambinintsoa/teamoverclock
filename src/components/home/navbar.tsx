import { useEffect, useState } from "react"
import { Link } from "react-router"
import { motion } from "framer-motion"
import { Hexagon, Menu, Sparkles, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SITE } from "@/lib/site"
import { useLocale } from "@/lib/locale"

/**
 * Navbar avec effet de verre sci-fi au scroll et ancres rapides vers les sections clés.
 */
export function Navbar() {
  const { tx } = useLocale()
  const { user } = useAuth()
  const primaryPath = user ? (user.isAdmin ? "/admin" : "/app") : "/inscription"
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300 ${
        isScrolled
          ? "bg-[#070b14]/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo / Nom du projet */}
        <Link to="/welcome" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          <span className="grid size-8 place-items-center rounded-lg bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span>{SITE.name}</span>
        </Link>

        {/* Liens de navigation ancrés (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200">
          <a
            href="#historique"
            className="hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            Historique
          </a>
          <a
            href="#raison"
            className="hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            Vision & Raison
          </a>
          <a
            href="#espaces"
            className="hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            Les 3 Espaces
          </a>
          <a
            href="#avancements"
            className="hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            Avancements
          </a>
          <Link
            to="/map"
            className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-mono text-xs uppercase tracking-wider"
          >
            <Hexagon className="size-3.5" />
            Carte
          </Link>
        </nav>

        {/* Liens et boutons d'action */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Link to={primaryPath}>
                <User className="mr-1.5 size-3.5" />
                {tx("Mon Espace", "My space")}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="text-white hover:text-cyan-300 hover:bg-white/10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                <Link to="/connexion">{tx("Connexion", "Sign in")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Link to="/inscription">{tx("Rejoindre", "Join")}</Link>
              </Button>
            </>
          )}

          {/* Bouton Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/10"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu Déroulant Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070b14]/95 backdrop-blur-2xl border-b border-cyan-500/20 px-4 py-4 space-y-3">
          <a
            href="#historique"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-slate-200 hover:text-cyan-300 py-1"
          >
            Historique
          </a>
          <a
            href="#raison"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-slate-200 hover:text-cyan-300 py-1"
          >
            Vision & Raison
          </a>
          <a
            href="#espaces"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-slate-200 hover:text-cyan-300 py-1"
          >
            Les 3 Espaces
          </a>
          <a
            href="#avancements"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-slate-200 hover:text-cyan-300 py-1"
          >
            Avancements
          </a>
          <Link
            to="/map"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-1.5 text-sm text-cyan-300 py-1 font-mono uppercase"
          >
            <Hexagon className="size-3.5" />
            Carte Interactive
          </Link>
        </div>
      )}
    </motion.header>
  )
}
