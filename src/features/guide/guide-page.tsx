import { CheckCircle2, PlayCircle } from "lucide-react"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useGuide } from "@/features/guide/guide-context"
import { stepsFor, tourDescription, tourTitle } from "@/features/guide/guide-tours"
import { DEFAULT_COMMANDS } from "@/features/voice/voice-commands"
import { copyLocale, useLocale } from "@/lib/locale"

/** Guide en texte : tous les parcours (rejouables) et les commandes vocales, lisibles sans JavaScript de visite. */
export function GuidePage() {
  const { tx, locale } = useLocale()
  const guide = useGuide()
  const commands = DEFAULT_COMMANDS.filter((c) => c.locale === "any" || c.locale === copyLocale(locale))

  return (
    <Container className="max-w-4xl py-10">
      <title>{tx("Guide", "Guide")}</title>
      <PageHeader
        eyebrow={tx("Aide", "Help")}
        title={tx("Guide d'utilisation", "User guide")}
        description={tx("Visites guidées pas à pas, version texte, et commandes vocales disponibles. Tout est accessible au clavier.", "Step-by-step tours, text version, and available voice commands. Everything is keyboard accessible.")}
      />

      <div className="grid gap-6">
        {guide.tours.map((tour) => {
          const steps = stepsFor(tour, locale)
          return (
            <section key={tour.code} aria-labelledby={`tour-${tour.code}`} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id={`tour-${tour.code}`} className="flex items-center gap-2 text-lg font-semibold">
                    {tourTitle(tour, locale)} {guide.isCompleted(tour.code) && <CheckCircle2 className="size-4 text-primary" aria-label={tx("Terminé", "Completed")} />}
                  </h2>
                  <p className="text-sm text-muted-foreground">{tourDescription(tour, locale)} · ≈ {tour.estimated_minutes} min</p>
                </div>
                <Button onClick={() => guide.start(tour.code)}><PlayCircle aria-hidden />{tx("Lancer la visite", "Start the tour")}</Button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">{tx("Lire les étapes", "Read the steps")}</summary>
                <ol className="mt-2 grid list-decimal gap-2 pl-5 text-sm">
                  {steps.map((s) => <li key={s.step_order}><strong>{s.title}</strong> — {s.body}</li>)}
                </ol>
              </details>
            </section>
          )
        })}

        <section aria-labelledby="voice-help" className="rounded-xl border bg-card p-5">
          <h2 id="voice-help" className="mb-1 text-lg font-semibold">{tx("Commandes vocales", "Voice commands")}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{tx("Activez l'assistance vocale dans Paramètres, puis dites par exemple :", "Turn on voice assistance in Settings, then say for example:")} {tx("Les commandes vocales sont actuellement disponibles en français et en anglais.", "Voice commands are currently available in French and English.")}</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {commands.map((c) => (
              <li key={c.code} className="rounded-lg border p-3"><strong>« {copyLocale(locale) === "en" ? voicePhraseEnglish[c.code] ?? c.phrases[0] : c.phrases[0]} »</strong><br /><span className="text-muted-foreground">{tx(c.description, voiceDescriptionEnglish[c.code] ?? c.description)}</span></li>
            ))}
            <li className="rounded-lg border p-3"><strong>« {tx("dicte bonjour", "write hello")} »</strong><br /><span className="text-muted-foreground">{tx("Écrit dans le champ de texte actif (jamais dans un mot de passe).", "Writes into the active text field (never into a password).")}</span></li>
            <li className="rounded-lg border p-3"><strong>« {tx("clique sur services", "click on services")} »</strong><br /><span className="text-muted-foreground">{tx("Active un lien de la page ou un bouton marqué pour la voix. Les actions qui envoient ou créent demandent un « oui ».", "Activates a link on the page or a voice-enabled button. Actions that send or create ask for a “yes”.")}</span></li>
          </ul>
        </section>
      </div>
    </Container>
  )
}

const voiceDescriptionEnglish: Record<string, string> = {
  "go-home": "Go to the home page.",
  "open-services": "Open the list of services.",
  "open-news": "Open the news.",
  "open-map": "Open the interactive map.",
  "open-dangers": "Open hazards and safety protocols.",
  "open-chatbot": "Open the virtual assistant.",
  "new-report": "Start a report (verified identity required).",
  "my-requests": "View my requests and their status.",
  "read-page": "Read the page content aloud.",
  help: "Explain the current page and available voice commands.",
  tour: "Start the guided tour.",
  stop: "Stop reading or cancel the current action.",
}

const voicePhraseEnglish: Record<string, string> = {
  "go-home": "go home",
  "open-services": "open services",
  "open-news": "open news",
  "open-map": "open the map",
  "open-dangers": "open dangers",
  "open-chatbot": "open assistant",
  "new-report": "new report",
  "my-requests": "my requests",
  "read-page": "read this page",
  help: "help",
  tour: "guided tour",
  stop: "stop",
}
