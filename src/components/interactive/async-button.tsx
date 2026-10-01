import { useState, type ComponentProps, type ReactNode } from "react"
import { Check, LoaderCircle, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Phase = "idle" | "pending" | "success" | "error"

export interface AsyncButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
  children: ReactNode
  successLabel?: string
  errorLabel?: string
  /** Peut échouer (throw / rejet) : le bouton repasse alors à "error" puis "idle". */
  onClick: () => Promise<void> | void
  /** Durée d'affichage de l'état réussi/erreur avant de revenir à "idle". */
  resetAfterMs?: number
}

/**
 * Bouton "Enregistrer / Publier / Envoyer" prêt à l'emploi : passe tout seul par
 * chargement -> succès (ou erreur) -> repos, avec l'icône et le texte qui vont avec.
 * Remplace le habituel `disabled={pending}` + `toast` recopié à la main dans chaque formulaire.
 */
export function AsyncButton({
  children,
  successLabel = "Fait",
  errorLabel = "Échec",
  onClick,
  resetAfterMs = 1600,
  className,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle")

  const handleClick = async () => {
    setPhase("pending")
    try {
      await onClick()
      setPhase("success")
    } catch {
      setPhase("error")
    } finally {
      setTimeout(() => setPhase("idle"), resetAfterMs)
    }
  }

  return (
    <Button
      {...props}
      disabled={disabled || phase === "pending"}
      onClick={handleClick}
      className={cn("relative overflow-hidden transition-colors", phase === "success" && "bg-chart-5 hover:bg-chart-5", className)}
    >
      {phase === "pending" && <LoaderCircle className="animate-spin" />}
      {phase === "success" && <Check />}
      {phase === "error" && <X />}
      {phase === "pending" ? "Un instant…" : phase === "success" ? successLabel : phase === "error" ? errorLabel : children}
    </Button>
  )
}
