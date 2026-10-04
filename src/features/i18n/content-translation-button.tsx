import { useState } from "react"
import { Languages } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { FieldTranslations } from "@/features/i18n/content-translations"
import { env } from "@/lib/env"
import { LOCALE_OPTIONS, useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

export function ContentTranslationButton({
  fields,
  onTranslated,
}: {
  fields: Record<string, string>
  onTranslated: (translations: FieldTranslations) => void
}) {
  const { tx, locale } = useLocale()
  const [busy, setBusy] = useState(false)

  const translate = async () => {
    if (!env.enableAIChat) {
      toast.error(tx("La traduction IA n’est pas activée sur ce site.", "AI translation is not enabled on this site."))
      return
    }
    if (!supabase) {
      toast.error(tx("La traduction IA nécessite un compte connecté.", "AI translation requires a signed-in account."))
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: { fields, sourceLocale: locale },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.translations || typeof data.translations !== "object") {
        throw new Error(tx("La réponse de traduction est illisible.", "The translation response is not valid."))
      }
      onTranslated(data.translations as FieldTranslations)
      toast.success(tx("Traductions créées. Relisez-les avant de publier.", "Translations created. Review them before publishing."))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : tx("Impossible de traduire ce contenu.", "Could not translate this content.")
      toast.error(tx("La traduction a échoué.", "Translation failed."), { description: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={!env.enableAIChat || busy || Object.values(fields).every((value) => !value.trim())} onClick={() => void translate()}>
      <Languages aria-hidden />
      {busy ? tx("Traduction…", "Translating…") : tx("Traduire avec l’IA dans les 6 langues", "Translate with AI into all 6 languages")}
      <span className="sr-only">: {LOCALE_OPTIONS.map((option) => option.label).join(", ")}</span>
    </Button>
  )
}
