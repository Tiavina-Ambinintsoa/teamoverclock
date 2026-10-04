import { useEffect, useState } from "react"
import { ChevronDown, Menu, ShieldCheck, Sparkles, X } from "lucide-react"
import { Link, NavLink, useNavigate } from "react-router"

import { ModeToggle } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { AuroraTitle } from "@/components/magic-ui"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useAuth } from "@/features/auth/auth-context"
import { HelpMenu } from "@/features/guide/help-menu"
import { useLocale } from "@/lib/locale"
import { homeForRole } from "@/lib/permissions"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

const PUBLIC_LINKS = [
  { to: "/", fr: "Accueil", en: "Home" },
  { to: "/welcome", fr: "Bienvenue", en: "Welcome" },
  { to: "/services", fr: "Services", en: "Services" },
  { to: "/news", fr: "Actualités", en: "News" },
  { to: "/map", fr: "Carte", en: "Map" },
  { to: "/dangers", fr: "Dangers", en: "Dangers" },
  { to: "/faq", fr: "FAQ", en: "FAQ" },
  { to: "/contact", fr: "Contact", en: "Contact" },
]

function HeaderLink({ to, children, onClick }: { to: string; children: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      viewTransition
      onClick={onClick}
      className={({ isActive }) =>
        cn("shrink-0 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent", isActive && "bg-accent font-medium")
      }
    >
      {children}
    </NavLink>
  )
}

export function SiteHeader() {
  const { user, signOut } = useAuth()
  const { t, tx } = useLocale()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [detached, setDetached] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const space = homeForRole(user?.profileRole)

  useEffect(() => {
    const update = () => setDetached(window.scrollY > 24)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  const logout = async () => {
    closeMenu()
    await navigate("/")
    await signOut()
  }

  return (
    <div className="site-header-shell" data-detached={detached ? "true" : undefined}>
      <header data-tour="header" className="site-header border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <Container className="flex min-h-16 max-w-[1700px] items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <AuroraTitle>{SITE.shortName}</AuroraTitle>
          </Link>

          <nav aria-label={tx("Navigation principale", "Main navigation")} className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex">
            {PUBLIC_LINKS.map((link) => (
              <HeaderLink key={link.to} to={link.to} onClick={closeMenu}>{tx(link.fr, link.en)}</HeaderLink>
            ))}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex">
            <LanguageSwitcher />
            <HelpMenu />
            <ModeToggle />
            {user ? (
              <>
                {user.isAdmin && (
                  <Button asChild variant="outline" size="sm" shape="pill">
                    <Link to="/admin" aria-label={t("nav.admin")} title={t("nav.admin")}><ShieldCheck aria-hidden /></Link>
                  </Button>
                )}
                <details className="relative">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border p-1 pr-3 hover:bg-accent">
                    <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden>
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-32 truncate text-sm">{user.displayName}</span>
                    <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
                  </summary>
                  <div className="absolute top-12 right-0 z-40 grid w-56 gap-1 rounded-xl border bg-popover p-2 shadow-lg">
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">{user.email}</p>
                    <Link to={space} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("nav.mySpace")}</Link>
                    <Link to="/app/parametres" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("app.settings")}</Link>
                    <Button variant="ghost" className="justify-start" onClick={() => void logout()}>{t("nav.leave")}</Button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/connexion">{t("nav.login")}</Link></Button>
                <Button asChild size="sm" shape="pill"><Link to="/inscription">{t("nav.signup")}</Link></Button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 xl:hidden">
            <LanguageSwitcher />
            <HelpMenu />
            <ModeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={menuOpen}
              aria-controls="navigation-mobile"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
            </Button>
          </div>
        </Container>

        {menuOpen && (
          <nav id="navigation-mobile" aria-label={tx("Navigation mobile", "Mobile navigation")} className="border-t bg-background p-4 xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {PUBLIC_LINKS.map((link) => (
                <HeaderLink key={link.to} to={link.to} onClick={closeMenu}>{tx(link.fr, link.en)}</HeaderLink>
              ))}
              <div className="mt-2 grid gap-3 border-t pt-3">
                {user ? (
                  <div className="grid gap-1 rounded-xl border bg-card p-2">
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">{user.email}</p>
                    <Link to={space} onClick={closeMenu} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("nav.mySpace")}</Link>
                    {user.isAdmin && <Link to="/admin" onClick={closeMenu} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("nav.admin")}</Link>}
                    <Link to="/app/parametres" onClick={closeMenu} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("app.settings")}</Link>
                    <Button variant="ghost" className="justify-start" onClick={() => void logout()}>{t("nav.leave")}</Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" shape="pill"><Link to="/connexion" onClick={closeMenu}>{t("nav.login")}</Link></Button>
                    <Button asChild shape="pill"><Link to="/inscription" onClick={closeMenu}>{t("nav.signup")}</Link></Button>
                  </div>
                )}
                <LanguageSwitcher />
              </div>
            </div>
          </nav>
        )}
      </header>
    </div>
  )
}
