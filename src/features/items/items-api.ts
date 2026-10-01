import type { PostgrestError } from "@supabase/supabase-js"

import type { AppUser } from "@/features/auth/auth-context"
import { readCollection, uid, writeCollection } from "@/lib/local-db"
import { supabase } from "@/lib/supabase"

/**
 * EXEMPLE DE TRANCHE VERTICALE (à renommer selon le sujet) : "Notes".
 * Le même contrat marche avec Supabase (vraie base) et en mode démo local.
 * Remplacez "items" / "Item" par l'objet principal de votre application.
 */
export interface Item {
  id: string
  user_id: string
  title: string
  content: string | null
  is_public: boolean
  created_at: string
  author_name: string | null
}

export interface NewItem {
  title: string
  content: string
  is_public: boolean
}

type ItemRow = Omit<Item, "author_name"> & { profiles: { display_name: string | null } | null }

const SELECT = "id, user_id, title, content, is_public, created_at, profiles(display_name)"

const toItem = (row: ItemRow): Item => {
  const { profiles, ...rest } = row
  return { ...rest, author_name: profiles?.display_name ?? null }
}

/** Traduit les erreurs PostgREST les plus fréquentes en consigne actionnable. */
function fail(error: PostgrestError): never {
  if (/failed to fetch|networkerror|network request failed/i.test(error.message)) {
    throw new Error("Connexion impossible : vérifiez votre réseau.")
  }
  if (error.code === "42501") {
    throw new Error("Accès refusé par la base : il manque un GRANT ou une policy RLS (voir supabase/schema.sql).")
  }
  if (error.code === "PGRST205" || error.code === "42P01") {
    throw new Error("Table introuvable : exécutez supabase/schema.sql dans le SQL Editor de Supabase.")
  }
  throw new Error(error.message)
}

const SEED: Item[] = [
  {
    id: "seed-1",
    user_id: "seed",
    title: "Bienvenue dans le mode démo",
    content: "Ces données vivent dans votre navigateur. Créez, supprimez, rechargez : tout est conservé.",
    is_public: true,
    created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    author_name: "Équipe",
  },
  {
    id: "seed-2",
    user_id: "seed",
    title: "Une note visible par tous",
    content: null,
    is_public: true,
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    author_name: "Équipe",
  },
]

export async function listItems(user: AppUser): Promise<Item[]> {
  if (!supabase || user.isDemo) {
    return readCollection<Item>("items", SEED)
      .filter((item) => item.is_public || item.user_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  // La visibilité (publique ou à soi) est garantie par les policies RLS côté base.
  const { data, error } = await supabase.from("items").select(SELECT).order("created_at", { ascending: false })
  if (error) fail(error)
  return (data as unknown as ItemRow[]).map(toItem)
}

export async function getItem(id: string, user: AppUser): Promise<Item | null> {
  if (!supabase || user.isDemo) {
    const found = readCollection<Item>("items", SEED).find((item) => item.id === id)
    return found && (found.is_public || found.user_id === user.id) ? found : null
  }
  const { data, error } = await supabase.from("items").select(SELECT).eq("id", id).maybeSingle()
  if (error) fail(error)
  return data ? toItem(data as unknown as ItemRow) : null
}

export async function createItem(input: NewItem, user: AppUser): Promise<Item> {
  const content = input.content.trim() || null
  const title = input.title.trim()

  if (!supabase || user.isDemo) {
    const item: Item = {
      id: uid(),
      user_id: user.id,
      title,
      content,
      is_public: input.is_public,
      created_at: new Date().toISOString(),
      author_name: user.displayName,
    }
    writeCollection("items", [item, ...readCollection<Item>("items", SEED)])
    return item
  }
  // user_id est rempli par la base (default auth.uid()) : impossible d'usurper un autre auteur.
  const { data, error } = await supabase
    .from("items")
    .insert({ title, content, is_public: input.is_public })
    .select(SELECT)
    .single()
  if (error) fail(error)
  return toItem(data as unknown as ItemRow)
}

export async function updateItem(id: string, input: NewItem, user: AppUser): Promise<void> {
  const content = input.content.trim() || null
  const title = input.title.trim()

  if (!supabase || user.isDemo) {
    const rows = readCollection<Item>("items", SEED)
    writeCollection(
      "items",
      rows.map((item) =>
        item.id === id && item.user_id === user.id ? { ...item, title, content, is_public: input.is_public } : item
      )
    )
    return
  }
  const { error } = await supabase.from("items").update({ title, content, is_public: input.is_public }).eq("id", id)
  if (error) fail(error)
}

export async function deleteItem(id: string, user: AppUser): Promise<void> {
  if (!supabase || user.isDemo) {
    const rows = readCollection<Item>("items", SEED)
    writeCollection(
      "items",
      rows.filter((item) => !(item.id === id && item.user_id === user.id))
    )
    return
  }
  const { error } = await supabase.from("items").delete().eq("id", id)
  if (error) fail(error)
}
