import type { ReactNode } from "react"

import { AuroraText, TextAnimate } from "@/components/magic-ui"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}

const AURORA_COLORS = ["var(--primary)", "var(--chart-2)", "var(--highlight)", "var(--primary)"]

/** Entête de page cohérente : titre en AuroraText, eyebrow et description animés (Magic UI). */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-primary">
            {typeof eyebrow === "string" ? (
              <TextAnimate as="span" by="character" animation="blurIn" duration={0.5}>
                {eyebrow}
              </TextAnimate>
            ) : (
              eyebrow
            )}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {typeof title === "string" ? <AuroraText colors={AURORA_COLORS}>{title}</AuroraText> : title}
        </h1>
        {description && (
          <div className="mt-2 max-w-2xl text-muted-foreground">
            {typeof description === "string" ? (
              <TextAnimate as="p" by="word" animation="blurInUp" delay={0.15}>
                {description}
              </TextAnimate>
            ) : (
              description
            )}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
