import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const allowedOrigins = (Deno.env.get("APP_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? ""
  const acceptedOrigin = allowedOrigins.length
    ? (allowedOrigins.includes(origin) ? origin : "null")
    : (origin || "*")

  return {
    "Access-Control-Allow-Origin": acceptedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin")
  return !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)
}

export function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  })
}

export function preflight(request: Request) {
  if (request.method !== "OPTIONS") return null
  return new Response("ok", { headers: corsHeaders(request) })
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization") ?? ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
}

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) throw new Error("Secrets Supabase manquants côté Edge Function.")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function userClient(request: Request) {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  const authorization = request.headers.get("Authorization")
  if (!url || !key || !authorization) throw new Error("Session ou configuration Supabase manquante.")
  return createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function authenticatedUser(request: Request) {
  const token = getBearerToken(request)
  if (!token) return { user: null, error: "Connexion requise." }
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  if (!url || !key) return { user: null, error: "Configuration Supabase Edge Function incomplète." }

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return { user: null, error: "Session expirée ou invalide." }
  return { user: data.user, error: null }
}

export function htmlEscape(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character)
}
