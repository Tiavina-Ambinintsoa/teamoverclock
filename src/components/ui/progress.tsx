import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends Omit<ComponentProps<"progress">, "value"> {
  value: number
  max?: number
  label?: string
}

export function Progress({ value, max = 100, label, className, ...props }: ProgressProps) {
  const bounded = Math.max(0, Math.min(value, max))
  return (
    <progress value={bounded} max={max} aria-label={label} className={cn("ui-progress h-2 w-full overflow-hidden rounded-full", className)} {...props} />
  )
}
