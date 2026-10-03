import { useState, type FormEvent } from "react"
import { ChevronDown, LogOut, Menu, Search, Settings, X } from "lucide-react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"

import { navForRole } from "@/components/layout/nav-config"
import { ModeToggle } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { HelpMenu } from "@/features/guide/help-menu"
import { useAuth } from "@/features/auth/auth-context"
import { NotificationsMenu } from "@/features/notifications/notifications-menu"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

function Sidebar({ close }: { close?: () => void }) {
  const { user } = useAuth()
  const { tx } = useLocale()
  const groups = navForRole(user?.profileRole, user?.isAdmin === true)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <Link to="/" className="flex items-center gap-3 font-display text-lg font-semibold" onClick={close}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">N</span>
          {SITE.shortName}
        </Link>
        {close && (
          <Button type="button" variant="ghost" size="icon" aria-label={tx("Fermer le menu", "Close menu")} onClick={close}>
            <X aria-hidden />
          </Button>
        )}
      </div>
      <nav aria-label={tx("Navigation de l'application", "Application navigation")} className="grid gap-5 px-4 py-5">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tx(group.fr, group.en)}</p>
            <div className="grid gap-1">
              {group.items.map(({ to, fr, en, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  viewTransition
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                      isActive && "bg-accent font-medium text-foreground"
                    )
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {tx(fr, en)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <p className="truncate text-sm font-medium">{user?.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  )
}

export function ApplicationLayout() {
  const { user, signOut } = useAuth()
  const { tx } = useLocale()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState("")

  /** Recherche globale : renvoie vers les services, qui filtrent par mot-clé. */
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = search.trim()
    void navigate(value ? `/services?q=${encodeURIComponent(value)}` : "/services")
  }

  const logout = async () => {
    await navigate("/")
    await signOut()
  }

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label={tx("Fermer le menu", "Close menu")} onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 h-full w-[min(18rem,85vw)] border-r bg-background shadow-xl">
            <Sidebar close={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header data-tour="header" className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label={tx("Ouvrir le menu", "Open menu")} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <search className="relative w-full max-w-md">
            <form onSubmit={submitSearch} className="relative w-full" data-tour="global-search">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                aria-label={tx("Rechercher un service, une démarche…", "Search a service, a procedure…")}
                placeholder={tx("Rechercher un service…", "Search a service…")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border bg-muted/40 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
          </search>
          <div className="ml-auto flex items-center gap-2">
            <HelpMenu />
            <ModeToggle />
            <NotificationsMenu />
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border p-1 pr-2 hover:bg-accent">
                <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden>
                  {(user?.displayName.charAt(0) ?? "U").toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-sm sm:inline">{user?.displayName}</span>
                <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
              </summary>
              <div className="absolute top-11 right-0 z-40 grid w-52 gap-1 rounded-xl border bg-popover p-2 shadow-lg">
                <p className="truncate px-2 py-1 text-xs text-muted-foreground">{user?.email}</p>
                <Link to="/app/parametres" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
                  <Settings className="size-4" aria-hidden /> {tx("Paramètres", "Settings")}
                </Link>
                <Button variant="ghost" className="justify-start" onClick={() => void logout()}>
                  <LogOut aria-hidden /> {tx("Se déconnecter", "Sign out")}
                </Button>
              </div>
            </details>
          </div>
        </header>

        <main className="flex-1 py-6 sm:py-9">
          <Outlet />
        </main>
        <footer className="border-t px-5 py-4 text-xs text-muted-foreground sm:px-8">
          {tx("Simulation — ville fictive", "Simulation — fictional city")} · {SITE.name}
        </footer>
      </div>
    </div>
  )
}
