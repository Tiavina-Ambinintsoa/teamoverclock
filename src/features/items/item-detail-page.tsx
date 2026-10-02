import { ArrowLeft, Copy, Pencil } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageLoader } from "@/components/page-loader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { ItemForm } from "@/features/items/item-form"
import { useItem } from "@/features/items/use-items"
import { formatDate } from "@/lib/format"
import { SITE } from "@/lib/site"

export function ItemDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const item = useItem(id)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Lien copié")
    } catch {
      toast.error("Copie impossible : sélectionnez l'adresse dans la barre du navigateur")
    }
  }

  return (
    <Container className="py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link to="/app">
          <ArrowLeft />
          Retour aux notes
        </Link>
      </Button>

      {item.isPending && <PageLoader />}

      {item.isError && (
        <p role="alert" className="text-destructive">
          {item.error.message}
        </p>
      )}

      {item.isSuccess && item.data === null && (
        <div>
          <title>{`Note introuvable — ${SITE.name}`}</title>
          <h1 className="text-3xl font-semibold">Note introuvable</h1>
          <p className="mt-2 text-muted-foreground">Elle a été supprimée ou elle est privée.</p>
        </div>
      )}

      {item.isSuccess && item.data && (
        <article className="max-w-prose">
          <title>{`${item.data.title} — ${SITE.name}`}</title>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant={item.data.is_public ? "secondary" : "outline"}>
              {item.data.is_public ? "Publique" : "Privée"}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold sm:text-5xl">{item.data.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Par {item.data.author_name ?? "un utilisateur"}, le {formatDate(item.data.created_at)}
          </p>
          {item.data.content && <p className="mt-8 text-lg leading-relaxed whitespace-pre-line">{item.data.content}</p>}
          <div className="mt-10 flex flex-wrap gap-2">
            {user?.id === item.data.user_id && (
              <Button variant="outline" onClick={() => setEditing(!editing)}>
                <Pencil aria-hidden />{editing ? "Fermer l'édition" : "Modifier cette note"}
              </Button>
            )}
            <Button variant="outline" onClick={copyLink}><Copy aria-hidden />Copier le lien</Button>
          </div>
          {editing && user?.id === item.data.user_id && (
            <section aria-labelledby="modifier-note" className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
              <h2 id="modifier-note" className="mb-5 text-xl font-semibold">Modifier la note</h2>
              <ItemForm item={item.data} onCancel={() => setEditing(false)} />
            </section>
          )}
        </article>
      )}
    </Container>
  )
}
