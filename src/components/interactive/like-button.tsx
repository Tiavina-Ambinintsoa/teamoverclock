import { useState } from "react"
import { Heart } from "lucide-react"

import { cn } from "@/lib/utils"

/** Bouton "j'aime" : bascule au clic, petit éclat de particules à l'activation. Sans dépendance. */
export function LikeButton({
  defaultLiked = false,
  label = "J'aime",
  onChange,
}: {
  defaultLiked?: boolean
  label?: string
  onChange?: (liked: boolean) => void
}) {
  const [liked, setLiked] = useState(defaultLiked)
  const [burstKey, setBurstKey] = useState(0)

  const toggle = () => {
    const next = !liked
    setLiked(next)
    onChange?.(next)
    if (next) setBurstKey((k) => k + 1) // change la key -> les particules rejouent leur animation
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={label}
      className="group relative inline-flex size-10 items-center justify-center rounded-full hover:bg-accent"
    >
      <Heart
        className={cn(
          "size-5 transition-all duration-200",
          liked ? "scale-110 fill-destructive text-destructive" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {liked && (
        <span key={burstKey} aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 size-1 rounded-full bg-destructive"
              style={{
                animation: "like-burst 550ms ease-out forwards",
                // @ts-expect-error -- propriété CSS personnalisée consommée par le @keyframes ci-dessous
                "--angle": `${i * 60}deg`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  )
}
