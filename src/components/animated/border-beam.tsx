import type { CSSProperties } from "react"

export function BorderBeam({ duration = 7, colorFrom = "var(--primary)", colorTo = "var(--highlight)", className = "" }: {
  duration?: number
  colorFrom?: string
  colorTo?: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`magic-border-beam ${className}`.trim()}
      style={{ "--beam-duration": `${Math.max(2, duration)}s`, "--beam-from": colorFrom, "--beam-to": colorTo } as CSSProperties}
    />
  )
}
