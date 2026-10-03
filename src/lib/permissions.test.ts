import { describe, expect, it } from "vitest"

import { can, homeForRole, isStaffRole, permissionScope } from "./permissions"

describe("permissionScope", () => {
  it("denies by default", () => {
    expect(permissionScope(null, "service.read")).toBeNull()
    expect(permissionScope(undefined, "service.read")).toBeNull()
    expect(permissionScope("system", "service.read")).toBeNull()
  })

  it("follows the D09 matrix", () => {
    expect(permissionScope("citizen", "request.create")).toBe("own")
    expect(permissionScope("citizen", "request.read_service")).toBeNull()
    expect(permissionScope("agent", "request.read_service")).toBe("service")
    expect(permissionScope("service_admin", "report.validate")).toBe("service")
    expect(permissionScope("general_admin", "report.validate")).toBe("all")
  })
})

describe("can", () => {
  it("lets only general admins manage users, roles and audit logs", () => {
    for (const code of ["user.manage", "role.edit", "audit.read"] as const) {
      expect(can("general_admin", code)).toBe(true)
      expect(can("service_admin", code)).toBe(false)
      expect(can("agent", code)).toBe(false)
      expect(can("citizen", code)).toBe(false)
    }
  })

  it("does not let agents validate reports", () => {
    expect(can("agent", "report.validate")).toBe(false)
  })
})

describe("isStaffRole / homeForRole", () => {
  it("recognizes staff roles", () => {
    expect(isStaffRole("agent")).toBe(true)
    expect(isStaffRole("citizen")).toBe(false)
    expect(isStaffRole(null)).toBe(false)
  })

  it("redirects each role to its own space", () => {
    expect(homeForRole("citizen")).toBe("/app")
    expect(homeForRole("agent")).toBe("/agent")
    expect(homeForRole("service_admin")).toBe("/agent")
    expect(homeForRole("general_admin")).toBe("/admin")
    expect(homeForRole(null)).toBe("/app")
  })
})
