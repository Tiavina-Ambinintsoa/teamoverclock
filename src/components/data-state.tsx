import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"

export interface DataStateProps<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  /** Liste vide ? Par défaut : tableau de longueur 0. */
  isEmpty?: (data: T) => boolean
  emptyTitle: string
  emptyDescription?: string
  onRetry?: () => void
  children: (data: T) => ReactNode
}

/** Chargement, erreur (avec bouton Réessayer) et état vide gérés au même endroit. */
export function DataState<T>({ data, isLoading, error, isEmpty, emptyTitle, emptyDescription, onRetry, children }: DataStateProps<T>) {
  const { tx } = useLocale()
  if (isLoading) return <PageLoader label={tx("Chargement…", "Loading…")} />
  if (error) {
    return (
      <div role="alert" className="grid justify-items-center gap-3 rounded-2xl border border-destructive/40 bg-card p-8 text-center">
        <AlertTriangle className="size-6 text-destructive" aria-hidden />
        <p className="font-medium">{tx("Impossible de charger les données.", "Unable to load the data.")}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {onRetry && <Button variant="outline" onClick={onRetry}>{tx("Réessayer", "Try again")}</Button>}
      </div>
    )
  }
  if (data === undefined) return null
  const empty = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <>{children(data)}</>
}
