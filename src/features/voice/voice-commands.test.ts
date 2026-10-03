import { describe, expect, it, vi } from "vitest"

import {
  DEFAULT_COMMANDS,
  canUseCommand,
  dictateIntoField,
  findActionable,
  listActionables,
  matchCommand,
  parseClickTarget,
  parseDictation,
  similarity,
} from "./voice-commands"

describe("similarity", () => {
  it("is 1 for equal phrases ignoring accents and case", () => {
    expect(similarity("Actualités", "actualites")).toBe(1)
  })
  it("scores whole-word inclusion high and unrelated text low", () => {
    expect(similarity("ouvre la carte s'il te plait", "ouvre la carte")).toBeGreaterThanOrEqual(0.9)
    expect(similarity("bonjour", "ouvre la carte")).toBe(0)
  })
})

describe("matchCommand", () => {
  it("matches French and English phrases to the right command", () => {
    expect(matchCommand("ouvre la carte", DEFAULT_COMMANDS, "fr", null)?.command.code).toBe("open-map")
    expect(matchCommand("open the map", DEFAULT_COMMANDS, "en", null)?.command.code).toBe("open-map")
    expect(matchCommand("où suis-je", DEFAULT_COMMANDS, "fr", null)?.command.code).toBe("help")
    expect(matchCommand("stop", DEFAULT_COMMANDS, "fr", null)?.command.action).toBe("stop")
  })
  it("returns null for unknown utterances", () => {
    expect(matchCommand("fais-moi un café", DEFAULT_COMMANDS, "fr", null)).toBeNull()
  })
  it("hides commands reserved to signed-in users from visitors", () => {
    expect(matchCommand("mes demandes", DEFAULT_COMMANDS, "fr", null)).toBeNull()
    expect(matchCommand("mes demandes", DEFAULT_COMMANDS, "fr", "citizen")?.command.code).toBe("my-requests")
  })
  it("asks for confirmation before starting a report", () => {
    expect(matchCommand("signaler un problème", DEFAULT_COMMANDS, "fr", "citizen")?.command.requires_confirmation).toBe(true)
  })
})

describe("canUseCommand", () => {
  const base = DEFAULT_COMMANDS[0]
  it("applies min_role", () => {
    expect(canUseCommand({ ...base, min_role: null }, null)).toBe(true)
    expect(canUseCommand({ ...base, min_role: "citizen" }, "agent")).toBe(true)
    expect(canUseCommand({ ...base, min_role: "agent" }, "citizen")).toBe(false)
    expect(canUseCommand({ ...base, min_role: "agent" }, "general_admin")).toBe(true)
  })
})

describe("parseDictation / parseClickTarget", () => {
  it("extracts dictated text keeping its case", () => {
    expect(parseDictation("dicte Bonjour Nova Terra")).toBe("Bonjour Nova Terra")
    expect(parseDictation("write hello world")).toBe("hello world")
    expect(parseDictation("ouvre la carte")).toBeNull()
  })
  it("extracts the label to activate", () => {
    expect(parseClickTarget("clique sur envoyer ma demande")).toBe("envoyer ma demande")
    expect(parseClickTarget("go to services")).toBe("services")
    expect(parseClickTarget("bonjour")).toBeNull()
  })
})

describe("listActionables / findActionable", () => {
  function page() {
    document.body.innerHTML = `
      <a href="/services">Services</a>
      <a href="/news" aria-hidden="true">Cachée</a>
      <button data-voice="envoyer ma demande">Envoyer</button>
      <button>Supprimer tout</button>`
    return document.body
  }
  it("only exposes links and data-voice elements, never arbitrary buttons", () => {
    const labels = listActionables(page()).map((a) => a.label)
    expect(labels).toEqual(["Services", "envoyer ma demande"])
  })
  it("finds the element matching a spoken label", () => {
    expect(findActionable("services", page())?.element.getAttribute("href")).toBe("/services")
    expect(findActionable("envoyer ma demande", page())?.kind).toBe("voice")
    expect(findActionable("supprimer tout", page())).toBeNull()
  })
})

describe("dictateIntoField", () => {
  it("writes into a text field and fires an input event", () => {
    document.body.innerHTML = `<input id="t" value="début" />`
    const input = document.getElementById("t") as HTMLInputElement
    const listener = vi.fn()
    input.addEventListener("input", listener)
    expect(dictateIntoField("suite", input)).toBe(true)
    expect(input.value).toBe("début suite")
    expect(listener).toHaveBeenCalled()
  })
  it("never writes into password fields or non-fields", () => {
    document.body.innerHTML = `<input id="p" type="password" />`
    expect(dictateIntoField("secret", document.getElementById("p"))).toBe(false)
    expect(dictateIntoField("x", null)).toBe(false)
  })
})
