import { describe, expect, it } from "vitest"

import type { RequestRow } from "@/lib/db-types"

import {
  allowedTransitions,
  dueDateFor,
  isTerminal,
  needsAction,
  requiresNote,
  safeFileName,
  sortRequests,
  validateAttachments,
} from "./request-workflow"

const NOW = new Date("2026-10-03T12:00:00Z")

function row(overrides: Partial<RequestRow>): RequestRow {
  return {
    id: "r", tracking_number: "NT-REQ-1", requester_id: "u", service_id: "s", assigned_agent_id: null, category: "c",
    subject: "s", description: "d", priority: "medium", status: "new", urgency_flag: false, due_at: null, satisfaction: null,
    attachments: [], resolution_note: null, closed_at: null, source: "web", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  }
}

describe("transitions", () => {
  it("allows the planned lifecycle and blocks terminal states", () => {
    expect(allowedTransitions("new")).toContain("received")
    expect(allowedTransitions("in_progress")).toContain("resolved")
    expect(allowedTransitions("closed")).toEqual([])
    expect(isTerminal("cancelled")).toBe(true)
    expect(isTerminal("in_progress")).toBe(false)
  })
  it("does not let a request jump from new to closed", () => {
    expect(allowedTransitions("new")).not.toContain("closed")
  })
  it("requires a note to resolve, close or reject", () => {
    expect(requiresNote("resolved")).toBe(true)
    expect(requiresNote("closed")).toBe(true)
    expect(requiresNote("rejected")).toBe(true)
    expect(requiresNote("in_progress")).toBe(false)
  })
})

describe("sortRequests", () => {
  const a = row({ id: "a", created_at: "2026-10-01T00:00:00Z" })
  const b = row({ id: "b", created_at: "2026-10-02T00:00:00Z", priority: "high" })
  const c = row({ id: "c", created_at: "2026-10-02T12:00:00Z", due_at: "2026-10-02T00:00:00Z", status: "in_progress" })
  const d = row({ id: "d", created_at: "2026-10-02T13:00:00Z", urgency_flag: true })

  it("sorts by urgency: overdue first, then urgent flag, then priority", () => {
    expect(sortRequests([a, b, c, d], "urgency", NOW).map((r) => r.id)).toEqual(["c", "d", "b", "a"])
  })
  it("sorts by age", () => {
    expect(sortRequests([d, b, a], "oldest", NOW).map((r) => r.id)).toEqual(["a", "b", "d"])
  })
  it("sorts by status order and does not mutate the input", () => {
    const input = [c, a]
    expect(sortRequests(input, "status", NOW).map((r) => r.id)).toEqual(["a", "c"])
    expect(input.map((r) => r.id)).toEqual(["c", "a"])
  })
})

describe("needsAction", () => {
  it("flags unassigned new requests and the agent's own open requests", () => {
    expect(needsAction(row({ status: "new" }), "agent")).toBe(true)
    expect(needsAction(row({ status: "in_progress", assigned_agent_id: "agent" }), "agent")).toBe(true)
  })
  it("ignores other agents' requests, waiting and terminal requests", () => {
    expect(needsAction(row({ status: "in_progress", assigned_agent_id: "other" }), "agent")).toBe(false)
    expect(needsAction(row({ status: "waiting_info", assigned_agent_id: "agent" }), "agent")).toBe(false)
    expect(needsAction(row({ status: "closed" }), "agent")).toBe(false)
  })
})

describe("dueDateFor", () => {
  it("adds the SLA hours", () => {
    expect(dueDateFor(24, NOW)).toBe("2026-10-04T12:00:00.000Z")
  })
})

describe("validateAttachments", () => {
  const ok = { name: "a.png", type: "image/png", size: 1000 }
  it("accepts allowed files", () => {
    expect(validateAttachments([ok])).toBeNull()
    expect(validateAttachments([])).toBeNull()
  })
  it("rejects forbidden types, big files and too many files", () => {
    expect(validateAttachments([{ ...ok, type: "application/x-msdownload" }])).toContain("refusé")
    expect(validateAttachments([{ ...ok, size: 6 * 1024 * 1024 }])).toContain("volumineux")
    expect(validateAttachments(Array.from({ length: 6 }, () => ok))).toContain("Maximum")
  })
})

describe("safeFileName", () => {
  it("replaces unsafe characters", () => {
    expect(safeFileName("mon fichier (1).png")).toBe("mon_fichier__1_.png")
  })
})
