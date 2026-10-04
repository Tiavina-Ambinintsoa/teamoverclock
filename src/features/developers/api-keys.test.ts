import { describe, expect, it } from "vitest"

import {
  API_KEY_PREFIX,
  API_KEY_RANDOM_LENGTH,
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
  maskDeveloperKey,
  normalizeScopes,
} from "@/features/developers/api-keys"

function cryptoFromBytes(bytes: number[]) {
  return {
    getRandomValues(target: Uint8Array) {
      target.set(bytes.slice(0, target.length))
      return target
    },
    subtle: globalThis.crypto.subtle,
  } as unknown as Crypto
}

describe("developer api key helpers", () => {
  it("generates an nt_live key with 40 base62 characters", () => {
    const apiKey = generateApiKey(cryptoFromBytes(Array.from({ length: API_KEY_RANDOM_LENGTH }, (_, index) => index)))
    expect(apiKey).toMatch(/^nt_live_[0-9A-Za-z]{40}$/)
    expect(apiKey.length).toBe(API_KEY_PREFIX.length + API_KEY_RANDOM_LENGTH)
  })

  it("extracts the visible eight-character prefix", () => {
    expect(getApiKeyPrefix("nt_live_AbC12345morecharacters")).toBe("AbC12345")
  })

  it("hashes keys with sha256", async () => {
    await expect(hashApiKey("abc")).resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })

  it("masks generated keys without losing the visible prefix", () => {
    expect(maskDeveloperKey("nt_live_AbC12345abcdefghijklmnopqrstuvwx")).toContain("nt_live_AbC12345")
  })

  it("normalizes comma or line-separated scopes", () => {
    expect(normalizeScopes("read, reports\nread, admin-data")).toEqual(["read", "reports", "admin-data"])
  })
})
