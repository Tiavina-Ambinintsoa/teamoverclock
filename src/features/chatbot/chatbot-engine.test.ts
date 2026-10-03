import { describe, expect, it } from "vitest"

import {
  buildReply,
  detectFacet,
  detectIntent,
  guessReportCategory,
  isConfirmation,
  isRejection,
  normalize,
  searchKnowledge,
  tokenize,
  type KbEntry,
  type ServiceFacts,
} from "./chatbot-engine"
import type { DangerRow, Sector } from "@/lib/db-types"

const kb: KbEntry[] = [
  { id: "1", entity_type: "service", title: "Nova Police", content: "Sécurité publique ouverte 24 h/24. Téléphone +999 112 0002.", url: "/services/nova-police" },
  { id: "2", entity_type: "news", title: "Inspection de la coque à Ferrum Docks", content: "Le quai 4 est partiellement fermé pendant 48 h.", url: "/news/inspection-coque" },
  { id: "3", entity_type: "danger", title: "Protocole d'invasion extraterrestre", content: "Huit étapes : identifier, confirmer, informer, rester à l'abri. Alerte fictive.", url: "/dangers/alien-invasion-protocol" },
]

const services: ServiceFacts[] = [
  {
    slug: "citizen-relations", name: "Citizen Relations Office", category: "administration",
    description: "Guichet unique : questions, démarches et orientation.", phone: "+999 200 0001",
    opening_hours: { "mon-fri": "08:00-17:00" }, required_documents: ["Pièce d'identité (CIN)"],
    procedures: [{ step: 1, text: "Décrivez votre demande" }, { step: 2, text: "Joignez vos documents" }], status: "open", is_emergency: false,
  },
  {
    slug: "environment-waste", name: "Environment & Waste", category: "environment",
    description: "Collecte des déchets.", phone: null, opening_hours: {}, required_documents: [], procedures: [], status: "temporarily_closed", is_emergency: false,
  },
]

describe("normalize / tokenize", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalize("Où se trouve l'Hôpital ?")).toBe("ou se trouve l hopital")
  })
  it("drops stopwords and one-letter tokens", () => {
    expect(tokenize("Quels sont les documents pour la police ?")).toEqual(["documents", "police"])
  })
})

describe("searchKnowledge", () => {
  it("ranks the best match first and matches plurals", () => {
    const hits = searchKnowledge(kb, "numéro de la police")
    expect(hits[0].item.id).toBe("1")
    expect(searchKnowledge(kb, "les polices")[0]?.item.id).toBe("1")
  })
  it("returns nothing when no word matches", () => {
    expect(searchKnowledge(kb, "recette de crêpes")).toEqual([])
  })
})

describe("detectIntent", () => {
  it("prioritizes emergencies", () => {
    expect(detectIntent("Que faire en cas d'invasion extraterrestre ?")).toBe("emergency")
    expect(detectIntent("il y a un incendie")).toBe("emergency")
  })
  it("detects reports, requests, humans and greetings", () => {
    expect(detectIntent("Je veux signaler un lampadaire cassé")).toBe("create_report")
    expect(detectIntent("Je voudrais envoyer une demande à la mairie")).toBe("create_request")
    expect(detectIntent("Je veux parler à un conseiller")).toBe("human")
    expect(detectIntent("Bonjour")).toBe("greeting")
    expect(detectIntent("Quels sont les horaires de la mairie ?")).toBe("info")
  })
})

describe("detectFacet", () => {
  it("recognizes what the user asks about a service", () => {
    expect(detectFacet("quels documents faut-il fournir")).toBe("documents")
    expect(detectFacet("quelles sont les démarches")).toBe("steps")
    expect(detectFacet("horaires d'ouverture")).toBe("hours")
    expect(detectFacet("quel est le numéro de téléphone")).toBe("phone")
    expect(detectFacet("bonjour")).toBeNull()
  })
})

describe("guessReportCategory", () => {
  it("maps keywords to report categories", () => {
    expect(guessReportCategory("un lampadaire clignote")).toBe("infrastructure")
    expect(guessReportCategory("trop de bruit la nuit")).toBe("noise")
    expect(guessReportCategory("dépôt de déchets")).toBe("environment")
    expect(guessReportCategory("blabla")).toBe("other")
  })
})

describe("confirmation helpers", () => {
  it("understands yes and no in both languages", () => {
    expect(isConfirmation("Oui, je confirme")).toBe(true)
    expect(isConfirmation("yes")).toBe(true)
    expect(isConfirmation("peut-être")).toBe(false)
    expect(isRejection("Non merci")).toBe(true)
    expect(isRejection("cancel")).toBe(true)
  })
})

describe("buildReply", () => {
  const ctx = { kb, services }

  it("answers documents questions from structured service data with a source link", () => {
    const reply = buildReply({ ...ctx, locale: "fr", text: "Quels documents pour Citizen Relations ?" })
    expect(reply.content).toContain("Pièce d'identité (CIN)")
    expect(reply.sources[0].url).toBe("/services/citizen-relations")
    expect(reply.kind).toBe("normal")
  })

  it("answers steps and hours, and warns when a service is closed", () => {
    expect(buildReply({ ...ctx, locale: "fr", text: "Quelles démarches au Citizen Relations Office ?" }).content).toContain("1. Décrivez votre demande")
    expect(buildReply({ ...ctx, locale: "en", text: "opening hours of citizen relations" }).content).toContain("08:00-17:00")
    expect(buildReply({ ...ctx, locale: "fr", text: "Environment Waste" }).content).toContain("fermé ou suspendu")
  })

  it("directs app-screen questions about the interactive map to the map page", () => {
    const reply = buildReply({ ...ctx, locale: "fr", text: "Dis moi sur quelle écran on retrouve la carte interactive" })
    expect(reply.content).toContain("écran Carte")
    expect(reply.sources).toContainEqual(expect.objectContaining({ url: "/map" }))
  })

  it("gives the official protocol, the emergency numbers and a calm tone for emergencies", () => {
    const reply = buildReply({ ...ctx, locale: "fr", text: "Invasion extraterrestre, que faire ?" })
    expect(reply.kind).toBe("emergency")
    expect(reply.content).toContain("+999 112")
    expect(reply.content).toContain("Huit étapes")
    expect(reply.sources.some((s) => s.url === "/dangers/alien-invasion-protocol")).toBe(true)
  })

  it("lists every danger for the user's sector with full details and links", () => {
    const danger: DangerRow = {
      id: "danger-1", slug: "reactor-leak", title: "Fuite du réacteur", severity: "high", status: "active",
      summary: "Une fuite est détectée près du réacteur.", affected_sector_ids: ["sector-1"],
      valid_from: "2026-10-01", valid_until: null, recommended_actions: ["Rester à l'abri"],
      forbidden_actions: ["Ne pas approcher"], emergency_contacts: [{ service: "Pompiers", phone: "118" }],
      assembly_building_ids: ["assembly-1"], protocol_steps: [{ order: 1, title: "Se protéger", detail: "Fermer les fenêtres." }],
      source: "Centre de sécurité", responsible_service_id: null, validated_at: null, procedure_version: 2,
      is_fictional_alert: false,
    }
    const otherSectorDanger = { ...danger, id: "danger-2", slug: "other-sector", title: "Alerte autre secteur", affected_sector_ids: ["sector-2"] }
    const sectors: Sector[] = [
      { id: "sector-1", code: "S1", name: "Orbis Port", description: null, hex_q: 0, hex_r: 0, x: 0, y: 0, color: "#000000", activity_level: 0, is_active: true },
      { id: "sector-2", code: "S2", name: "Sentinel Ward", description: null, hex_q: 1, hex_r: 0, x: 1, y: 0, color: "#000000", activity_level: 0, is_active: true },
    ]
    const reply = buildReply({
      kb, services, locale: "fr", dangers: [danger, otherSectorDanger], sectors,
      buildings: [{ id: "assembly-1", name: "Abri central", address: "1 avenue Nova", sector_id: "sector-1" }],
      sectorId: "sector-1",
      text: "Quels sont les dangers dans mon secteur ?",
    })

    expect(reply.content).toContain("Fuite du réacteur")
    expect(reply.content).toContain("Rester à l'abri")
    expect(reply.content).toContain("Ne pas approcher")
    expect(reply.content).toContain("Fermer les fenêtres")
    expect(reply.content).toContain("Pompiers: 118")
    expect(reply.content).toContain("S1 Orbis Port")
    expect(reply.content).toContain("Abri central (1 avenue Nova)")
    expect(reply.content).toContain("Centre de sécurité")
    expect(reply.content).not.toContain("Alerte autre secteur")
    expect(reply.sources.some((source) => source.url === "/dangers/reactor-leak")).toBe(true)

    const allDangers = buildReply({
      kb, services, locale: "fr", dangers: [danger, otherSectorDanger], sectors,
      text: "Quels sont les dangers connus ?",
    })
    expect(allDangers.content).toContain("Fuite du réacteur")
    expect(allDangers.content).toContain("Alerte autre secteur")
    expect(allDangers.sources.some((source) => source.url === "/dangers/other-sector")).toBe(true)
  })

  it("never invents: unknown questions are flagged and offer an agent", () => {
    const reply = buildReply({ ...ctx, locale: "fr", text: "Quelle est la recette des crêpes ?" })
    expect(reply.kind).toBe("unknown")
    expect(reply.sources).toEqual([])
    expect(reply.pendingAction).toEqual({ type: "escalate" })
    expect(reply.content).toContain("pas cette information")
  })

  it("answers from published news with a link", () => {
    const reply = buildReply({ ...ctx, locale: "fr", text: "Le quai 4 de Ferrum Docks est-il fermé ?" })
    expect(reply.sources.some((s) => s.url === "/news/inspection-coque")).toBe(true)
  })

  it("returns every matching knowledge entry without truncating published details", () => {
    const fullKnowledge = Array.from({ length: 4 }, (_, index) => ({
      id: `news-${index}`,
      entity_type: "news",
      title: `Inspection Ferrum Docks ${index}`,
      content: `Détail publié ${index}. ${"Information complémentaire. ".repeat(12)}`,
      url: `/news/inspection-${index}`,
    }))
    const reply = buildReply({
      ...ctx,
      kb: fullKnowledge,
      locale: "fr",
      text: "Informations sur l'inspection Ferrum Docks",
    })

    expect(reply.kind).toBe("normal")
    expect(reply.sources).toHaveLength(4)
    expect(reply.content).toContain("Détail publié 3.")
    expect(reply.content).toContain("Information complémentaire. ".repeat(12))
  })

  it("asks for confirmation before creating a report or a request (no side effect)", () => {
    const report = buildReply({ ...ctx, locale: "fr", text: "Je veux signaler un lampadaire cassé dans le secteur 3" })
    expect(report.pendingAction?.type).toBe("create_report")
    expect(report.content).toContain("Rien n'est créé sans votre accord")
    const request = buildReply({ ...ctx, locale: "fr", text: "Je voudrais envoyer une demande au Citizen Relations Office" })
    expect(request.pendingAction).toMatchObject({ type: "create_request", draft: { serviceSlug: "citizen-relations" } })
  })

  it("speaks English when asked to", () => {
    expect(buildReply({ ...ctx, locale: "en", text: "hello" }).content).toContain("Hello")
  })
})
