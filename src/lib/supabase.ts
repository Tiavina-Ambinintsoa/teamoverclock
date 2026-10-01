import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

/**
 * Client Supabase, ou `null` si les variables d'environnement sont absentes :
 * l'application bascule alors automatiquement en mode démo local (lib/local-db.ts).
 *
 * Pour des types générés depuis votre schéma : `npx supabase gen types typescript --project-id <id>`
 * puis createClient<Database>(...).
 */
export const supabase =
  env.supabaseUrl && env.supabaseKey ? createClient(env.supabaseUrl, env.supabaseKey) : null

export const isBackendConfigured = supabase !== null
