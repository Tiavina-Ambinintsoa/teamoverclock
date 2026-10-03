/** Transforme un titre en slug d'URL : minuscules, sans accents, tirets. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/** Slug unique : le titre + un suffixe court dérivé de l'horodatage (évite les collisions sur la colonne unique). */
export function uniqueSlug(title: string, now: number = Date.now()): string {
  const base = slugify(title) || "actualite"
  return `${base}-${now.toString(36).slice(-5)}`
}
