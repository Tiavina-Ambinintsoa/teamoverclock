import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/lib/locale"
import { statusLabel, statusTone, type StatusKind } from "@/lib/status-labels"

export interface StatusBadgeProps {
  kind: StatusKind
  value: string
  className?: string
}

/** Pastille de statut : libellé traduit + couleur selon la gravité (jamais la couleur seule : le texte est affiché). */
export function StatusBadge({ kind, value, className }: StatusBadgeProps) {
  const { locale } = useLocale()
  return (
    <Badge variant={statusTone(kind, value)} className={className}>
      {statusLabel(kind, value, locale)}
    </Badge>
  )
}
