import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function Accordion({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-2", className)} {...props} />
}

export function AccordionItem({ className, ...props }: ComponentProps<"details">) {
  return <details className={cn("group rounded-xl border bg-card px-4", className)} {...props} />
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<"summary">) {
  return (
    <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden", className)} {...props}>
      {children}<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
    </summary>
  )
}

export function AccordionContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("border-t pb-4 pt-3 text-sm text-muted-foreground", className)} {...props} />
}
