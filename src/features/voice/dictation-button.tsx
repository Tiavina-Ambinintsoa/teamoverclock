import { Mic, MicOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useDictation, type DictationVoiceResponse } from "@/features/voice/use-dictation"
import { useLocale } from "@/lib/locale"

export interface DictationButtonProps {
  /** Reçoit chaque morceau de texte reconnu (à ajouter au champ). */
  onText: (text: string) => void
  sendVoiceMessage?: (audio: Blob, language: string) => Promise<DictationVoiceResponse>
  onVoiceResponse?: (response: DictationVoiceResponse) => void | Promise<void>
}

/** Bouton « Dicter » : micro à la demande, texte provisoire annoncé, erreurs explicites, alternative clavier toujours disponible. */
export function DictationButton({ onText, sendVoiceMessage, onVoiceResponse }: DictationButtonProps) {
  const { tx } = useLocale()
  const { supported, voiceChatSupported, listening, processing, interim, error, start, stop } =
    useDictation(onText, undefined, sendVoiceMessage, onVoiceResponse)

  if (!supported) {
    return <p className="text-xs text-muted-foreground">{tx("La dictée vocale n'est pas disponible sur ce navigateur : saisissez le texte au clavier.", "Voice dictation is not available in this browser: type the text instead.")}</p>
  }

  return (
    <div className="grid gap-1">
      <Button type="button" variant={listening ? "destructive" : "outline"} size="sm" className="w-fit" aria-pressed={listening} disabled={processing} onClick={listening ? stop : () => void start()}>
        {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
        {processing
          ? tx("Transcription…", "Transcribing…")
          : listening
            ? tx("Arrêter la dictée", "Stop dictation")
            : tx("Dicter à voix haute", "Dictate out loud")}
      </Button>
      {voiceChatSupported && <p className="text-xs text-muted-foreground">{tx("Votre voix (30 s max.) sera envoyée à Google AI Studio pour obtenir une réponse fondée sur les informations publiées.", "Your voice (max 30 seconds) will be sent to Google AI Studio for an answer grounded in published information.")}</p>}
      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {processing
          ? tx("Gemini réfléchit…", "Gemini is thinking…")
          : listening
            ? (interim ? `${tx("Écoute…", "Listening…")} ${interim}` : tx("Écoute…", "Listening…"))
            : ""}
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
