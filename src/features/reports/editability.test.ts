import { describe, expect, it } from "vitest"

import { canEditProject, canEditReport } from "@/features/reports/editability"

describe("canEditReport", () => {
  const baseReport = {
    reporter_citizen_id: "citizen-1",
    assigned_agent_id: null,
    status: "received" as const,
    history: [] as { from_status: null; to_status: "received"; changed_at: string }[],
  }

  it("allows the author to edit an untouched initial report", () => {
    expect(canEditReport(baseReport, "citizen-1")).toEqual({ editable: true, reason: null })
  })

  it("rejects another citizen", () => {
    expect(canEditReport(baseReport, "citizen-2")).toMatchObject({
      editable: false,
      reason: { en: "Only the author can edit this report." },
    })
  })

  it("rejects an assigned report", () => {
    expect(canEditReport({ ...baseReport, assigned_agent_id: "agent-1" }, "citizen-1")).toMatchObject({
      editable: false,
      reason: { en: "This report can no longer be edited because an agent has already taken charge of it." },
    })
  })

  it("rejects a report whose status already moved", () => {
    expect(canEditReport({
      ...baseReport,
      status: "validated",
      history: [{ from_status: "received", to_status: "validated", changed_at: "2026-10-04T01:00:00Z" }],
    }, "citizen-1")).toMatchObject({
      editable: false,
      reason: { en: "This report is no longer in its initial state." },
    })
  })

  it("rejects a report that returned to an initial status after history exists", () => {
    expect(canEditReport({
      ...baseReport,
      history: [{ from_status: "draft", to_status: "received", changed_at: "2026-10-04T01:00:00Z" }],
    }, "citizen-1")).toMatchObject({
      editable: false,
      reason: { en: "This report can no longer be edited because its status has already changed." },
    })
  })
})

describe("canEditProject", () => {
  const baseProject = {
    created_by: "creator-1",
    created_at: "2026-10-04T00:00:00Z",
    status_changed_at: "2026-10-04T00:00:00Z",
    taken_over_at: null,
  }

  it("allows the untouched creator project", () => {
    expect(canEditProject(baseProject, "creator-1")).toEqual({ editable: true, reason: null })
  })

  it("rejects another user", () => {
    expect(canEditProject(baseProject, "other")).toMatchObject({
      editable: false,
      reason: { en: "Only the creator can edit this project." },
    })
  })

  it("rejects a project whose status changed", () => {
    expect(canEditProject({ ...baseProject, status_changed_at: "2026-10-04T01:00:00Z" }, "creator-1")).toMatchObject({
      editable: false,
      reason: { en: "This project is no longer in its initial status." },
    })
  })

  it("rejects a project taken over by another manager", () => {
    expect(canEditProject({ ...baseProject, taken_over_at: "2026-10-04T01:30:00Z" }, "creator-1")).toMatchObject({
      editable: false,
      reason: { en: "This project can no longer be edited by its creator because another manager has already taken it over." },
    })
  })
})
