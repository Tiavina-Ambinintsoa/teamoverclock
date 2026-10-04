import { useState } from "react"
import { ArrowUpRight, Download, FileText, Images, MessageCircle, Users } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { buildReport, downloadReport } from "@/features/dashboard/report-generator"
import { listItems } from "@/features/items/items-api"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

const cards = [
  { title: "dashboard.contents", icon: FileText, hint: "dashboard.contentsHint" },
  { title: "dashboard.media", icon: Images, hint: "dashboard.mediaHint" },
  { title: "dashboard.members", icon: Users, hint: "dashboard.membersHint" },
  { title: "dashboard.interactions", icon: MessageCircle, hint: "dashboard.interactionsHint" },
]

export function DashboardPage() {
  const { user, backend } = useAuth()
  const { t, locale, tag } = useLocale()
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    if (!user) return
    setBusy(true)
    try {
      const items = await listItems(user)
      const content = buildReport(user, items, locale, backend, tag)
      downloadReport(content, locale)
      toast.success(t("dashboard.reportReady"))
    } catch {
      toast.error(t("common.loading"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="px-4 sm:px-6">
      <title>{t("dashboard.title")} — {SITE.name}</title>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{t("dashboard.greeting")} {user?.displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl"><AuroraTitle>{t("dashboard.title")}</AuroraTitle></h1>
          <p className="mt-2 text-muted-foreground">{t("dashboard.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={busy} onClick={handleDownload}>
            <Download className="size-4" aria-hidden />
            {t("dashboard.downloadReport")}
          </Button>
          <Link to="/app" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            {t("app.notes")} <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <section aria-label={t("dashboard.title")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, icon: Icon, hint }) => (
          <article key={title} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm font-medium">{t(title)}</span><Icon className="size-4" aria-hidden />
            </div>
            <Skeleton className="mt-5 h-8 w-20" />
            <p className="mt-3 text-xs text-muted-foreground">{t(hint)}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">{t("dashboard.activity")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.activityText")}</p>
          <div className="mt-6 grid h-48 place-items-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
            {t("dashboard.chart")}
          </div>
        </article>
        <article className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">{t("dashboard.todos")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.todosText")}</p>
          <div className="mt-6 grid gap-3">
            <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
          </div>
        </article>
      </section>
    </Container>
  )
}
