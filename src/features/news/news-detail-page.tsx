import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link as LinkIcon } from "lucide-react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { isNewsActive, useNewsItem } from "@/features/city/city-queries"
import { localizedField } from "@/features/i18n/content-translations"
import { useLocale } from "@/lib/locale"
import { formatDate, formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

interface CommentRow {
  id: string
  author_id: string
  body: string
  status: "visible" | "hidden"
  created_at: string
}

/** D06 — page de détail : contenu, partage du lien, commentaires modérés. */
export function NewsDetailPage() {
  const { slug } = useParams()
  const { tx, tag, locale } = useLocale()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const news = useNewsItem(slug)
  const item = news.data
  const title = item ? localizedField(item.translations, "title", locale, item.title) : ""
  const summary = item ? localizedField(item.translations, "summary", locale, item.summary) : ""
  const content = item ? localizedField(item.translations, "body", locale, item.body) : ""
  const [body, setBody] = useState("")

  const comments = useQuery({
    queryKey: ["news-comments", item?.id],
    enabled: Boolean(item?.id && supabase),
    queryFn: async () => {
      if (!supabase || !item) return { rows: [] as CommentRow[], names: {} as Record<string, string> }
      const rows = unwrap(
        await supabase.from("news_comments").select("id,author_id,body,status,created_at").eq("news_id", item.id).order("created_at"),
        []
      ) as CommentRow[]
      const ids = Array.from(new Set(rows.map((r) => r.author_id)))
      const names: Record<string, string> = {}
      if (ids.length) {
        const profiles = unwrap(await supabase.from("public_profiles").select("id,display_name").in("id", ids), []) as { id: string; display_name: string | null }[]
        for (const p of profiles) names[p.id] = p.display_name ?? "—"
      }
      return { rows, names }
    },
  })

  const canModerate = Boolean(user && (user.isAdmin || (item?.service_id && user.serviceIds.includes(item.service_id))))

  const post = useMutation({
    mutationFn: async () => {
      if (!supabase || !item) throw new Error("Supabase")
      const { error } = await supabase.from("news_comments").insert({ news_id: item.id, body: body.trim() })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      setBody("")
      await queryClient.invalidateQueries({ queryKey: ["news-comments"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const moderate = useMutation({
    mutationFn: async (input: { id: string; status: "visible" | "hidden" }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("news_comments").update({ status: input.status, moderated_by: user.id }).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["news-comments"] }),
    onError: (error: Error) => toast.error(error.message),
  })

  if (news.isLoading) return <PageLoader />
  if (!item) {
    return (
      <Container className="py-16">
        <title>{tx("Actualité introuvable", "News not found")}</title>
        <div role="alert" className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold"><AuroraTitle>{tx("Actualité introuvable", "News not found")}</AuroraTitle></h1>
          <Button asChild className="mt-4"><Link to="/news">{tx("Toutes les actualités", "All news")}</Link></Button>
        </div>
      </Container>
    )
  }

  const active = isNewsActive(item)
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(tx("Lien copié.", "Link copied."))
    } catch {
      toast.error(tx("Copie impossible.", "Unable to copy."))
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (body.trim()) post.mutate()
  }

  return (
    <Container className="max-w-3xl py-10">
      <title>{title}</title>
      <nav aria-label={tx("Fil d'Ariane", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <Link to="/news" className="underline-offset-4 hover:underline">{tx("Actualités", "News")}</Link> / {title}
      </nav>
      <article>
        <header className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {item.importance !== "normal" && <StatusBadge kind="importance" value={item.importance} />}
            <Badge variant="secondary">{localizedField(item.translations, "category", locale, item.category)}</Badge>
            {!active && <Badge variant="outline">{tx("Archivée", "Archived")}</Badge>}
          </div>
          <h1 className="font-display text-3xl font-semibold"><AuroraTitle>{title}</AuroraTitle></h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx("Publiée le", "Published on")} {formatDate(item.published_at, tag)}
            {item.valid_until ? ` · ${tx("valable jusqu'au", "valid until")} ${formatDate(item.valid_until, tag)}` : ""}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void copyLink()}><LinkIcon aria-hidden />{tx("Copier le lien", "Copy link")}</Button>
        </header>
        <p className="text-lg text-muted-foreground">{summary}</p>
        <div className="mt-4 whitespace-pre-line leading-7">{content}</div>
      </article>

      <section aria-labelledby="comments-title" className="mt-10">
        <h2 id="comments-title" className="mb-3 text-xl font-semibold">{tx("Commentaires", "Comments")}</h2>
        <ul className="grid gap-3">
          {(comments.data?.rows ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border bg-card p-3 text-sm">
              <p className="font-medium">{comments.data?.names[c.author_id] ?? "—"} <span className="font-normal text-muted-foreground">· {formatDateTime(c.created_at, tag)}</span></p>
              <p className={c.status === "hidden" ? "mt-1 italic text-muted-foreground" : "mt-1"}>{c.status === "hidden" ? tx("Commentaire masqué par la modération.", "Comment hidden by moderation.") : c.body}</p>
              {canModerate && (
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => moderate.mutate({ id: c.id, status: c.status === "hidden" ? "visible" : "hidden" })}>
                  {c.status === "hidden" ? tx("Rétablir", "Restore") : tx("Masquer", "Hide")}
                </Button>
              )}
            </li>
          ))}
          {(comments.data?.rows.length ?? 0) === 0 && <li className="text-sm text-muted-foreground">{tx("Aucun commentaire pour le moment.", "No comments yet.")}</li>}
        </ul>
        {user && !user.isDemo && item.status === "published" ? (
          <form onSubmit={submit} className="mt-4 grid gap-2">
            <label htmlFor="comment" className="text-sm font-medium">{tx("Ajouter un commentaire", "Add a comment")}</label>
            <Textarea id="comment" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} required />
            <Button type="submit" disabled={post.isPending || !body.trim()} className="w-fit">{tx("Publier", "Post")}</Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/connexion" className="underline underline-offset-4">{tx("Connectez-vous", "Log in")}</Link> {tx("pour commenter.", "to comment.")}
          </p>
        )}
      </section>
    </Container>
  )
}
