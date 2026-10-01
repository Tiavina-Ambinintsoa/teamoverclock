/** Thèmes disponibles (définis dans src/styles/presets.css). */
export const PRESETS = [
  { id: "lagon", label: "Lagon", hint: "Océan Indien, voyage, nature, bien-être" },
  { id: "laterite", label: "Latérite", hint: "Culture, artisanat, communauté, terroir" },
  { id: "baobab", label: "Baobab", hint: "Écologie, agriculture, santé, sobriété" },
  { id: "cosmos", label: "Cosmos", hint: "Science-fiction, IA, jeux (meilleur en mode sombre)" },
  { id: "encre", label: "Encre", hint: "Émotion, éditorial, mémoire, minimalisme" },
] as const

export type PresetId = (typeof PRESETS)[number]["id"]

export function isPresetId(value: unknown): value is PresetId {
  return PRESETS.some((preset) => preset.id === value)
}
