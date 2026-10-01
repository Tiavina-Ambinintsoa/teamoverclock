import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"

/**
 * Bandeau affiché en haut de chaque page-modèle (dossier pages/templates/).
 * Il n'apparaît jamais au jury : ces pages ne sont montées dans le routeur que si
 * VITE_ENABLE_KIT=true (voir app/router.tsx), comme /kit.
 *
 * GARDER cette page telle quelle ? Laissez-la sous pages/templates/, adaptez son contenu.
 * L'INTÉGRER à l'app pour de vrai ? Déplacez le fichier hors de pages/templates/, sortez sa route
 * du bloc conditionné par env.enableKit dans app/router.tsx, retirez cet <TemplateNotice>.
 * NE PAS EN AVOIR BESOIN ? Supprimez le fichier et sa route dans app/router.tsx. Rien d'autre n'en dépend.
 */
export function TemplateNotice({ title, usage }: { title: string; usage: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/50 px-4 py-3 text-sm">
      <p>
        <Badge variant="outline" className="mr-2 align-middle">
          Modèle
        </Badge>
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground"> — {usage}</span>
      </p>
      <Link to="/modeles" className="shrink-0 font-medium text-primary underline-offset-4 hover:underline">
        ← Tous les modèles
      </Link>
    </div>
  )
}
