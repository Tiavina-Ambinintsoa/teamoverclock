import type { CSSProperties, ElementType } from "react"
import { cn } from "@/lib/utils"

type TextRevealProps = {
  text: string
  as?: ElementType
  by?: "word" | "character"
  effect?: "rise" | "blur" | "slide"
  delayMs?: number
  durationMs?: number
  className?: string
}

/** Révélation de texte séquencée, accessible et compatible avec reduced motion. */
export function TextReveal({
  text,
  as: Tag = "span",
  by = "word",
  effect = "rise",
  delayMs = 45,
  durationMs = 560,
  className,
}: TextRevealProps) {
  const parts = by === "character" ? Array.from(text) : text.split(/(\s+)/)

  return (
    <Tag className={cn("text-reveal", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="text-reveal__visual">
        {parts.map((part, index) => (
          <span
            key={`${index}-${part}`}
            className={cn("text-reveal__part", `text-reveal__part--${effect}`)}
            style={{ "--text-delay": `${index * delayMs}ms`, "--text-duration": `${durationMs}ms` } as CSSProperties}
          >
            {part === " " ? "\u00a0" : part}
          </span>
        ))}
      </span>
    </Tag>
  )
}
