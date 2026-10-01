import { Trash2 } from "lucide-react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { ItemForm } from "@/features/items/item-form"
import { useDeleteItem, useItems } from "@/features/items/use-items"
import { formatDate } from "@/lib/format"
import { SITE } from "@/lib/site"

export function ItemsPage() {
  const { user, backend } = useAuth()
  const items = useItems()
  const remove = useDeleteItem()

  return (
    <Container className="py-10">
      <title>{`Notes — ${SITE.name}`}</title>

      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Notes</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Bonjour {user?.displayName}. Cette page montre le parcours complet à reproduire : lister, créer, supprimer
            et ouvrir le détail d'un objet.
          </p>
        </div>
        <Badge variant={backend === "supabase" ? "default" : "highlight"}>
          {backend === "supabase" ? "Supabase connecté" : "Mode démo local"}
        </Badge>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="liste-titre">
          <h2 id="liste-titre" className="mb-4 text-xl font-semibold">
            Toutes les notes
          </h2>

          {items.isPending && (
            <div className="grid gap-3" aria-busy="true" aria-label="Chargement des notes">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

          {items.isError && (
            <div role="alert" className="rounded-lg border border-destructive/40 p-4">
              <p className="font-medium">Impossible de charger les notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{items.error.message}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => items.refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {items.isSuccess && items.data.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Aucune note pour l'instant. Publiez la première avec le formulaire.
            </p>
          )}

          {items.isSuccess && items.data.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {items.data.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link to={`/app/items/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Par {item.author_name ?? "un utilisateur"}, le {formatDate(item.created_at)}
                    </p>
                    {item.content && <p className="mt-2 line-clamp-2 text-sm">{item.content}</p>}
                  </div>
                  <Badge variant={item.is_public ? "secondary" : "outline"}>
                    {item.is_public ? "Publique" : "Privée"}
                  </Badge>
                  {item.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer la note « ${item.title} »`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="form-titre">
          <h2 id="form-titre" className="mb-4 text-xl font-semibold">
            Nouvelle note
          </h2>
          <ItemForm />
        </aside>
      </div>
    </Container>
  )
}
