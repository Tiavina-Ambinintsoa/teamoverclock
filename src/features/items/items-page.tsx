import { useState } from "react"
import { FilePlus, Search, SearchX, Trash2 } from "lucide-react"
import { Link } from "react-router"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import type { Item } from "@/features/items/items-api"
import { ItemForm } from "@/features/items/item-form"
import { useDeleteItem, useItems } from "@/features/items/use-items"
import { formatDate } from "@/lib/format"
import { SITE } from "@/lib/site"

const PAGE_SIZE = 6

export function ItemsPage() {
  const { user, backend } = useAuth()
  const items = useItems()
  const remove = useDeleteItem()
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)

  const search = query.trim().toLocaleLowerCase()
  const allItems = items.data ?? []
  const filteredItems = allItems.filter((item) => `${item.title} ${item.content ?? ""}`.toLocaleLowerCase().includes(search))
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Container className="py-10">
      <title>{`Notes — ${SITE.name}`}</title>

      <PageHeader
        title="Notes"
        description={`Bonjour ${user?.displayName}. Cette page montre un CRUD complet : rechercher, lister, créer, supprimer et ouvrir le détail d'un objet.`}
        className="mb-10"
        actions={<Badge variant={backend === "supabase" ? "default" : "highlight"}>{backend === "supabase" ? "Supabase connecté" : "Mode démo local"}</Badge>}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="liste-titre" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="liste-titre" className="text-xl font-semibold">Toutes les notes <span className="ml-1 text-sm font-normal text-muted-foreground">({filteredItems.length})</span></h2>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Rechercher une note</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Rechercher une note…" className="pl-9" />
            </label>
          </div>

          {items.isPending && (
            <div className="grid gap-3" aria-busy="true" aria-label="Chargement des notes">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

          {items.isError && (
            <div role="alert" className="rounded-xl border border-destructive/40 p-4">
              <p className="font-medium">Impossible de charger les notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{items.error.message}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => items.refetch()}>Réessayer</Button>
            </div>
          )}

          {items.isSuccess && allItems.length === 0 && (
            <EmptyState icon={FilePlus} title="Votre liste est prête" description="Créez la première note avec le formulaire. Elle apparaîtra ici." />
          )}

          {items.isSuccess && allItems.length > 0 && filteredItems.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description="Essayez un autre mot ou effacez la recherche pour retrouver toutes les notes."
              action={<Button type="button" variant="outline" shape="pill" onClick={() => setQuery("")}>Effacer la recherche</Button>}
            />
          )}

          {items.isSuccess && visibleItems.length > 0 && (
            <>
              <ul className="divide-y rounded-xl border bg-card">
                {visibleItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/items/${item.id}`} className="font-medium hover:underline">{item.title}</Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">Par {item.author_name ?? "un utilisateur"}, le {formatDate(item.created_at)}</p>
                      {item.content && <p className="mt-2 line-clamp-2 text-sm">{item.content}</p>}
                    </div>
                    <Badge className="hidden sm:inline-flex" variant={item.is_public ? "secondary" : "outline"}>{item.is_public ? "Publique" : "Privée"}</Badge>
                    {item.user_id === user?.id && (
                      <Button type="button" variant="ghost" size="icon" shape="pill" aria-label={`Supprimer la note « ${item.title} »`} disabled={remove.isPending} onClick={() => setItemToDelete(item)}>
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <Pagination className="mt-4" page={currentPage} pageCount={pageCount} onPageChange={setPage} label="Pages de notes" />
            </>
          )}
        </section>

        <aside aria-labelledby="form-titre">
          <h2 id="form-titre" className="mb-4 text-xl font-semibold">Nouvelle note</h2>
          <ItemForm />
        </aside>
      </div>

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => { if (!open) setItemToDelete(null) }}
        title="Supprimer cette note ?"
        description={<>La note <strong>{itemToDelete?.title}</strong> sera supprimée définitivement.</>}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        onConfirm={async () => { if (itemToDelete) await remove.mutateAsync(itemToDelete.id) }}
      />
    </Container>
  )
}