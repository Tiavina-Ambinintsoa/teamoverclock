import { useState } from "react"
import { Accessibility, CircleHelp, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAccessibility } from "@/features/accessibility/accessibility-context"
import { stopSpeaking } from "@/features/voice/speech"
import { AccessibilityPanel } from "@/features/accessibility/accessibility-panel"
import { useGuide } from "@/features/guide/guide-context"
import { useLocale } from "@/lib/locale"

/** Quick access controls stay beside the chatbot on every route. */
export function FloatingAccessibilityControls() {
  const { prefs, update } = useAccessibility()
  const { tx } = useLocale()
  const guide = useGuide()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={tx("Visite guidée de cette page", "Guided tour of this page")}
        title={tx("Aide sur cette page", "Help for this page")}
        className="fixed right-5 bottom-52 z-50 size-11 rounded-full shadow-lg"
        onClick={guide.startPage}
      >
        <CircleHelp aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={prefs.readScreenAloud ? "secondary" : "outline"}
        aria-label={prefs.readScreenAloud ? tx("Désactiver la lecture de l'écran", "Turn off screen reading") : tx("Activer la lecture de l'écran", "Turn on screen reading")}
        aria-pressed={prefs.readScreenAloud}
        title={prefs.readScreenAloud ? tx("Lecture de l'écran activée", "Screen reading on") : tx("Lecture de l'écran désactivée", "Screen reading off")}
        className="fixed right-5 bottom-36 z-50 size-11 rounded-full shadow-lg"
        onClick={() => {
          if (prefs.readScreenAloud) stopSpeaking()
          update({ readScreenAloud: !prefs.readScreenAloud })
        }}
      >
        {prefs.readScreenAloud ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={tx("Ouvrir les réglages d'accessibilité", "Open accessibility settings")}
        aria-expanded={open}
        className="fixed right-5 bottom-20 z-50 size-11 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Accessibility aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tx("Réglages rapides d'accessibilité", "Quick accessibility settings")}</DialogTitle>
            <DialogDescription>{tx("Les changements prennent effet immédiatement.", "Changes take effect immediately.")}</DialogDescription>
          </DialogHeader>
          <AccessibilityPanel />
        </DialogContent>
      </Dialog>
    </>
  )
}
