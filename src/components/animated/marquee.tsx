import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Marquee({ children, speed = 24, reverse = false, pauseOnHover = true, className }: {
  children: ReactNode
  speed?: number
  reverse?: boolean
  pauseOnHover?: boolean
  className?: string
}) {
  return (
    <div className={cn("marquee", pauseOnHover && "marquee--pause-hover", className)}>
      <div
        className={cn("marquee__track", reverse && "marquee__track--reverse")}
        style={{ "--marquee-speed": `${Math.max(5, speed)}s` } as CSSProperties}
      >
        <div className="marquee__group">{children}</div>
        <div className="marquee__group" aria-hidden="true">{children}</div>
      </div>
    </div>
  )
}
