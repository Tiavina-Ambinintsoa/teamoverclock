import type { ComponentProps, CSSProperties } from "react"

import { useReveal } from "@/hooks/use-reveal"
import { cn } from "@/lib/utils"

type RevealProps = ComponentProps<"div"> & { delayMs?: number }

/** Révélation au défilement avec délai d'échelonnement et respect de prefers-reduced-motion. */
export function Reveal({ className, delayMs = 0, style, ...props }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const revealStyle = { ...style, "--reveal-delay": `${delayMs}ms` } as CSSProperties & { "--reveal-delay": string }

  return (
    <div
      ref={ref}
      data-visible={visible ? "true" : "false"}
      className={cn("scroll-reveal", visible && "scroll-reveal-visible", className)}
      style={revealStyle}
      {...props}
    />
  )
}