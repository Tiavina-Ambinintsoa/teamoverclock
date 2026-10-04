export function parseFavoritePages(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter(
      (path): path is string => typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"),
    ))]
  } catch {
    return []
  }
}

export function toggleFavoritePage(paths: string[], path: string): string[] {
  return paths.includes(path) ? paths.filter((current) => current !== path) : [...paths, path]
}
