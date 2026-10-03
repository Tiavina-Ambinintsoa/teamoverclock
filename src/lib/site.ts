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
 * Gardez les recherches "TODO(webcup)" : npm run release échoue tant qu'il en reste un.
 */
export const SITE: SiteConfig = {
  name: "Nova Terra",
  shortName: "Nova Terra",
  tagline: "La ville fictive et futuriste : services, carte en ruche, signalements et alertes.",
  description: "Portail citoyen de Nova Terra, ville fictive et futuriste : démarches, services, actualités, carte interactive, signalements et assistant vocal.",
  defaultPreset: "nova-terra",
  defaultMode: "dark",
  team: [
    { name: "Prénom Nom", role: "Produit et pitch" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Design et interface" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Développement" }, // TODO(webcup)
    { name: "Prénom Nom", role: "Données et déploiement" }, // TODO(webcup)
  ],
  repoUrl: "",
}
