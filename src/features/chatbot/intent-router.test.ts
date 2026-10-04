import { describe, expect, it } from "vitest"

import { routeIntent, type ChatBuilding, type RouterServiceFacts } from "./intent-router"

const services: RouterServiceFacts[] = [
  {
    id: "svc-health",
    slug: "emergency-medical",
    name: "Emergency Medical",
    category: "health",
    description: "Ambulances, urgent care and first response.",
    phone: "+999 115 0004",
    opening_hours: { always: "24/7" },
    status: "open",
    is_emergency: true,
  },
  {
    id: "svc-relations",
    slug: "citizen-relations",
    name: "Citizen Relations Office",
    category: "administration",
    description: "Administrative desk for documents and requests.",
    phone: "+999 200 0001",
    opening_hours: { "mon-fri": "08:00-17:00" },
    status: "open",
    is_emergency: false,
  },
  {
    id: "svc-urban",
    slug: "urban-planning",
    name: "Urban Planning",
    category: "urbanism",
    description: "Permits and development plans.",
    phone: "+999 200 0010",
    opening_hours: { "mon-fri": "09:00-15:00" },
    status: "hidden",
    is_emergency: false,
  },
  {
    id: "svc-works",
    slug: "public-works",
    name: "Public Works & Roads",
    category: "infrastructure",
    description: "Roads, lighting and street equipment.",
    phone: "+999 200 0005",
    opening_hours: { "mon-fri": "07:00-16:00" },
    status: "open",
    is_emergency: false,
  },
  {
    id: "svc-police",
    slug: "nova-police",
    name: "Nova Police",
    category: "security",
    description: "Security incidents and complaints.",
    phone: "+999 112 0002",
    opening_hours: { always: "24/7" },
    status: "open",
    is_emergency: true,
  },
  {
    id: "svc-environment",
    slug: "environment-waste",
    name: "Environment & Waste",
    category: "environment",
    description: "Waste collection and urban cleanliness.",
    phone: "+999 200 0008",
    opening_hours: { "tue-sat": "08:00-17:00" },
    status: "temporarily_closed",
    is_emergency: false,
  },
]

const buildings: ChatBuilding[] = [
  {
    id: "b-hospital",
    name: "Vitalis Central Hospital",
    address: "3 Avenue Vitalis",
    sector_id: "sector-6",
    facility_type: "hospital",
    service_id: "svc-health",
    phone: "+999 115 0004",
    opening_hours: { always: "24/7" },
    status: "operational",
    offerings: ["Urgent care", "Imaging"],
    description: "Main hospital.",
  },
  {
    id: "b-clinic",
    name: "Aurora Walk-in Clinic",
    address: "12 Aurora Heights",
    sector_id: "sector-2",
    facility_type: "clinic",
    phone: "+999 220 0001",
    opening_hours: { "mon-sat": "08:00-18:00" },
    status: "operational",
    offerings: ["General consultation", "Vaccination"],
    description: "Local clinic.",
  },
  {
    id: "b-pharmacy",
    name: "Nexus Pharmacy",
    address: "1 Place du Nexus",
    sector_id: "sector-1",
    facility_type: "pharmacy",
    phone: "+999 220 0002",
    opening_hours: { "mon-sun": "08:00-20:00" },
    status: "operational",
    offerings: ["Medication", "Advice"],
    description: "Pharmacy.",
  },
]

describe("routeIntent", () => {
  it("routes ankle injuries to a health location", () => {
    const reply = routeIntent({
      text: "I twisted my ankle and I may have a sprain",
      locale: "en",
      services,
      buildings,
    })

    expect(reply?.intent).toBe("info")
    expect(reply?.content).toContain("Vitalis Central Hospital")
    expect(reply?.sources.some((source) => source.title === "Emergency Medical")).toBe(true)
  })

  it("handles emergencies in French and English", () => {
    const enReply = routeIntent({
      text: "Chest pain and trouble breathing right now",
      locale: "en",
      services,
      buildings,
    })
    const frReply = routeIntent({
      text: "J'ai une douleur thoracique et je respire mal",
      locale: "fr",
      services,
      buildings,
    })

    expect(enReply?.intent).toBe("emergency")
    expect(enReply?.kind).toBe("emergency")
    expect(enReply?.content).toContain("+999 115 0004")
    expect(frReply?.content).toContain("Je ne peux pas poser de diagnostic")
  })

  it("maps a building permit folder to urban planning", () => {
    const reply = routeIntent({
      text: "I need a folder for a building permit",
      locale: "en",
      services,
      buildings,
    })

    expect(reply?.intent).toBe("create_request")
    expect(reply?.content).toContain("Urban Planning")
    expect(reply?.content).toContain("/app/requests/new?service=urban-planning")
    expect(reply?.pendingAction).toMatchObject({ type: "create_request", draft: { serviceSlug: "urban-planning" } })
  })

  it("maps FR document intents to the right service", () => {
    const reply = routeIntent({
      text: "Il me faut une attestation de résidence",
      locale: "fr",
      services,
      buildings,
    })

    expect(reply?.content).toContain("Citizen Relations Office")
    expect(reply?.content).toContain("Horaires")
    expect(reply?.sources.some((source) => source.url === "/services/citizen-relations")).toBe(true)
  })

  it("routes report intents with category and service", () => {
    const reply = routeIntent({
      text: "There is a pothol near the station and it is dangerous",
      locale: "en",
      services,
      buildings,
    })

    expect(reply?.intent).toBe("create_report")
    expect(reply?.content).toContain("/app/reports/new?category=infrastructure")
    expect(reply?.content).toContain("Public Works & Roads")
    expect(reply?.pendingAction).toMatchObject({ type: "create_report", draft: { category: "infrastructure" } })
  })

  it("asks for clarification when the request is too vague", () => {
    const reply = routeIntent({
      text: "I need a document",
      locale: "en",
      services,
      buildings,
    })

    expect(reply?.intent).toBe("info")
    expect(reply?.pendingAction).toBeUndefined()
    expect(reply?.content).toContain("Could you clarify")
  })
})
