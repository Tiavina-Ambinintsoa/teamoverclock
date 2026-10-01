/**
 * fetch robuste pour consommer une API imposée ou externe pendant le concours :
 * délai maximal, JSON, erreurs en français exploitables dans l'interface.
 * Astuce : associez-le à useQuery (TanStack Query) pour le cache, le chargement et les erreurs.
 */
export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.body = body
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function http<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15_000, ...options } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const headers = new Headers(options.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")

  try {
    const response = await fetch(url, { ...options, headers, signal: options.signal ?? controller.signal })
    const text = await response.text()
    const body = text ? parseJson(text) : null
    if (!response.ok) throw new HttpError(response.status, `Le serveur a refusé la requête (${response.status})`, body)
    return body as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(0, "Le serveur met trop de temps à répondre")
    }
    throw new HttpError(0, "Connexion impossible : vérifiez votre réseau")
  } finally {
    clearTimeout(timer)
  }
}
