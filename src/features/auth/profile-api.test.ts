import { describe, expect, it, vi } from "vitest"

import { blockedAccountMessage, fetchProfileExtras, isBlockedAccount, mapProfileExtras } from "./profile-api"

describe("mapProfileExtras", () => {
  it("falls back to an active citizen when nothing is stored", () => {
    const extras = mapProfileExtras(null, null, null)
    expect(extras).toMatchObject({ profileRole: "citizen", accountStatus: "active", kycStatus: null, citizenId: null, serviceIds: [], profileLoaded: true })
  })

  it("maps a staff profile with services", () => {
    const extras = mapProfileExtras(
      { role: "service_admin", account_status: "active", first_name: "Kaelen", last_name: "Draxx" },
      { id: "c1", kyc_status: "verified", is_minor: false, sector_id: "s1" },
      [{ service_id: "svc-1", member_role: "admin" }, { service_id: "svc-2", member_role: "agent", can_validate_reports: false }, { service_id: "svc-3", member_role: "agent", can_validate_reports: true }]
    )
    expect(extras.profileRole).toBe("service_admin")
    expect(extras.serviceIds).toEqual(["svc-1", "svc-2", "svc-3"])
    expect(extras.validatorServiceIds).toEqual(["svc-1", "svc-3"])
    expect(extras.kycStatus).toBe("verified")
    expect(extras.firstName).toBe("Kaelen")
  })

  it("ignores unknown roles and statuses", () => {
    const extras = mapProfileExtras({ role: "root" as never, account_status: "weird" as never }, null, null)
    expect(extras.profileRole).toBe("citizen")
    expect(extras.accountStatus).toBe("active")
  })
})

describe("blocked accounts", () => {
  it("blocks suspended and disabled accounts only", () => {
    expect(isBlockedAccount("suspended")).toBe(true)
    expect(isBlockedAccount("disabled")).toBe(true)
    expect(isBlockedAccount("active")).toBe(false)
    expect(isBlockedAccount("pending")).toBe(false)
  })
  it("gives a clear message", () => {
    expect(blockedAccountMessage("suspended")).toContain("suspendu")
  })
})

describe("fetchProfileExtras", () => {
  it("queries the three tables for the user", async () => {
    const chain = (data: unknown) => {
      const builder: Record<string, unknown> = {}
      builder.select = vi.fn(() => builder)
      builder.eq = vi.fn(() => builder)
      builder.is = vi.fn(() => Promise.resolve({ data, error: null }))
      builder.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }))
      return builder
    }
    const from = vi.fn((table: string) => {
      if (table === "profiles") return chain({ role: "agent", account_status: "active" })
      if (table === "citizens") return chain({ id: "c9", kyc_status: "pending", is_minor: false, sector_id: null })
      return chain([{ service_id: "svc-9" }])
    })
    const extras = await fetchProfileExtras({ from } as never, "user-1")
    expect(from).toHaveBeenCalledWith("profiles")
    expect(from).toHaveBeenCalledWith("citizens")
    expect(from).toHaveBeenCalledWith("service_members")
    expect(extras.profileRole).toBe("agent")
    expect(extras.citizenId).toBe("c9")
    expect(extras.serviceIds).toEqual(["svc-9"])
  })
})
