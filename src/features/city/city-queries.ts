import { useQuery } from "@tanstack/react-query"

import type { Building, DangerRow, NewsItem, Sector, Service, Transport } from "@/lib/db-types"
import { escapeSearch, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

/** Les données publiques de la ville sont protégées par la RLS : on ne filtre ici que l'affichage. */
const STALE = 60_000

export function filterBuildingsForService(buildings: Building[], serviceId?: string | null): Building[] {
  return serviceId ? buildings.filter((building) => building.service_id === serviceId) : buildings
}

export function filterFacilities(
  buildings: Building[],
  search: string,
  facilityType = ""
): Building[] {
  const term = search.trim().toLocaleLowerCase()
  return buildings.filter((building) => {
    if (facilityType && building.facility_type !== facilityType) return false
    if (!term) return true
    return [
      building.name,
      building.address ?? "",
      building.description ?? "",
      ...(building.offerings ?? []),
    ].some((value) => value.toLocaleLowerCase().includes(term))
  })
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    staleTime: STALE,
    queryFn: async (): Promise<Sector[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("sectors").select("*").order("code"), [])
    },
  })
}

export function useBuildings(filters: { serviceId?: string } = {}) {
  return useQuery({
    queryKey: ["buildings", filters.serviceId ?? ""],
    staleTime: STALE,
    queryFn: async (): Promise<Building[]> => {
      if (!supabase) return []
      let query = supabase.from("buildings").select("*").order("name")
      if (filters.serviceId) query = query.eq("service_id", filters.serviceId)
      return unwrap(await query, [])
    },
  })
}

export interface ServiceFilters {
  search?: string
  category?: string
}

export function useServices(filters: ServiceFilters = {}) {
  const search = escapeSearch(filters.search ?? "")
  return useQuery({
    queryKey: ["services", search, filters.category ?? ""],
    staleTime: STALE,
    queryFn: async (): Promise<Service[]> => {
      if (!supabase) return []
      let query = supabase.from("services").select("*").order("name")
      if (filters.category) query = query.eq("category", filters.category)
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
      return unwrap(await query, [])
    },
  })
}

export function useService(slug: string | undefined) {
  return useQuery({
    queryKey: ["service", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async (): Promise<Service | null> => {
      if (!supabase || !slug) return null
      return unwrap(await supabase.from("services").select("*").eq("slug", slug).maybeSingle(), null)
    },
  })
}

export function useTransports() {
  return useQuery({
    queryKey: ["transports"],
    staleTime: 30_000,
    queryFn: async (): Promise<Transport[]> => {
      if (!supabase) return []
      return unwrap(await supabase.from("transports").select("*").order("code"), [])
    },
  })
}

export interface NewsFilters {
  search?: string
  category?: string
  /** "active" = publiées et non expirées ; "archive" = archivées ou expirées. */
  scope?: "active" | "archive"
}

/** Une actualité est active si elle est publiée et si sa validité n'est pas dépassée (D06). */
export function isNewsActive(item: Pick<NewsItem, "status" | "valid_until">, now: Date = new Date()): boolean {
  if (item.status !== "published") return false
  return !item.valid_until || new Date(item.valid_until).getTime() >= now.getTime()
}

export function useNews(filters: NewsFilters = {}) {
  const search = escapeSearch(filters.search ?? "")
  return useQuery({
    queryKey: ["news", search, filters.category ?? "", filters.scope ?? "active"],
    staleTime: 30_000,
    queryFn: async (): Promise<NewsItem[]> => {
      if (!supabase) return []
      let query = supabase
        .from("news")
        .select("*")
        .in("status", ["published", "archived"])
        .order("published_at", { ascending: false })
      if (filters.category) query = query.eq("category", filters.category)
      if (search) query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
      const items = unwrap(await query, [] as NewsItem[])
      const wantActive = (filters.scope ?? "active") === "active"
      return items.filter((item) => isNewsActive(item) === wantActive)
    },
  })
}

export function useNewsItem(slug: string | undefined) {
  return useQuery({
    queryKey: ["news-item", slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<NewsItem | null> => {
      if (!supabase || !slug) return null
      return unwrap(await supabase.from("news").select("*").eq("slug", slug).maybeSingle(), null)
    },
  })
}

export function useDangers() {
  return useQuery({
    queryKey: ["dangers"],
    staleTime: 30_000,
    queryFn: async (): Promise<DangerRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase.from("dangers").select("*").in("status", ["active", "archived"]).order("valid_from", { ascending: false }),
        []
      )
    },
  })
}

export function useDanger(slug: string | undefined) {
  return useQuery({
    queryKey: ["danger", slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<DangerRow | null> => {
      if (!supabase || !slug) return null
      return unwrap(await supabase.from("dangers").select("*").eq("slug", slug).maybeSingle(), null)
    },
  })
}
