export const API_KEY_PREFIX = "nt_live_"
export const API_KEY_RANDOM_LENGTH = 40
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

type CryptoLike = Pick<Crypto, "getRandomValues" | "subtle">

function resolveCrypto(cryptoImpl?: CryptoLike) {
  const value = cryptoImpl ?? globalThis.crypto
  if (!value) throw new Error("Web Crypto is not available.")
  return value
}

export function generateApiKey(cryptoImpl?: CryptoLike) {
  const crypto = resolveCrypto(cryptoImpl)
  const bytes = crypto.getRandomValues(new Uint8Array(API_KEY_RANDOM_LENGTH))
  let suffix = ""
  for (const byte of bytes) suffix += BASE62[byte % BASE62.length] ?? "0"
  return `${API_KEY_PREFIX}${suffix}`
}

export function getApiKeyPrefix(apiKey: string) {
  return apiKey.startsWith(API_KEY_PREFIX)
    ? apiKey.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + 8)
    : apiKey.slice(0, 8)
}

export function maskDeveloperKey(apiKey: string) {
  if (!apiKey.startsWith(API_KEY_PREFIX)) return "********"
  return `${API_KEY_PREFIX}${getApiKeyPrefix(apiKey)}••••••••••••••••••••••••••••••••`
}

export async function hashApiKey(apiKey: string, cryptoImpl?: CryptoLike) {
  const crypto = resolveCrypto(cryptoImpl)
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function normalizeScopes(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    ),
  )
}
