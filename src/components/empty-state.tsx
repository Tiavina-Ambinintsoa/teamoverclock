import { useId, type ReactNode } from "react"
import { Inbox, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: LucideIcon
  className?: string
}

/** État vide accessible, prêt pour une liste, une recherche ou un tableau de bord. */
export function EmptyState({ title, description, action, icon: Icon = Inbox, className }: EmptyStateProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div
      role="status"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("grid justify-items-center rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center", className)}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 id={titleId} className="mt-4 font-display text-lg font-semibold">{title}</h2>
      {description && <p id={descriptionId} className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}