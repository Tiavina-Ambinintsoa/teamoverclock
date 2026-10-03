import { useMemo } from "react"
import { Link, useSearchParams } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNews } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { formatDate } from "@/lib/query-helpers"
import { cn } from "@/lib/utils"

/** D06 — actualités municipales : récentes d'abord, recherche, catégories, urgences en évidence, archives. */
export function NewsPage() {
  const { tx, tag } = useLocale()
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const category = params.get("category") ?? ""
  const scope = params.get("scope") === "archive" ? "archive" : "active"

  const all = useNews({ scope })
  const news = useNews({ search: q, category, scope })
  const categories = useMemo(() => Array.from(new Set((all.data ?? []).map((n) => n.category))).sort(), [all.data])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  // Les urgences passent devant, puis l'ordre chronologique inverse est conservé.
  const sorted = useMemo(
    () => [...(news.data ?? [])].sort((a, b) => Number(b.importance === "urgent") - Number(a.importance === "urgent")),
    [news.data]
  )

  return (
    <Container className="py-10">
      <title>{tx("Actualités", "News")}</title>
      <PageHeader eyebrow={tx("La ville", "The city")} title={tx("Actualités municipales", "Municipal news")} description={tx("Annonces, changements de service et informations pratiques.", "Announcements, service changes and practical information.")} />

      <search className="mb-6 grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="news-search">{tx("Rechercher une actualité", "Search news")}</Label>
            <Input id="news-search" type="search" className="w-72" value={q} onChange={(e) => update({ q: e.target.value })} />
          </div>
          <fieldset className="flex gap-2"><legend className="sr-only">{tx("Période", "Period")}</legend>
            {(["active", "archive"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={scope === s} onClick={() => update({ scope: s === "archive" ? "archive" : "" })}
                className={cn("rounded-full border px-3 py-1.5 text-sm", scope === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
                {s === "active" ? tx("En cours", "Current") : tx("Archives", "Archive")}
              </button>
            ))}
          </fieldset>
        </div>
        <fieldset className="flex flex-wrap gap-2"><legend className="sr-only">{tx("Catégories", "Categories")}</legend>
          {["", ...categories].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => update({ category: c })}
              className={cn("rounded-full border px-3 py-1.5 text-sm", category === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {c || tx("Toutes", "All")}
            </button>
          ))}
        </fieldset>
      </search>

      <DataState data={sorted} isLoading={news.isLoading} error={news.error} onRetry={() => void news.refetch()} emptyTitle={tx("Aucune actualité", "No news")} emptyDescription={tx("Aucun résultat pour ces critères.", "No result for these filters.")}>
        {(items) => (
          <ul className="grid gap-4 md:grid-cols-2" data-tour="news">
            {items.map((item) => (
              <li key={item.id} className={cn("rounded-xl border bg-card p-5", item.importance === "urgent" && "border-destructive ring-1 ring-destructive/40")}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {item.importance !== "normal" && <StatusBadge kind="importance" value={item.importance} />}
                  <Badge variant="secondary">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(item.published_at, tag)}</span>
                </div>
                <h2 className="text-lg font-semibold"><Link to={`/news/${item.slug}`} className="underline-offset-4 hover:underline">{item.title}</Link></h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
