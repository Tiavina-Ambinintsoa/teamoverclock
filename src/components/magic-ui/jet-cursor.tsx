import { SmoothCursor } from "@/components/magic-ui/smooth-cursor"
import { useTheme } from "@/components/theme-context"

/** Chasseur spatial pointant vers le haut : SmoothCursor le fait pivoter dans le sens du déplacement. */
function JetSprite() {
  return (
    <svg width="34" height="46" viewBox="0 0 34 46" fill="none" aria-hidden="true" style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}>
      <defs>
        <linearGradient id="jet-body" x1="17" y1="0" x2="17" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.97 0.004 250)" />
          <stop offset="1" stopColor="oklch(0.82 0.13 215)" />
        </linearGradient>
        <linearGradient id="jet-flame" x1="17" y1="34" x2="17" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.82 0.13 215)" />
          <stop offset="0.45" stopColor="oklch(0.7 0.21 38)" />
          <stop offset="1" stopColor="oklch(0.7 0.21 38 / 0)" />
        </linearGradient>
      </defs>
      <path d="M17 36 L12.5 33 L17 46 L21.5 33 Z" fill="url(#jet-flame)" />
      <path d="M17 1 L21 13 L33 29 L33 33 L22 29.5 L20 38 L17 36 L14 38 L12 29.5 L1 33 L1 29 L13 13 Z" fill="url(#jet-body)" stroke="oklch(0.15 0.04 265)" strokeWidth="1" strokeLinejoin="round" />
      <path d="M17 7 L19 15 L17 19 L15 15 Z" fill="oklch(0.15 0.04 265)" opacity="0.85" />
    </svg>
  )
}

/** Actif seulement avec le thème Nova Terra : il masque le curseur natif, les autres thèmes restent intacts. */
export function JetCursor() {
  const { preset } = useTheme()
  if (preset !== "nova-terra") return null
  return <SmoothCursor cursor={<JetSprite />} />
}
