/**
 * localStorage sécurisé : ne plante jamais (navigation privée, quota, iframe, SSR).
 * Utilisez-le à la place de localStorage.* partout.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
}
