import { useLocale } from "@/lib/locale"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className="flex items-center gap-1">
      <span className="sr-only">{t("nav.language")}</span>
      <select
        aria-label={t("nav.language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value === "en" ? "en" : "fr")}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>
  )
}
