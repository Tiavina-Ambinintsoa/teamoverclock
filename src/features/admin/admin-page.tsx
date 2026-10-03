import { useEffect, useState } from "react"
import { Activity, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react"
import { Link, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme-switcher"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

type AdminUser = { id: string; email: string; displayName: string; role: "admin" | "member"; createdAt: string; lastSignInAt: string | null }
type ContactMessage = { id: string; name: string; email: string; message: string; status: "new" | "read" | "closed"; created_at: string }

function AdminUsersPanel({ query, role }: { query: string; role: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    if (!supabase) { setError("Configurez Supabase et déployez la fonction admin-data."); setLoading(false); return }
    setLoading(true)
    const { data, error: invokeError } = await supabase.functions.invoke("admin-data", { body: { action: "list-users", query, role } })
    if (invokeError || data?.error) setError(data?.error ?? invokeError?.message ?? "Erreur de chargement.")
    else { setError(""); setUsers(data.users as AdminUser[]); setTotal(data.total as number) }
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [query, role])

  const changeRole = async (entry: AdminUser) => {
    const nextRole = entry.role === "admin" ? "member" : "admin"
    if (entry.role === "admin" && !window.confirm(`Retirer le rôle admin de ${entry.email} ?`)) return
    setBusyId(entry.id)
    const { data, error: invokeError } = await supabase!.functions.invoke("admin-data", { body: { action: "set-role", userId: entry.id, role: nextRole } })
    if (invokeError || data?.error) setError(data?.error ?? invokeError?.message ?? "Erreur de modification du rôle.")
    else { setError(""); await load() }
    setBusyId("")
  }

  if (loading && users.length === 0) return <p className="mt-6 text-sm text-muted-foreground">Chargement des comptes…</p>
  if (error && users.length === 0) return <p role="alert" className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
  return <div className="mt-6">
    {error && <p role="alert" className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <p className="mb-3 text-xs text-muted-foreground">{total} comptes · Liste limitée aux 250 premiers résultats</p>
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[38rem] text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Compte</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Création</th><th className="px-4 py-3">Action</th></tr></thead>
        <tbody className="divide-y">
          {users.map((entry) => <tr key={entry.id}><td className="px-4 py-3"><p className="font-medium">{entry.displayName}</p><p className="text-xs text-muted-foreground">{entry.email}</p></td><td className="px-4 py-3">{entry.role === "admin" ? "Administrateur" : "Membre"}</td><td className="px-4 py-3">{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</td><td className="px-4 py-3"><button type="button" disabled={busyId === entry.id} onClick={() => void changeRole(entry)} className="text-primary underline underline-offset-4 disabled:opacity-50">{busyId === entry.id ? "En cours…" : entry.role === "admin" ? "Rétrograder" : "Promouvoir admin"}</button></td></tr>)}
          {users.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Aucun compte correspondant.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
}

function ContactInbox({ query }: { query: string }) {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = async () => {
    if (!supabase) { setError("Configurez Supabase et déployez la fonction admin-data."); setLoading(false); return }
    const { data, error: invokeError } = await supabase.functions.invoke("admin-data", { body: { action: "list-contact" } })
    if (invokeError || data?.error) setError(data?.error ?? invokeError?.message ?? "Erreur de chargement.")
    else { setMessages(data.messages as ContactMessage[]); setError("") }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const updateStatus = async (entry: ContactMessage, status: ContactMessage["status"]) => {
    setBusyId(entry.id)
    const { data, error: invokeError } = await supabase!.functions.invoke("admin-data", { body: { action: "set-contact-status", id: entry.id, status } })
    if (invokeError || data?.error) setError(data?.error ?? invokeError?.message ?? "Erreur de mise à jour.")
    else await load()
    setBusyId("")
  }
  const filtered = messages.filter((entry) => `${entry.name} ${entry.email} ${entry.message}`.toLowerCase().includes(query.toLowerCase()))
  if (loading) return <p className="mt-6 text-sm text-muted-foreground">Chargement des messages…</p>
  if (error && messages.length === 0) return <p role="alert" className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
  return <div className="mt-6 grid gap-3">
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {filtered.map((entry) => <article key={entry.id} className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{entry.name}</p><a className="text-sm text-primary underline" href={`mailto:${entry.email}`}>{entry.email}</a><p className="mt-1 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("fr-FR")}</p></div>
        <select aria-label={`Statut du message de ${entry.name}`} disabled={busyId === entry.id} value={entry.status} onChange={(event) => void updateStatus(entry, event.target.value as ContactMessage["status"])} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="new">Nouveau</option><option value="read">Lu</option><option value="closed">Fermé</option></select></div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{entry.message}</p>
    </article>)}
    {filtered.length === 0 && <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">Aucun message à afficher.</p>}
  </div>
}

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
            <h1 className="mt-1 text-3xl font-semibold"><AuroraTitle>{t(sectionCopy[section][0])}</AuroraTitle></h1>
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
          ) : section === "users" ? (
            <section className="rounded-xl border bg-card p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="admin-search">{t("admin.search")}</label>
                <input id="admin-search" type="search" placeholder={t("admin.search")} value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
                <label className="sr-only" htmlFor="admin-filter">{t("admin.filter")}</label>
                <select id="admin-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">{t("admin.allRoles")}</option><option value="member">{t("settings.member")}</option><option value="admin">{t("admin.adminRole")}</option></select>
              </div>
              <AdminUsersPanel query={query} role={filter} />
            </section>
          ) : section === "moderation" ? (
            <section className="rounded-xl border bg-card p-5 sm:p-7">
              <label className="sr-only" htmlFor="admin-search">{t("admin.search")}</label>
              <input id="admin-search" type="search" placeholder={t("admin.search")} value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-md" />
              <ContactInbox query={query} />
            </section>
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
