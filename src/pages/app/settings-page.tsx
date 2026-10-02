import { Container } from "@/components/layout/container"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/theme-switcher"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export function SettingsPage() {
  const { user, backend } = useAuth()
  const { t } = useLocale()

  return (
    <Container className="px-4 sm:px-6">
      <title>{t("app.settings")} — {SITE.name}</title>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("app.settings")}</h1>
        <p className="mt-2 text-muted-foreground">{t("settings.description")}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{t("settings.profile")}</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">{t("settings.name")}</dt><dd className="mt-1 font-medium">{user?.displayName}</dd></div>
            <div><dt className="text-muted-foreground">{t("settings.email")}</dt><dd className="mt-1 font-medium">{user?.email}</dd></div>
            <div><dt className="text-muted-foreground">{t("settings.role")}</dt><dd className="mt-1 font-medium">{user?.isAdmin ? t("settings.admin") : t("settings.member")}</dd></div>
            <div><dt className="text-muted-foreground">{t("settings.connection")}</dt><dd className="mt-1 font-medium">{backend === "supabase" ? t("settings.connected") : t("settings.local")}</dd></div>
          </dl>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{t("settings.appearance")}</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <span className="text-sm">{t("settings.mode")}</span><ModeToggle />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
            <span className="text-sm">{t("settings.language")}</span><LanguageSwitcher />
          </div>
        </section>
      </div>
    </Container>
  )
}
