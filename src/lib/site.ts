import type { PresetId } from "@/lib/presets"

interface SiteConfig {
  name: string
  shortName: string
  tagline: string
  description: string
  defaultPreset: PresetId
  defaultMode: "light" | "dark" | "system"
  team: { name: string; role: string }[]
  repoUrl: string
}

/**
 * Identité du projet : à modifier EN PREMIER quand le sujet est révélé.
 * Tout le reste de l'interface lit ces valeurs (en-tête, pied de page, titres).
 * Gardez les recherches "TODO(webcup)" : `npm run release` échoue tant qu'il en reste.
 */
export const SITE: SiteConfig = {
  name: "Nom du projet", // TODO(webcup)
  shortName: "Projet", // TODO(webcup)
  tagline: "Une phrase qui dit à qui s'adresse l'application et ce qu'elle permet de faire.", // TODO(webcup)
  description: "Application web réalisée en 24h pour le 24h by Webcup Madagascar 2026.", // TODO(webcup)
  defaultPreset: "lagon",
  defaultMode: "system",
  team: [
    { name: "Prénom Nom", role: "Produit et pitch" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Design et interface" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Développement" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Données et déploiement" }, // TODO(webcup)
  ],
  repoUrl: "",
}
