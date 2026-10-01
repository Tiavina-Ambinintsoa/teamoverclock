/**
 * Convertit n'importe quelle couleur CSS valide (y compris oklch(), utilisé par nos thèmes)
 * en RGB 0-255. Nécessaire pour transmettre les couleurs du thème à des API qui ne comprennent
 * pas oklch() nativement (three.js, canvas 2D bas niveau, exports d'images).
 *
 * Méthode : on laisse le NAVIGATEUR faire la conversion en peignant 1 pixel sur un canvas
 * (fiable à 100 %, quel que soit l'espace colorimétrique) plutôt que de réimplémenter oklch -> sRGB.
 */
export interface RGB {
  r: number
  g: number
  b: number
}

let ctx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const created = canvas.getContext("2d", { willReadFrequently: true })
    if (!created) throw new Error("Contexte canvas 2D indisponible")
    ctx = created
  }
  return ctx
}

/** "oklch(0.55 0.11 205)", "#0e7490", "rebeccapurple"... -> { r, g, b } (0-255) */
export function resolveCssColor(color: string): RGB {
  const c = getCtx()
  c.clearRect(0, 0, 1, 1)
  c.fillStyle = color
  c.fillRect(0, 0, 1, 1)
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

/** Lit une variable CSS (--primary...) sur un élément (par défaut <html>, pour suivre le thème actif) et la résout en RGB. */
export function resolveThemeColor(variableName: string, element: HTMLElement = document.documentElement): RGB {
  const raw = getComputedStyle(element).getPropertyValue(variableName).trim()
  return resolveCssColor(raw || "black")
}

export function rgbToHex({ r, g, b }: RGB): string {
  const hex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
