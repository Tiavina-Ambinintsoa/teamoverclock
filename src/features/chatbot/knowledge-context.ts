import { scoreText, tokenize } from "@/features/chatbot/chatbot-engine"

const MAX_CONTEXT_CHARS = 14_000

function topMatches<T>(items: T[], tokens: string[], text: (item: T) => [string, string], limit: number): T[] {
  return items
    .map((item) => ({ item, score: scoreText(tokens, ...text(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}

/** Ne garde que les enregistrements pertinents pour la question afin de garder le contexte Gemini court (rapide). */
export function selectKnowledge<K extends {
  kb: { title: string; content: string }[]
  services: { name: string; category: string; description: string | null }[]
  dangers: { title: string; description?: string | null }[]
  buildings: { name: string; address?: string | null; description?: string | null; facility_type?: string | null }[]
  sectors: unknown[]
}>(knowledge: K, question: string): K {
  const tokens = tokenize(question)
  const selected = {
    ...knowledge,
    kb: topMatches(knowledge.kb, tokens, (e) => [e.title, e.content], 6),
    services: topMatches(knowledge.services, tokens, (s) => [`${s.name} ${s.category}`, s.description ?? ""], 4),
    dangers: topMatches(knowledge.dangers, tokens, (d) => [d.title, d.description ?? ""], 3),
    buildings: topMatches(knowledge.buildings, tokens, (b) => [`${b.name} ${b.facility_type ?? ""}`, `${b.address ?? ""} ${b.description ?? ""}`], 4),
    sectors: [] as unknown[],
  } as K
  const full = JSON.stringify(selected)
  if (full.length <= MAX_CONTEXT_CHARS) return selected
  return { ...selected, kb: selected.kb.slice(0, 3), services: selected.services.slice(0, 2), buildings: selected.buildings.slice(0, 2) }
}
