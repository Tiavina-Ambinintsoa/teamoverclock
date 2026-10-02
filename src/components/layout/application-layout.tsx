import { useState, type FormEvent } from "react"
import { Bot, ChevronDown, LayoutDashboard, LogOut, Menu, NotebookPen, Search, Settings, ShieldCheck, X } from "lucide-react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-switcher"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { env } from "@/lib/env"
import { NotificationsMenu } from "@/features/notifications/notifications-menu"
import { cn } from "@/lib/utils"

const links = [
  { to: "/app/dashboard", label: "app.overview", icon: LayoutDashboard },
  { to: "/app", label: "app.notes", icon: NotebookPen },
  { to: "/app/parametres", label: "app.settings", icon: Settings },
]
const assistantLink = { to: "/app/assistant", label: "Assistant IA", icon: Bot }

function Sidebar({ close }: { close?: () => void }) {
  const { user } = useAuth()
  const { t } = useLocale()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link to="/" className="flex items-center gap-3 font-display text-lg font-semibold" onClick={close}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">N</span>
          {SITE.shortName}
        </Link>
        {close && <Button type="button" variant="ghost" size="icon" aria-label={t("app.closeNav")} onClick={close}><X aria-hidden /></Button>}
      </div>
      <div className="px-4 py-5">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("app.workspace")}</p>
        <nav aria-label="Navigation de l'application" className="grid gap-1">
          {(env.enableAIChat ? [...links, assistantLink] : links).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              onClick={close}
              className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", isActive && "bg-accent font-medium text-foreground")}
            >
              <Icon className="size-4" aria-hidden />
              {t(label)}
            </NavLink>
          ))}
          {user?.isAdmin && (
            <NavLink to="/admin" onClick={close} className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", isActive && "bg-accent font-medium text-foreground")}>
              <ShieldCheck className="size-4" aria-hidden /> Administration
            </NavLink>
          )}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <p className="truncate text-sm font-medium">{user?.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  )
}

export function ApplicationLayout() {
  const { user, signOut } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState("")

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = search.trim().toLowerCase()
    if (value.includes("note")) void navigate("/app")
    else if (value.includes("tableau") || value.includes("dashboard") || value.includes("accueil")) void navigate("/app/dashboard")
    else if (value.includes("param")) void navigate("/app/parametres")
    else toast.info(t("app.noSearch"))
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
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label={t("app.closeNav")} onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 h-full w-[min(18rem,85vw)] border-r bg-background shadow-xl">
            <Sidebar close={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label={t("app.openNav")} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <search className="relative w-full max-w-md">
            <form onSubmit={submitSearch} className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              aria-label={t("app.searchLabel")}
              placeholder={t("app.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-lg border bg-muted/40 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>
          </search>
          <div className="ml-auto flex items-center gap-2">
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
                {user?.isAdmin && <Link to="/admin" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("nav.admin")}</Link>}
                <Link to="/app/parametres" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-md px-2 py-2 text-sm hover:bg-accent">{t("app.settings")}</Link>
                <Button variant="ghost" className="justify-start" onClick={() => void logout()}><LogOut aria-hidden /> {t("app.logout")}</Button>
              </div>
            </details>
          </div>
        </header>

        <main className="flex-1 py-6 sm:py-9">
          <Outlet />
        </main>
        <footer className="border-t px-5 py-4 text-xs text-muted-foreground sm:px-8">
          {t("app.footer")} · {SITE.name}
        </footer>
      </div>
    </div>
  )
}
