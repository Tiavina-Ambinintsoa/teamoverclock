import type { ReactNode } from "react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface LightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Titre annoncé aux lecteurs d'écran (peut être masqué visuellement via `titleVisible={false}`). */
  title: string
  titleVisible?: boolean
  children: ReactNode
  className?: string
}

/**
 * Fenêtre modale plein cadre pour agrandir une image, une vidéo ou tout autre contenu :
 * fond sombre, fermeture au clic extérieur ou à la touche Échap, focus géré automatiquement
 * (construit sur Radix Dialog, donc accessible par défaut). Utilisée par les modèles Galerie et Vidéo.
 */
export function Lightbox({ open, onOpenChange, title, titleVisible = false, children, className }: LightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl border-none bg-transparent p-0 shadow-none sm:p-0", className)}>
        <DialogTitle className={titleVisible ? "text-foreground" : "sr-only"}>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
