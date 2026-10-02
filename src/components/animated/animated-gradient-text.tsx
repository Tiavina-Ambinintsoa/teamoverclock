import type { ComponentProps, CSSProperties } from "react"
import { cn } from "@/lib/utils"

type AnimatedGradientTextProps = ComponentProps<"span"> & {
  speed?: number
  colorFrom?: string
  colorTo?: string
}

export function AnimatedGradientText({ className, style, speed = 4, colorFrom = "var(--primary)", colorTo = "var(--highlight)", ...props }: AnimatedGradientTextProps) {
  return (
    <span
      className={cn("animated-gradient-text", className)}
      style={{ ...style, "--gradient-speed": `${Math.max(0.5, speed)}s`, "--gradient-from": colorFrom, "--gradient-to": colorTo } as CSSProperties}
      {...props}
    />
  )
}
