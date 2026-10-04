import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LocaleProvider, LOCALE_OPTIONS, useLocale } from "./locale"

function LocaleProbe() {
  const { locale, setLocale, t, tag, tx } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="tag">{tag}</span>
      <span data-testid="language-label">{t("auth.languagePreference")}</span>
      <span data-testid="translated-navigation">{tx("Mes demandes", "My requests")}</span>
      <span data-testid="translated-description">{tx("Trouvez un service, ses horaires, ses démarches et les documents à fournir.", "Find a service, its opening hours, its procedures and the documents to provide.")}</span>
      <span data-testid="localized-home">{tx("Bienvenue à", "Welcome to")}</span>
      <span data-testid="localized-legal-heading">{tx("Quelles informations sont utilisées ?", "What information is used?")}</span>
      <span data-testid="localized-office">{tx("Bureau des relations citoyennes", "Citizen Relations Office")}</span>
      <span data-testid="localized-team-title">{t("team.title")}</span>
      <span data-testid="localized-accessibility">{tx("Visite guidée de cette page", "Guided tour of this page")}</span>
      <span data-testid="localized-breadcrumb">{tx("Fil d'Ariane", "Breadcrumb")}</span>
      <span data-testid="localized-accessibility-profile">{tx("Mon profil", "My profile")}</span>
      <span data-testid="localized-accessibility-text-size">{tx("Taille du texte", "Text size")}</span>
      <span data-testid="localized-accessibility-voice-search">{tx("Rechercher une voix", "Search voices")}</span>
      <span data-testid="localized-accessibility-microphone">{tx("Le micro ne s'active que lorsque vous cliquez sur le bouton « Parler ». Aucun enregistrement audio n'est conservé.", "The microphone only turns on when you click the “Talk” button. No audio recording is kept.")}</span>
      <span data-testid="localized-services-title">{tx("Services municipaux", "Municipal services")}</span>
      <span data-testid="localized-news-title">{tx("Actualités municipales", "Municipal news")}</span>
      <span data-testid="localized-reports-title">{tx("Signalements publics", "Public reports")}</span>
      <span data-testid="localized-dangers-title">{tx("Dangers et protocoles", "Dangers & protocols")}</span>
      <span data-testid="localized-map-title">{tx("Carte de Nova Terra", "Nova Terra map")}</span>
      <span data-testid="localized-map-description">{tx("Explorez la ville en 3D ou en 2D. Sélectionnez un élément pour consulter ses détails.", "Explore the city in 3D or 2D. Select an item to view its details.")}</span>
      <span data-testid="localized-settings-description">{t("settings.description")}</span>
      <span data-testid="localized-export-description">{tx("Préparez une copie lisible de vos informations. Choisissez les rubriques, puis enregistrez le rapport en PDF ou téléchargez les données JSON.", "Prepare a readable copy of your information. Choose the sections, then save the report as PDF or download the JSON data.")}</span>
      <span data-testid="localized-dashboard-greeting">{tx("Bonjour", "Hello")}</span>
      <span data-testid="localized-guide-eyebrow">{tx("Aide", "Help")}</span>
      <span data-testid="localized-admin-service-title">{tx("Gestion des services", "Service management")}</span>
      <span data-testid="localized-admin-projects-eyebrow">{tx("Administration générale", "General administration")}</span>
      {LOCALE_OPTIONS.map((option) => (
        <button key={option.value} onClick={() => setLocale(option.value)}>{option.value}</button>
      ))}
    </div>
  )
}

describe("LocaleProvider", () => {
  it("supports all requested languages and applies their language tags", () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    )

    expect(LOCALE_OPTIONS.map((option) => option.value)).toEqual(["fr", "en", "mg", "mfe", "rcf", "x-nova"])

    for (const option of LOCALE_OPTIONS) {
      fireEvent.click(screen.getByRole("button", { name: option.value }))
      expect(screen.getByTestId("locale")).toHaveTextContent(option.value)
      expect(screen.getByTestId("tag")).toHaveTextContent(option.tag)
      expect(document.documentElement.lang).toBe(option.htmlTag)
      expect(() => new Intl.DateTimeFormat(option.tag)).not.toThrow()
    }
  })

  it("shows the selected language's language-preference label", () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "mg" }))
    expect(screen.getByTestId("language-label")).toHaveTextContent("Fiteny tiana")
  })

  it("localizes shared navigation labels for each supported locale", () => {
    const translated = new Map([
      ["mg", "Ny fangatahako"],
      ["mfe", "Mo bann demann"],
      ["rcf", "Mon bann demann"],
      ["x-nova", "Vexa-paxa"],
    ])
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>)
    for (const [locale, label] of translated) {
      fireEvent.click(screen.getByRole("button", { name: locale }))
      expect(screen.getByTestId("translated-navigation")).toHaveTextContent(label)
    }
  })

  it("localizes page descriptions in every non-English interface language", () => {
    const translated = new Map([
      ["mg", "Mitadiava serivisy, ora fisokafana, fomba fiasa ary antontan-taratasy ilaina."],
      ["mfe", "Rod enn servis, so ler ouver, so prosedir ek bann dokiman pou amene."],
      ["rcf", "Rod in servis, son ler douvèr, son prosedir ek bann dokiman pou améné."],
      ["x-nova", "Find service, open-hours, procedures, required-documents."],
    ])
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>)
    for (const [locale, description] of translated) {
      fireEvent.click(screen.getByRole("button", { name: locale }))
      expect(screen.getByTestId("translated-description")).toHaveTextContent(description)
    }
  })

  it("localizes audited home, legal, team and database labels across all non-English locales", () => {
    const expected = {
      mg: ["Tongasoa eto", "Inona ny fampahalalana ampiasaina?", "Biraon'ny fifandraisana amin'ny olom-pirenena", "Ekipa iray, hevitra iray, tanjona iray.", "Fitsidihana tari-dalana amin'ity pejy ity", "Lalana pejy"],
      mfe: ["Bienveni dan", "Ki linformasion servi?", "Biwo relasion sitwayin", "Enn lekip, enn lide, enn direksion.", "Vizit gide sa paz-la", "Fil paz"],
      rcf: ["Bienvni dan", "Kèl linformasyon i sèvi ?", "Biro d'relation sitwayin", "In lékip, in lidé, in direksyon.", "Vizit guidé la paz", "Fil d'Ariane"],
      "x-nova": ["Vexa to", "Which-data is used?", "Citizen-link office", "Team-unit, idea-core, direction-vector.", "Guided-page-tour", "Path-trail"],
    } as const
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>)
    for (const [locale, values] of Object.entries(expected)) {
      fireEvent.click(screen.getByRole("button", { name: locale }))
      expect(screen.getByTestId("localized-home")).toHaveTextContent(values[0])
      expect(screen.getByTestId("localized-legal-heading")).toHaveTextContent(values[1])
      expect(screen.getByTestId("localized-office")).toHaveTextContent(values[2])
      expect(screen.getByTestId("localized-team-title")).toHaveTextContent(values[3])
      expect(screen.getByTestId("localized-accessibility")).toHaveTextContent(values[4])
      expect(screen.getByTestId("localized-breadcrumb")).toHaveTextContent(values[5])
    }
  })

  it("localizes accessibility settings and privacy copy across all non-English locales", () => {
    const expected = {
      mg: ["Ny mombamomba ahy", "Haben'ny soratra", "Mitadiava feo", "Tsy mandeha ny mikrô"],
      mfe: ["Mo profil", "Grander text", "Rod bann lavwa", "Mikro aktive zis kan to klik"],
      rcf: ["Mon profil", "Grandèr du text", "Rod bann lavwa", "Le micro i aktiv zis kan zot klik"],
      "x-nova": ["My-profile-core", "Text-scale", "Search-voice options", "Microphone activates only"],
    } as const
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>)
    for (const [locale, values] of Object.entries(expected)) {
      fireEvent.click(screen.getByRole("button", { name: locale }))
      expect(screen.getByTestId("localized-accessibility-profile")).toHaveTextContent(values[0])
      expect(screen.getByTestId("localized-accessibility-text-size")).toHaveTextContent(values[1])
      expect(screen.getByTestId("localized-accessibility-voice-search")).toHaveTextContent(values[2])
      expect(screen.getByTestId("localized-accessibility-microphone")).toHaveTextContent(values[3])
    }
  })

  it("localizes audited service, civic, map and settings copy across all non-English locales", () => {
    const expected = {
      mg: ["Serivisy monisipaly", "Vaovaon'ny tanàna", "Tatitra ampahibemaso", "Loza sy torolalana", "Sarintanin'i Nova Terra", "Tsidiho amin'ny endrika 3D na 2D", "Safidin'ny sehatr'asa", "Manomàna dika mora vakina", "Manao ahoana", "Fanampiana", "Fitantanana ny serivisy", "Fitantanana ankapobeny"],
      mfe: ["Servis minisipal", "Aktialite lavil", "Bann signalman piblik", "Danje ek protokol", "Kart Nova Terra", "Explore lavil an 3D ouswa 2D", "Preferans workspace", "Prepar enn kopi fasil pou lir", "Bonzour", "Led", "Gestion bann servis", "Administrasion zeneral"],
      rcf: ["Services municipaux", "Actualités la vil", "Signalman piblik", "Danje épi protokol", "Kart Nova Terra", "Explore la vil an 3D ousa 2D", "Préférans espace de travay", "Prépar in kopi fasil pou lir", "Bonzour", "Ède", "Gestion bann services", "Administration générale"],
      "x-nova": ["Municipal-service nexus", "Municipal-news stream", "Public-report archive", "Threats-and-response protocols", "Nova Terra planetary-map", "Explore city-space in 3D/2D", "Workspace-options", "Prepare-readable profile-copy", "Greeting-signal", "Vexa", "Service-control console", "General-administration nexus"],
    } as const
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>)
    for (const [locale, values] of Object.entries(expected)) {
      fireEvent.click(screen.getByRole("button", { name: locale }))
      expect(screen.getByTestId("localized-services-title")).toHaveTextContent(values[0])
      expect(screen.getByTestId("localized-news-title")).toHaveTextContent(values[1])
      expect(screen.getByTestId("localized-reports-title")).toHaveTextContent(values[2])
      expect(screen.getByTestId("localized-dangers-title")).toHaveTextContent(values[3])
      expect(screen.getByTestId("localized-map-title")).toHaveTextContent(values[4])
      expect(screen.getByTestId("localized-map-description")).toHaveTextContent(values[5])
      expect(screen.getByTestId("localized-settings-description")).toHaveTextContent(values[6])
      expect(screen.getByTestId("localized-export-description")).toHaveTextContent(values[7])
      expect(screen.getByTestId("localized-dashboard-greeting")).toHaveTextContent(values[8])
      expect(screen.getByTestId("localized-guide-eyebrow")).toHaveTextContent(values[9])
      expect(screen.getByTestId("localized-admin-service-title")).toHaveTextContent(values[10])
      expect(screen.getByTestId("localized-admin-projects-eyebrow")).toHaveTextContent(values[11])
    }
  })
})
