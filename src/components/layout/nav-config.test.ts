import { describe, expect, it } from "vitest"

import { navForRole } from "./nav-config"

const ids = (role: Parameters<typeof navForRole>[0], isAdmin = false) => navForRole(role, isAdmin).map((group) => group.id)

describe("navForRole", () => {
  it("gives citizens only their space and the public city links", () => {
    expect(ids("citizen")).toEqual(["citizen", "city"])
  })
  it("adds the agent workspace for staff", () => {
    expect(ids("agent")).toEqual(["citizen", "agent", "city"])
    expect(ids("service_admin")).toEqual(["citizen", "agent", "city"])
  })
  it("adds administration for general admins only", () => {
    expect(ids("general_admin")).toEqual(["citizen", "agent", "admin", "city"])
    expect(ids("citizen", true)).toContain("admin")
    expect(ids("agent")).not.toContain("admin")
  })
  it("has unique routes per group", () => {
    for (const group of navForRole("general_admin", true)) {
      const routes = group.items.map((item) => item.to)
      expect(new Set(routes).size).toBe(routes.length)
    }
  })
})
