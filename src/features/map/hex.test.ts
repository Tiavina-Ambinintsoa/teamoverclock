import { describe, expect, it } from "vitest"

import {
  axialToPixel,
  estimateMinutes,
  findRoute,
  hexDistance,
  hexPoints,
  isBuildingOpen,
  pixelToAxial,
  roundAxial,
  SQRT3,
  type RouteBuilding,
  type RouteSector,
} from "./hex"

describe("axialToPixel / pixelToAxial", () => {
  it("matches the SQL seed formula (size 100)", () => {
    expect(axialToPixel(0, 0, 100)).toEqual({ x: 0, y: 0 })
    const p = axialToPixel(1, 0, 100)
    expect(p.x).toBeCloseTo(173.2, 1)
    const q = axialToPixel(1, -1, 100)
    expect(q.x).toBeCloseTo(86.6, 1)
    expect(q.y).toBe(-150)
  })
  it("round-trips every cell of a small hive", () => {
    for (const [q, r] of [[0, 0], [1, 0], [-1, 1], [2, -1], [-2, 1], [1, 1]]) {
      const { x, y } = axialToPixel(q, r, 100)
      expect(pixelToAxial(x, y, 100)).toEqual({ q, r })
    }
  })
  it("snaps a point near a center to that cell", () => {
    const { x, y } = axialToPixel(1, 0, 100)
    expect(pixelToAxial(x + 20, y - 15, 100)).toEqual({ q: 1, r: 0 })
  })
})

describe("roundAxial", () => {
  it("keeps integers and normalizes -0", () => {
    expect(roundAxial(0, 0)).toEqual({ q: 0, r: 0 })
    expect(Object.is(roundAxial(-0.2, 0.1).q, -0)).toBe(false)
  })
})

describe("hexPoints / hexDistance", () => {
  it("returns six vertices", () => {
    expect(hexPoints(0, 0, 10).split(" ")).toHaveLength(6)
  })
  it("counts the number of cells between two cells", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1)
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2)
    expect(hexDistance({ q: -2, r: 1 }, { q: 2, r: -1 })).toBe(4)
    expect(SQRT3).toBeCloseTo(1.732, 3)
  })
})

describe("findRoute", () => {
  // Trois secteurs alignés A - B - C et un détour D1 - D2 qui relie A à C par le nord.
  const sectors: RouteSector[] = [
    { id: "A", q: 0, r: 0, ...axialToPixel(0, 0, 100) },
    { id: "B", q: 1, r: 0, ...axialToPixel(1, 0, 100) },
    { id: "C", q: 2, r: 0, ...axialToPixel(2, 0, 100) },
    { id: "D1", q: 1, r: -1, ...axialToPixel(1, -1, 100) },
    { id: "D2", q: 2, r: -1, ...axialToPixel(2, -1, 100) },
  ]
  const b = (id: string, sector: string, status: RouteBuilding["status"] = "operational"): RouteBuilding => {
    const s = sectors.find((x) => x.id === sector) as RouteSector
    return { id, sector_id: sector, x: s.x + 5, y: s.y + 5, status }
  }
  const buildings = [b("ba", "A"), b("bb", "B"), b("bc", "C"), b("closed", "B", "temporarily_closed"), b("works", "B", "under_maintenance")]

  it("finds the direct way through the middle sector", () => {
    const route = findRoute(sectors, buildings, "ba", "bc")
    expect(route?.sectorIds).toEqual(["A", "B", "C"])
    expect(route?.nodes[0]).toBe("ba")
    expect(route?.nodes.at(-1)).toBe("bc")
  })

  it("detours around an avoided sector when another way exists", () => {
    const route = findRoute(sectors, buildings, "ba", "bc", { avoidSectorIds: ["B"] })
    expect(route?.sectorIds).toEqual(["A", "D1", "D2", "C"])
  })

  it("still crosses an avoided sector when it is the only way", () => {
    const line = sectors.filter((s) => !s.id.startsWith("D"))
    const route = findRoute(line, buildings, "ba", "bc", { avoidSectorIds: ["B"] })
    expect(route?.sectorIds).toEqual(["A", "B", "C"])
  })

  it("refuses closed or in-maintenance buildings as start or destination", () => {
    expect(findRoute(sectors, buildings, "ba", "closed")).toBeNull()
    expect(findRoute(sectors, buildings, "works", "ba")).toBeNull()
    expect(findRoute(sectors, buildings, "ba", "missing")).toBeNull()
  })

  it("handles a trip within the same building and unreachable sectors", () => {
    expect(findRoute(sectors, buildings, "ba", "ba")?.cost).toBe(0)
    const z = axialToPixel(9, 9, 100)
    const isolated: RouteSector[] = [...sectors, { id: "Z", q: 9, r: 9, ...z }]
    const withZ: RouteBuilding[] = [...buildings, { id: "bz", sector_id: "Z", x: z.x, y: z.y, status: "operational" }]
    expect(findRoute(isolated, withZ, "ba", "bz")).toBeNull()
  })
})

describe("helpers", () => {
  it("only operational buildings are open", () => {
    expect(isBuildingOpen({ status: "operational" })).toBe(true)
    expect(isBuildingOpen({ status: "restricted" })).toBe(false)
  })
  it("estimates at least one minute", () => {
    expect(estimateMinutes(0)).toBe(1)
    expect(estimateMinutes(830)).toBe(100)
  })
})
