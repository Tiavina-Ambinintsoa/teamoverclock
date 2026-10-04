import { describe, expect, it } from "vitest"

import type { DangerRow } from "@/lib/db-types"

import { buildDangerPayload, dangerRowToFormValues } from "./danger-form-helpers"

const sampleDanger: DangerRow = {
  id: "danger-1",
  slug: "solar-storm",
  title: "Solar storm",
  severity: "high",
  status: "active",
  summary: "Stay sheltered during the storm.",
  affected_sector_ids: ["sector-1"],
  valid_from: "2026-10-03T12:00:00.000Z",
  valid_until: null,
  recommended_actions: ["Stay indoors"],
  forbidden_actions: ["Use open rooftops"],
  emergency_contacts: [{ service: "Response unit — Commander", phone: "+261 20 00 000 00" }],
  assembly_building_ids: ["building-1"],
  protocol_steps: [{ order: 1, title: "Shelter", detail: "Move to an interior room." }],
  source: "satellite",
  responsible_service_id: "service-1",
  validated_at: "2026-10-03T12:10:00.000Z",
  procedure_version: 3,
  is_fictional_alert: true,
}

describe("danger form helpers", () => {
  it("maps emergency contacts and protocol steps back to form values", () => {
    const values = dangerRowToFormValues(sampleDanger)

    expect(values.emergencyContacts[0]).toEqual({
      name: "Response unit",
      role: "Commander",
      phone: "+261 20 00 000 00",
    })
    expect(values.protocolSteps[0]).toEqual({
      title: "Shelter",
      detail: "Move to an interior room.",
    })
  })

  it("bumps procedure version when editing an active alert", () => {
    const payload = buildDangerPayload(dangerRowToFormValues(sampleDanger), sampleDanger)

    expect(payload.procedure_version).toBe(4)
    expect(payload.emergency_contacts[0]).toMatchObject({
      service: "Response unit — Commander",
      phone: "+261 20 00 000 00",
    })
  })
})
