/** Styles de surface sélectionnables dans les paramètres, appliqués au site entier. */
export const MORPHISMS = [
  { id: "standard", label: "Standard", description: "Style sobre du thème sélectionné" },
  { id: "glass", label: "Glassmorphisme", description: "Surfaces translucides, verre dépoli et flou" },
  { id: "clay", label: "Claymorphisme", description: "Surfaces douces, volumineuses et colorées" },
  { id: "skeuomorphic", label: "Skeuomorphisme", description: "Dégradés, reliefs et contrôles inspirés du réel" },
  { id: "neumorphic", label: "Neumorphisme", description: "Reliefs doux dans la couleur de fond" },
  { id: "minimal", label: "Minimalisme", description: "Surfaces planes, lignes fines et peu d'ombres" },
  { id: "neo-brutalist", label: "Néo-brutalisme", description: "Contours épais, couleurs franches et ombres dures" },
  { id: "liquid-glass", label: "Liquid glass", description: "Verre irisé, reflets fluides et transparence" },
] as const

export type MorphismId = (typeof MORPHISMS)[number]["id"]

export function isMorphismId(value: unknown): value is MorphismId {
  return MORPHISMS.some((morphism) => morphism.id === value)
}
