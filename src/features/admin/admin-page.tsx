import { useState } from "react"
import { Activity, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-switcher"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

const sections = [
  { id: "overview", label: "admin.overview", icon: LayoutDashboard, to: "/admin" },
  { id: "users", label: "admin.users", icon: Users, to: "/admin/users" },
  { id: "moderation", label: "admin.moderation", icon: ShieldCheck, to: "/admin/moderation" },
  { id: "logs", label: "admin.logs", icon: Activity, to: "/admin/logs" },
  { id: "settings", label: "admin.settings", icon: Settings, to: "/admin/settings" },
]

const sectionCopy: Record<string, [string, string]> = {
  overview: ["admin.overview", "admin.overviewDescription"],
  users: ["admin.users", "admin.usersDescription"],
  moderation: ["admin.moderation", "admin.moderationDescription"],
  logs: ["admin.logs", "admin.logsDescription"],
  settings: ["admin.settings", "admin.settingsDescription"],
}

const metrics = [
  { label: "admin.accounts", icon: Users },
  { label: "admin.content", icon: LayoutDashboard },
  { label: "admin.reports", icon: ShieldCheck },
  { label: "admin.activity", icon: Activity },
]

export function AdminPage() {
  const { section: routeSection } = useParams()
  const section = sectionCopy[routeSection ?? "overview"] ? routeSection ?? "overview" : "overview"
  const { t } = useLocale()
  const [filter, setFilter] = useState("")
  const [query, setQuery] = useState("")

  return (
    <div className="min-h-svh bg-muted/30">
      <title>{t(sectionCopy[section][0])} — {SITE.name}</title>
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-2 sm:px-8">
        <Link to="/admin" className="flex items-center gap-2 font-display font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-4" aria-hidden /></span>
          {t("admin.header")} · {SITE.shortName}
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button asChild variant="outline" size="sm"><Link to="/app">{t("admin.back")}</Link></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[14rem_1fr] lg:py-10">
        <aside className="rounded-2xl border bg-card p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.console")}</p>
          <nav aria-label={t("admin.console")} className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {sections.map(({ id, label, icon: Icon, to }) => (
              <Link key={id} to={to} aria-current={section === id ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", section === id && "bg-accent font-medium text-foreground")}>
                <Icon className="size-4" aria-hidden /> {t(label)}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="mb-6">
            <p className="text-sm font-medium text-primary">{t("admin.eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-semibold">{t(sectionCopy[section][0])}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t(sectionCopy[section][1])}</p>
          </header>

          {section === "overview" ? (
            <>
              <section aria-label={t("admin.eyebrow")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, icon: Icon }) => (
                  <article key={label} className="rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t(label)}</span><Icon className="size-4" aria-hidden />
                    </div>
                    <p className="mt-5 text-3xl font-semibold text-muted-foreground">—</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("admin.connect")}</p>
                  </article>
                ))}
              </section>
              <div className="mt-5 rounded-xl border border-dashed bg-card p-8 text-center">
                <p className="font-medium">{t("admin.readyTitle")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("admin.readyText")}</p>
              </div>
            </>
          ) : (
            <section className="rounded-xl border bg-card p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="admin-search">{t("admin.search")}</label>
                <input id="admin-search" type="search" placeholder={t("admin.search")} value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
                {section === "users" && (
                  <>
                    <label className="sr-only" htmlFor="admin-filter">{t("admin.filter")}</label>
                    <select id="admin-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                      <option value="">{t("admin.allRoles")}</option><option value="member">{t("settings.member")}</option><option value="admin">{t("admin.adminRole")}</option>
                    </select>
                  </>
                )}
              </div>
              <div className="mt-6 rounded-lg border border-dashed px-5 py-12 text-center">
                <p className="font-medium">{t("admin.noData")}</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                  {query || filter ? t("admin.noResults") : t("admin.connectData")}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
