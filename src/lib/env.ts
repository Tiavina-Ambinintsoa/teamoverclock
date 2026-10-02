/**
 * Point d'entrée UNIQUE pour les variables d'environnement.
 * Rappel : tout ce qui commence par VITE_ est inclus dans le build => public.
 * Ne mettez jamais de clé secrète ici (sb_secret_..., service_role, clé LLM...).
 */
const flag = (value: string | undefined) => value === "true" || value === "1"
const clean = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export const env = {
  supabaseUrl: clean(import.meta.env.VITE_SUPABASE_URL),
  supabaseKey: clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  demoEmail: clean(import.meta.env.VITE_DEMO_EMAIL),
  demoPassword: clean(import.meta.env.VITE_DEMO_PASSWORD),
  hashRouter: flag(import.meta.env.VITE_USE_HASH_ROUTER),
  /** Les pages /kit et /modeles (outillage d'équipe) : toujours en dev, opt-in en prod. */
  enableKit: import.meta.env.DEV || flag(import.meta.env.VITE_ENABLE_KIT),
  enableAIChat: flag(import.meta.env.VITE_ENABLE_AI_CHAT),
  enableAIHistory: flag(import.meta.env.VITE_ENABLE_AI_HISTORY),
} as const
