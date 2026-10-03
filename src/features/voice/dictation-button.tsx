import { Mic, MicOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useDictation } from "@/features/voice/use-dictation"
import { useLocale } from "@/lib/locale"

export interface DictationButtonProps {
  /** Reçoit chaque morceau de texte reconnu (à ajouter au champ). */
  onText: (text: string) => void
}

/** Bouton « Dicter » : micro à la demande, texte provisoire annoncé, erreurs explicites, alternative clavier toujours disponible. */
export function DictationButton({ onText }: DictationButtonProps) {
  const { tx } = useLocale()
  const { supported, listening, interim, error, start, stop } = useDictation(onText)

  if (!supported) {
    return <p className="text-xs text-muted-foreground">{tx("La dictée vocale n'est pas disponible sur ce navigateur : saisissez le texte au clavier.", "Voice dictation is not available in this browser: type the text instead.")}</p>
  }

  return (
    <div className="grid gap-1">
      <Button type="button" variant={listening ? "destructive" : "outline"} size="sm" className="w-fit" aria-pressed={listening} onClick={listening ? stop : start}>
        {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
        {listening ? tx("Arrêter la dictée", "Stop dictation") : tx("Dicter à voix haute", "Dictate out loud")}
      </Button>
      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {listening ? (interim ? `${tx("Écoute…", "Listening…")} ${interim}` : tx("Écoute…", "Listening…")) : ""}
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
