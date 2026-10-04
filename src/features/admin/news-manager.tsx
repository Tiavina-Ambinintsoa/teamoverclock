import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { ContentTranslationButton } from "@/features/i18n/content-translation-button"
import type { FieldTranslations } from "@/features/i18n/content-translations"
import type { NewsImportance, NewsItem, NewsStatus } from "@/lib/db-types"
import { env } from "@/lib/env"
import { LOCALE_OPTIONS, useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { uniqueSlug } from "@/lib/slug"
import { supabase } from "@/lib/supabase"

/** Colonnes à mettre à jour pour passer une actualité à `target` (publication = relue par un administrateur). */
export function newsTransition(target: NewsStatus, reviewerId: string, now: Date = new Date()) {
  if (target === "published") return { status: target, reviewed_by: reviewerId, published_at: now.toISOString() }
  return { status: target }
}

interface NewsDraft {
  title: string
  summary: string
  body: string
  category: string
  importance: NewsImportance
  validUntil: string
  translations: FieldTranslations
}

/** D06 — rédaction et modération des actualités : brouillon → relecture → publication par un administrateur. */
export function NewsManager({ scope }: { scope: "all" | "mine" }) {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const [editing, setEditing] = useState<NewsItem | "new" | null>(null)

  const news = useQuery({
    queryKey: ["manage-news", scope, user?.id],
    queryFn: async (): Promise<NewsItem[]> => {
      if (!supabase) return []
      const rows = unwrap(await supabase.from("news").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(100), []) as NewsItem[]
      return scope === "all" ? rows : rows.filter((n) => n.service_id && user?.serviceIds.includes(n.service_id))
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["manage-news"] })
    await queryClient.invalidateQueries({ queryKey: ["news"] })
  }

  const transition = useMutation({
    mutationFn: async (input: { id: string; target: NewsStatus }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("news").update(newsTransition(input.target, user.id)).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Statut mis à jour.", "Status updated."))
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const save = useMutation({
    mutationFn: async (input: { id: string | null; draft: NewsDraft; submit: boolean }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const serviceId = user.serviceIds[0] ?? services.data?.[0]?.id ?? null
      const values = {
        title: input.draft.title.trim(),
        summary: input.draft.summary.trim(),
        body: input.draft.body.trim(),
        category: input.draft.category.trim() || "general",
        importance: input.draft.importance,
        translations: input.draft.translations,
        valid_until: input.draft.validUntil ? new Date(input.draft.validUntil).toISOString() : null,
      }
      if (input.id) {
        const { error } = await supabase.from("news").update({ ...values, ...(input.submit ? { status: "pending_review" } : {}) }).eq("id", input.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from("news").insert({
          ...values, slug: uniqueSlug(values.title), service_id: serviceId, author_id: user.id,
          status: input.submit ? "pending_review" : "draft",
        })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: async () => {
      toast.success(tx("Actualité enregistrée.", "News saved."))
      setEditing(null)
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const canPublish = (n: NewsItem) => Boolean(user?.isAdmin || (n.service_id && user?.serviceIds.includes(n.service_id) && user.profileRole === "service_admin"))

  return (
    <Container className="max-w-5xl">
      <title>{tx("Actualités du service", "Service news")}</title>
      <PageHeader
        eyebrow={scope === "all" ? tx("Administration", "Administration") : tx("Espace agent", "Agent workspace")}
        title={scope === "all" ? tx("Modération des actualités", "News moderation") : tx("Actualités du service", "Service news")}
        description={tx("Les annonces sont relues par un administrateur avant publication.", "Announcements are reviewed by an administrator before publication.")}
        actions={<Button onClick={() => setEditing("new")}>{tx("Nouvelle actualité", "New item")}</Button>}
      />
      <DataState data={news.data} isLoading={news.isLoading} error={news.error} onRetry={() => void news.refetch()} emptyTitle={tx("Aucune actualité", "No news")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.category}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="news" value={n.status} />
                  {n.importance !== "normal" && <StatusBadge kind="importance" value={n.importance} />}
                  {(n.status === "draft" || n.status === "pending_review") && <Button size="sm" variant="outline" onClick={() => setEditing(n)}>{tx("Modifier", "Edit")}</Button>}
                  {canPublish(n) && n.status !== "published" && <Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ id: n.id, target: "published" })}>{tx("Publier", "Publish")}</Button>}
                  {canPublish(n) && n.status === "published" && <Button size="sm" variant="outline" disabled={transition.isPending} onClick={() => transition.mutate({ id: n.id, target: "archived" })}>{tx("Archiver", "Archive")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {editing && <NewsDialog item={editing === "new" ? null : editing} busy={save.isPending} onClose={() => setEditing(null)} onSave={(draft, submit) => save.mutate({ id: editing === "new" ? null : editing.id, draft, submit })} />}
    </Container>
  )
}

function NewsDialog({ item, busy, onClose, onSave }: { item: NewsItem | null; busy: boolean; onClose: () => void; onSave: (draft: NewsDraft, submit: boolean) => void }) {
  const { tx, locale } = useLocale()
  const [translationLocale, setTranslationLocale] = useState(locale)
  const [draft, setDraft] = useState<NewsDraft>({
    title: item?.title ?? "", summary: item?.summary ?? "", body: item?.body ?? "", category: item?.category ?? "",
    importance: item?.importance ?? "normal", validUntil: item?.valid_until ? item.valid_until.slice(0, 10) : "",
    translations: item?.translations ?? {},
  })
  const set = <K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) => setDraft((d) => ({
    ...d,
    [key]: value,
    ...(key === "title" || key === "summary" || key === "body" || key === "category"
      ? { translations: { ...d.translations, [key]: {} } }
      : {}),
  }))
  const valid = draft.title.trim().length >= 3 && draft.summary.trim().length >= 3 && draft.body.trim().length >= 3

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? tx("Modifier l'actualité", "Edit news") : tx("Nouvelle actualité", "New news item")}</DialogTitle>
          <DialogDescription>{tx("Enregistrez un brouillon ou envoyez-le en relecture.", "Save a draft or send it for review.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label htmlFor="n-title">{tx("Titre", "Title")}</Label><Input id="n-title" value={draft.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="n-summary">{tx("Résumé", "Summary")}</Label><Textarea id="n-summary" value={draft.summary} onChange={(e) => set("summary", e.target.value)} /></div>
          <div className="grid gap-1"><Label htmlFor="n-body">{tx("Contenu", "Content")}</Label><Textarea id="n-body" className="min-h-32" value={draft.body} onChange={(e) => set("body", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1"><Label htmlFor="n-cat">{tx("Catégorie", "Category")}</Label><Input id="n-cat" value={draft.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div className="grid gap-1">
              <Label htmlFor="n-imp">{tx("Importance", "Importance")}</Label>
              <Select id="n-imp" value={draft.importance} onChange={(e) => set("importance", e.target.value as NewsImportance)}>
                <option value="normal">normal</option><option value="important">important</option><option value="urgent">urgent</option>
              </Select>
            </div>
            <div className="grid gap-1"><Label htmlFor="n-until">{tx("Valable jusqu'au", "Valid until")}</Label><Input id="n-until" type="date" value={draft.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></div>
          </div>
          <div className="grid gap-2 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{tx("La source est en", "Source language")}: {locale}</p>
            <ContentTranslationButton
              fields={{ title: draft.title, summary: draft.summary, body: draft.body, category: draft.category }}
              onTranslated={(translations) => setDraft((current) => ({ ...current, translations }))}
            />
            {!env.enableAIChat && <p className="text-xs text-muted-foreground">{tx("L’administrateur doit activer le module IA pour traduire.", "An administrator must enable the AI feature to translate.")}</p>}
            {Object.keys(draft.translations).length > 0 && (
              <div className="grid gap-3 border-t pt-3">
                <output className="text-sm text-muted-foreground">{tx("Six versions linguistiques enregistrées dans le brouillon. Relisez-les avant publication.", "Six language versions are saved with this draft. Review them before publishing.")}</output>
                <div className="grid gap-1">
                  <Label htmlFor="n-translation-locale">{tx("Relire la traduction", "Review translation")}</Label>
                  <Select id="n-translation-locale" value={translationLocale} onChange={(event) => setTranslationLocale(event.target.value as typeof translationLocale)}>
                    {LOCALE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </div>
                {(["title", "summary", "body", "category"] as const).map((field) => (
                  <div key={field} className="grid gap-1">
                    <Label htmlFor={`n-translation-${field}`}>{tx(
                      field === "title" ? "Titre traduit" : field === "summary" ? "Résumé traduit" : field === "body" ? "Contenu traduit" : "Catégorie traduite",
                      `Translated ${field}`,
                    )}</Label>
                    {field === "title" || field === "category" ? (
                      <Input
                        id={`n-translation-${field}`}
                        value={draft.translations[field]?.[translationLocale] ?? ""}
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          translations: {
                            ...current.translations,
                            [field]: { ...current.translations[field], [translationLocale]: event.target.value },
                          },
                        }))}
                      />
                    ) : (
                      <Textarea
                        id={`n-translation-${field}`}
                        value={draft.translations[field]?.[translationLocale] ?? ""}
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          translations: {
                            ...current.translations,
                            [field]: { ...current.translations[field], [translationLocale]: event.target.value },
                          },
                        }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !valid} onClick={() => onSave(draft, false)}>{tx("Enregistrer le brouillon", "Save draft")}</Button>
            <Button disabled={busy || !valid} onClick={() => onSave(draft, true)}>{tx("Envoyer en relecture", "Send for review")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
