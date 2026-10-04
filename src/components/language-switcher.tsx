import { useAuth } from "@/features/auth/auth-context"
import { isLocale, LOCALE_OPTIONS, useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const { user, refreshProfile } = useAuth()

  const onChange = async (value: string) => {
    if (!isLocale(value)) return
    setLocale(value)
    if (!user || user.isDemo || !supabase) return

    try {
      const { error } = await supabase.from("profiles").update({ locale: value }).eq("id", user.id)
      if (error) throw error
      await refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.languageSaveFailed"))
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="sr-only">{t("nav.language")}</span>
      <select
        aria-label={t("nav.language")}
        value={locale}
        onChange={(event) => void onChange(event.currentTarget.value)}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
