import type { Locale } from "@/lib/locale"

export type FieldTranslations = Record<string, Partial<Record<Locale, string>>>

export function localizedField(
  translations: FieldTranslations | null | undefined,
  field: string,
  locale: Locale,
  original: string,
): string {
  return translations?.[field]?.[locale]?.trim() || original
}

export function localizedStructuredField<T>(
  translations: FieldTranslations | null | undefined,
  field: string,
  locale: Locale,
  original: T,
  isExpected: (value: unknown) => value is T,
): T {
  const translated = translations?.[field]?.[locale]?.trim()
  if (!translated) return original
  try {
    const value: unknown = JSON.parse(translated)
    return isExpected(value) ? value : original
  } catch {
    return original
  }
}
