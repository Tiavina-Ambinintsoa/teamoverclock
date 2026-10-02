import type { LucideIcon } from "lucide-react"
import { Box, CalendarDays, Images, LayoutDashboard, MapPinned, MousePointerClick, PanelsTopLeft, Rows3, Sparkles, Video } from "lucide-react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Template {
  to: string
  icon: LucideIcon
  title: string
  description: string
  tags: string[]
}

const TEMPLATES: Template[] = [
  {
    to: "/modeles/accueils",
    icon: PanelsTopLeft,
    title: "Variantes d'accueil",
    description: "Comparez l'accueil classique, futuriste gaming, avec image en parallaxe et objet 3D central.",
    tags: ["Hero", "Parallaxe", "3D"],
  },
  {
    to: "/modeles/animations",
    icon: Sparkles,
    title: "Animations et transitions",
    description: "Hero, navigation flottante, WebGL, texte, sliders, bento et effets décoratifs.",
    tags: ["Motion", "WebGL", "Magic UI"],
  },
  {
    to: "/modeles/agenda",
    icon: CalendarDays,
    title: "Agenda d'équipe",
    description: "Liste d'événements avec recherche, filtres à venir/terminés et dates relatives.",
    tags: ["Planning", "Événements", "Échéances"],
  },
  {
    to: "/modeles/carte",
    icon: MapPinned,
    title: "Carte des lieux",
    description: "Carte MapTiler détaillée avec aperçu local de secours, recherche par ville et lieux sélectionnables.",
    tags: ["MapTiler", "Localisation", "Points de service"],
  },
  {
    to: "/modeles/galerie",
    icon: Images,
    title: "Galerie",
    description: "Grille filtrable + visionneuse plein cadre, navigable au clavier.",
    tags: ["Portfolio", "Marketplace", "Photos"],
  },
  {
    to: "/modeles/3d",
    icon: Box,
    title: "3D",
    description: "Objet interactif (glisser pour orienter), couleurs alignées sur le thème.",
    tags: ["Futuriste", "Espace", "Produit"],
  },
  {
    to: "/modeles/video",
    icon: Video,
    title: "Vidéo",
    description: "Lecteur avec commandes maison + grille de vidéos en plein cadre.",
    tags: ["Démo", "Témoignage", "Teaser"],
  },
  {
    to: "/modeles/interactions",
    icon: MousePointerClick,
    title: "Boutons et animations",
    description: "Bouton de chargement, j'aime, info-bulle, révélation au défilement, compteurs.",
    tags: ["Micro-interactions", "Finition"],
  },
  {
    to: "/modeles/marketing",
    icon: Rows3,
    title: "Sections marketing",
    description: "Hero, fonctionnalités, tarifs, témoignages, FAQ : à assembler pour une page d'accueil.",
    tags: ["Landing", "Vitrine", "Présentation"],
  },
  {
    to: "/modeles/tableau-de-bord",
    icon: LayoutDashboard,
    title: "Tableau de bord",
    description: "Cartes KPI, graphiques (barres, anneau, courbe), activité récente.",
    tags: ["Admin", "Statistiques", "Suivi"],
  },
]

export function TemplatesIndexPage() {
  return (
    <Container className="py-10">
      <title>Modèles de pages</title>
      <h1 className="text-3xl font-semibold sm:text-4xl">Modèles de pages</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Des pages entières, prêtes à l'emploi, pour les besoins qui reviennent d'une équipe à l'autre. Chacune est
        indépendante des autres.
      </p>
      <div className="mt-4 grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Vous en gardez une ?</span> Renommez-la, sortez-la du dossier
          <code className="mx-1 rounded bg-background px-1 py-0.5">pages/templates/</code>
          et de sa condition <code className="rounded bg-background px-1 py-0.5">env.enableKit</code> dans{" "}
          <code className="rounded bg-background px-1 py-0.5">app/router.tsx</code>.
        </p>
        <p>
          <span className="font-medium text-foreground">Vous n'en avez pas besoin ?</span> Supprimez le fichier et sa
          ligne de route. Rien d'autre n'en dépend — voir{" "}
          <code className="rounded bg-background px-1 py-0.5">README.md</code>.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map(({ to, icon: Icon, title, description, tags }) => (
          <Link key={to} to={to} viewTransition className="group">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md">
              <CardHeader>
                <Icon className="size-6 text-primary" aria-hidden />
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  )
}
