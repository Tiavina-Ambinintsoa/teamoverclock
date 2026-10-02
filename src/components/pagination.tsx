import { ArrowLeft, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
  label?: string
}

/** Pagination compacte contrôlée par la page parente. Les lignes restent à charger côté API/DB. */
export function Pagination({ page, pageCount, onPageChange, className, label = "Pagination" }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label={label} className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <Button type="button" variant="outline" size="sm" shape="pill" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ArrowLeft aria-hidden /> Précédente
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">Page <span className="font-medium text-foreground">{page}</span> sur {pageCount}</p>
      <Button type="button" variant="outline" size="sm" shape="pill" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Suivante <ArrowRight aria-hidden />
      </Button>
    </nav>
  )
}