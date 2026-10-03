import { describe, expect, it } from "vitest"

import { DEFAULT_FILTERS, filterMapBuildings, filterMapReports } from "@/features/map/map-filters"
import type { PublicReport } from "@/features/reports/report-queries"
import type { Building } from "@/lib/db-types"

const building = (id: string, type: string, status: string) => ({ id, type, status }) as unknown as Building
const report = (id: string, status: string, category: string, title: string) =>
  ({ id, status, category, title, description: "Lampadaire cassé", report_number: `R-${id}` }) as unknown as PublicReport

describe("filterMapBuildings", () => {
  const all = [building("a", "hospital", "operational"), building("b", "hospital", "temporarily_closed"), building("c", "energy", "operational")]

  it("garde tout par défaut", () => {
    expect(filterMapBuildings(all, DEFAULT_FILTERS)).toHaveLength(3)
  })
  it("filtre par type et par état", () => {
    expect(filterMapBuildings(all, { ...DEFAULT_FILTERS, buildingType: "hospital" }).map((b) => b.id)).toEqual(["a", "b"])
    expect(filterMapBuildings(all, { ...DEFAULT_FILTERS, buildingType: "hospital", buildingStatus: "temporarily_closed" }).map((b) => b.id)).toEqual(["b"])
  })
  it("renvoie une liste vide quand la couche est masquée", () => {
    expect(filterMapBuildings(all, { ...DEFAULT_FILTERS, buildings: false })).toEqual([])
  })
})

describe("filterMapReports", () => {
  const all = [report("1", "validated", "safety", "Panne"), report("2", "resolved", "safety", "Fuite"), report("3", "validated", "noise", "Bruit")]

  it("combine statuts multiples et catégorie", () => {
    expect(filterMapReports(all, { ...DEFAULT_FILTERS, reportStatuses: ["validated"] }).map((r) => r.id)).toEqual(["1", "3"])
    expect(filterMapReports(all, { ...DEFAULT_FILTERS, reportStatuses: ["validated", "resolved"], reportCategory: "safety" }).map((r) => r.id)).toEqual(["1", "2"])
  })
  it("cherche dans le titre, la description et le numéro, sans tenir compte de la casse", () => {
    expect(filterMapReports(all, { ...DEFAULT_FILTERS, reportSearch: "FUITE" }).map((r) => r.id)).toEqual(["2"])
    expect(filterMapReports(all, { ...DEFAULT_FILTERS, reportSearch: "r-3" }).map((r) => r.id)).toEqual(["3"])
  })
  it("renvoie une liste vide quand la couche est masquée", () => {
    expect(filterMapReports(all, { ...DEFAULT_FILTERS, reports: false })).toEqual([])
  })
})
