import { beforeEach, describe, expect, it } from "vitest"

import { describePage, fieldLabels, readableText } from "./page-reader"

beforeEach(() => {
  document.body.innerHTML = `
    <header><a href="/">Accueil</a></header>
    <main>
      <h1>Contacter un service</h1>
      <h2>Votre demande</h2>
      <h2>Pièces jointes</h2>
      <p>Décrivez votre demande en détail.</p>
      <form>
        <label for="s">Sujet</label><input id="s" />
        <label>Description <textarea></textarea></label>
        <input type="password" aria-label="Mot de passe" />
        <input type="hidden" name="x" />
        <input type="checkbox" aria-label="Urgent" />
        <button type="submit">Envoyer ma demande</button>
        <button type="button" disabled>Bloqué</button>
      </form>
      <a href="/services">Services</a>
      <span class="sr-only"><h2>Caché</h2></span>
    </main>`
})

describe("fieldLabels", () => {
  it("lists labels of text-like fields only", () => {
    expect(fieldLabels(document.body)).toEqual(["Sujet", "Description", "Mot de passe"])
  })
})

describe("describePage", () => {
  it("summarizes title, sections, fields, actions and links in French", () => {
    const text = describePage(document.body, "fr", { withHint: true })
    expect(text).toContain("Page : Contacter un service.")
    expect(text).toContain("Sections : Votre demande, Pièces jointes.")
    expect(text).not.toContain("Caché")
    expect(text).toContain("Formulaire avec les champs : Sujet, Description")
    expect(text).toContain("Envoyer ma demande")
    expect(text).not.toContain("Bloqué")
    expect(text).toContain("1 lien de navigation")
    expect(text).toContain("Dites « aide »")
  })
  it("speaks English and falls back to the document title", () => {
    document.body.innerHTML = `<main><p>Hello</p></main>`
    expect(describePage(document.body, "en", { title: "Home" })).toContain("Page : Home.")
  })
  it("says so when there is nothing to read", () => {
    document.body.innerHTML = `<main></main>`
    expect(describePage(document.body, "fr")).toContain("pas de texte")
  })
})

describe("readableText", () => {
  it("joins headings and paragraphs and truncates long text", () => {
    expect(readableText(document.body)).toContain("Contacter un service. Votre demande")
    document.body.innerHTML = `<main><p>${"mot ".repeat(1000)}</p></main>`
    expect(readableText(document.body, 100).length).toBeLessThanOrEqual(101)
  })
})
