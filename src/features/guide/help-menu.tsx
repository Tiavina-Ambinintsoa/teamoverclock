import { BookOpen, HelpCircle, Mic, PlayCircle, Settings, Volume2 } from "lucide-react"
import { Link } from "react-router"

import { useGuide } from "@/features/guide/guide-context"
import { useVoice } from "@/features/voice/voice-context"
import { useLocale } from "@/lib/locale"

/** Menu d'aide : visite guidée, aide vocale, lecture de la page, guide complet et réglages d'accessibilité. */
export function HelpMenu() {
  const { tx } = useLocale()
  const guide = useGuide()
  const voice = useVoice()
  const close = (target: HTMLElement) => target.closest("details")?.removeAttribute("open")
  const item = "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"

  return (
    <details className="relative" data-tour="help">
      <summary
        className="grid size-9 cursor-pointer list-none place-items-center rounded-md hover:bg-accent"
        aria-label={tx("Aide, guide et accessibilité", "Help, guide and accessibility")}
        title={tx("Aide, guide et accessibilité", "Help, guide and accessibility")}
      >
        <HelpCircle className="size-5" aria-hidden />
      </summary>
      <div className="absolute top-11 right-0 z-50 grid w-64 gap-1 rounded-xl border bg-popover p-2 shadow-lg">
        <button type="button" className={item} onClick={(e) => { close(e.currentTarget); guide.start("welcome") }}>
          <PlayCircle className="size-4" aria-hidden />{tx("Lancer la visite guidée", "Start the guided tour")}
        </button>
        <button type="button" className={item} onClick={(e) => { close(e.currentTarget); voice.help() }}>
          <Mic className="size-4" aria-hidden />{tx("Aide vocale : où suis-je ?", "Voice help: where am I?")}
        </button>
        <button type="button" className={item} onClick={(e) => { close(e.currentTarget); voice.readPage() }}>
          <Volume2 className="size-4" aria-hidden />{tx("Lire cette page à voix haute", "Read this page aloud")}
        </button>
        <Link to="/guide" className={item} onClick={(e) => close(e.currentTarget)}><BookOpen className="size-4" aria-hidden />{tx("Guide complet (texte)", "Full guide (text)")}</Link>
        <Link to="/app/parametres" className={item} onClick={(e) => close(e.currentTarget)}><Settings className="size-4" aria-hidden />{tx("Accessibilité et paramètres", "Accessibility & settings")}</Link>
      </div>
    </details>
  )
}
