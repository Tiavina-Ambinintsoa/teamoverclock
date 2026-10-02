import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function BentoGrid({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid auto-rows-[minmax(13rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} {...props} />
}

interface BentoCardProps extends Omit<ComponentProps<"article">, "title"> {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  background?: ReactNode
  action?: ReactNode
}

/** Carte bento légère inspirée du motif Magic UI, sans dépendance d'animation. */
export function BentoCard({ className, icon, title, description, background, action, children, ...props }: BentoCardProps) {
  return (
    <article className={cn("group relative isolate flex min-h-52 flex-col justify-between overflow-hidden rounded-3xl border bg-card p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl sm:p-6", className)} {...props}>
      {background && <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">{background}</div>}
      <div>
        {icon && <div className="mb-4 grid size-10 place-items-center rounded-2xl border bg-background/80 text-primary shadow-sm">{icon}</div>}
        {title && <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>}
        {description && <p className="mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      {action && <div className="mt-5 text-sm font-medium text-primary">{action}</div>}
    </article>
  )
}
