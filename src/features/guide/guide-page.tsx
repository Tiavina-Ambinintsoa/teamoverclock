import { CheckCircle2, PlayCircle } from "lucide-react"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useGuide } from "@/features/guide/guide-context"
import { stepsFor } from "@/features/guide/guide-tours"
import { DEFAULT_COMMANDS } from "@/features/voice/voice-commands"
import { useLocale } from "@/lib/locale"

/** Guide en texte : tous les parcours (rejouables) et les commandes vocales, lisibles sans JavaScript de visite. */
export function GuidePage() {
  const { tx, locale } = useLocale()
  const guide = useGuide()
  const commands = DEFAULT_COMMANDS.filter((c) => c.locale === "any" || c.locale === locale)

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
                    {tour.title} {guide.isCompleted(tour.code) && <CheckCircle2 className="size-4 text-primary" aria-label={tx("Terminé", "Completed")} />}
                  </h2>
                  <p className="text-sm text-muted-foreground">{tour.description} · ≈ {tour.estimated_minutes} min</p>
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
          <p className="mb-3 text-sm text-muted-foreground">{tx("Activez l'assistance vocale dans Paramètres, puis dites par exemple :", "Turn on voice assistance in Settings, then say for example:")}</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {commands.map((c) => (
              <li key={c.code} className="rounded-lg border p-3"><strong>« {c.phrases[0]} »</strong><br /><span className="text-muted-foreground">{c.description}</span></li>
            ))}
            <li className="rounded-lg border p-3"><strong>« {tx("dicte bonjour", "write hello")} »</strong><br /><span className="text-muted-foreground">{tx("Écrit dans le champ de texte actif (jamais dans un mot de passe).", "Writes into the active text field (never into a password).")}</span></li>
            <li className="rounded-lg border p-3"><strong>« {tx("clique sur services", "click on services")} »</strong><br /><span className="text-muted-foreground">{tx("Active un lien de la page ou un bouton marqué pour la voix. Les actions qui envoient ou créent demandent un « oui ».", "Activates a link on the page or a voice-enabled button. Actions that send or create ask for a “yes”.")}</span></li>
          </ul>
        </section>
      </div>
    </Container>
  )
}
