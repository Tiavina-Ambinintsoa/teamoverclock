import type { ComponentProps } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex w-full items-center">
      <select className={cn("h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden />
    </span>
  )
}
