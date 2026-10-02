import { Fragment, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: ReactNode
  to?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1
          return (
            <Fragment key={index}>
              {index > 0 && <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>}
              <li aria-current={isCurrent ? "page" : undefined} className={cn(isCurrent && "font-medium text-foreground")}>
                {item.to && !isCurrent ? <Link to={item.to} viewTransition className="rounded-sm hover:text-foreground hover:underline">{item.label}</Link> : item.label}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
