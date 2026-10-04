import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "@/components/theme-context"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { safeStorage } from "@/lib/storage"
import type { PresetId } from "@/lib/presets"

const choiceKey = (userId: string) => `webcup:theme-choice:v1:${userId}`
function ThemeChoiceForUser({ userId }: { userId: string }) {
  const { tx } = useLocale()
  const { setPreset, setMode, setTypography, setMorphism } = useTheme()
  const [open, setOpen] = useState(() => safeStorage.get(choiceKey(userId)) !== "complete")

  const choose = (choice: PresetId) => {
    safeStorage.set(choiceKey(userId), "complete")
    setPreset(choice)
    if (choice === "minimalist") {
      setMode("light")
      setTypography("system")
      setMorphism("standard")
    }
    setOpen(false)
  }

  // Le thème minimaliste coupe les animations : Radix n'attendrait jamais la fin de l'animation de sortie.
  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{tx("Choisissez votre expérience", "Choose your experience")}</DialogTitle>
          <DialogDescription>
            {tx(
              "L’environnement compte pour nous. Choisissez une expérience futuriste ou une interface minimaliste qui utilise moins d’effets, d’animations et de ressources.",
              "The environment matters to us. Choose a futuristic experience or a minimalist interface that uses fewer effects, animations, and resources."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-4 text-left" onClick={() => choose("nova-terra")}>
            <span className="font-semibold">{tx("Nova Terra", "Nova Terra")}</span>
            <span className="text-xs font-normal opacity-80">{tx("Expérience futuriste avec effets visuels.", "Futuristic experience with visual effects.")}</span>
          </Button>
          <Button type="button" variant="outline" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-4 text-left" onClick={() => choose("minimalist")}>
            <span className="font-semibold">{tx("Minimaliste", "Minimalist")}</span>
            <span className="text-xs font-normal">{tx("Sans animations décoratives ni carte 3D, pour une utilisation plus légère.", "No decorative animations or 3D map, for a lighter experience.")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ThemeChoiceDialog() {
  const { user } = useAuth()
  if (!user) return null
  return <ThemeChoiceForUser key={user.id} userId={user.id} />
}
