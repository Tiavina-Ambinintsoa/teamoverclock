import type { CSSProperties } from "react"

/** Particules CSS décoratives à utiliser avec un parent `relative overflow-hidden`. */
export function MeteorField({ count = 14, className = "" }: { count?: number; className?: string }) {
  const safeCount = Math.max(0, Math.min(40, Math.floor(count)))
  return (
    <div aria-hidden="true" className={`meteor-field ${className}`.trim()}>
      {Array.from({ length: safeCount }, (_, index) => (
        <span
          key={index}
          className="meteor-field__meteor"
          style={{
            "--meteor-x": `${(index * 43 + 13) % 100}%`,
            "--meteor-delay": `${(index * 0.37) % 6}s`,
            "--meteor-duration": `${4 + (index % 5)}s`,
            "--meteor-length": `${34 + (index % 4) * 12}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
