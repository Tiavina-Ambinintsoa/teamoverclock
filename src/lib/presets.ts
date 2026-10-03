/** Thèmes disponibles (définis dans src/styles/presets.css). */
export const PRESETS = [
  { id: "nova-terra", label: "Nova Terra", hint: "Dune-inspired glassmorphism, premium dark & dynamic" },
  { id: "lagon", label: "Lagon", hint: "Océan Indien, voyage, nature, bien-être" },
  { id: "laterite", label: "Latérite", hint: "Culture, artisanat, communauté, terroir" },
  { id: "baobab", label: "Baobab", hint: "Écologie, agriculture, santé, sobriété" },
  { id: "cosmos", label: "Cosmos", hint: "Science-fiction, IA, jeux (meilleur en mode sombre)" },
  { id: "encre", label: "Encre", hint: "Émotion, éditorial, mémoire, minimalisme" },
  { id: "corail", label: "Corail", hint: "Chaleureux, vivant, communautaire" },
  { id: "lavande", label: "Lavande", hint: "Créatif, doux, culturel" },
  { id: "ardoise", label: "Ardoise", hint: "Calme, lisible, professionnel" },
  { id: "rose", label: "Sakura", hint: "Rose poudré, créativité et communauté" },
  { id: "foret", label: "Forêt", hint: "Vert sauge, écologie et bien-être" },
  { id: "sable", label: "Sable", hint: "Ivoire chaud, artisanat et voyage" },
  { id: "ciel", label: "Ciel", hint: "Bleu lumineux, technologie et confiance" },
  { id: "miel", label: "Miel & sauge", hint: "Crème, olive et jaune doré — palette Color Hunt" },
  { id: "canopee", label: "Canopée", hint: "Vert profond, teal et or — palette Color Hunt" },
] as const

export type PresetId = (typeof PRESETS)[number]["id"]

export function isPresetId(value: unknown): value is PresetId {
  return PRESETS.some((preset) => preset.id === value)
}
