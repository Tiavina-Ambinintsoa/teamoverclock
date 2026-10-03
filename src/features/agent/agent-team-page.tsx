import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { fetchDisplayNames } from "@/features/requests/request-queries"
import { useServices } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface Member { id: string; profile_id: string; service_id: string; member_role: "agent" | "admin"; can_validate_reports: boolean; revoked_at: string | null }

/** D08 — un administrateur de service gère les agents de SON périmètre uniquement (la RLS refuse le reste). */
export function AgentTeamPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices({})
  const adminServices = (services.data ?? []).filter((s) => user?.isAdmin || user?.validatorServiceIds.includes(s.id))
  const [serviceId, setServiceId] = useState("")
  const [candidate, setCandidate] = useState("")
  const activeService = serviceId || adminServices[0]?.id || ""

  const team = useQuery({
    queryKey: ["team", activeService],
    enabled: Boolean(supabase && activeService),
    queryFn: async () => {
      if (!supabase) return { members: [] as Member[], names: {} as Record<string, string> }
      const members = unwrap(await supabase.from("service_members").select("*").eq("service_id", activeService).order("granted_at"), []) as Member[]
      return { members, names: await fetchDisplayNames(members.map((m) => m.profile_id)) }
    },
  })

  const agents = useQuery({
    queryKey: ["assignable-agents"],
    enabled: Boolean(supabase && user),
    queryFn: async () => {
      if (!supabase) return [] as { id: string; display_name: string | null }[]
      return unwrap(await supabase.rpc("list_agents"), []) as { id: string; display_name: string | null }[]
    },
  })

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["team"] })

  const add = useMutation({
    mutationFn: async () => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("service_members").upsert(
        { profile_id: candidate, service_id: activeService, member_role: "agent", can_validate_reports: false, granted_by: user.id, revoked_at: null },
        { onConflict: "profile_id,service_id" }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => { setCandidate(""); toast.success(tx("Agent rattaché.", "Agent attached.")); await refresh() },
    onError: (error: Error) => toast.error(error.message),
  })

  const patch = useMutation({
    mutationFn: async (input: { id: string; values: Record<string, unknown> }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("service_members").update(input.values).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-4xl">
      <title>{tx("Mon équipe", "My team")}</title>
      <PageHeader eyebrow={tx("Espace agent", "Agent workspace")} title={tx("Mon équipe", "My team")} description={tx("Rattachez des agents à votre service et choisissez qui peut valider les signalements.", "Attach agents to your service and choose who can validate reports.")} />
      {adminServices.length === 0 ? (
        <p role="note" className="rounded-lg border p-4 text-sm text-muted-foreground">{tx("Cette page est réservée aux administrateurs de service.", "This page is reserved for service administrators.")}</p>
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <label htmlFor="team-service" className="mb-1 block text-sm font-medium">{tx("Service", "Service")}</label>
            <Select id="team-service" value={activeService} onChange={(e) => setServiceId(e.target.value)}>
              {adminServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <ul className="mb-6 grid gap-2">
            {(team.data?.members ?? []).filter((m) => !m.revoked_at).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
                <span className="font-medium">{team.data?.names[m.profile_id] ?? "—"} <span className="text-sm font-normal text-muted-foreground">· {m.member_role}</span></span>
                {m.member_role === "agent" && (
                  <span className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={m.can_validate_reports} disabled={patch.isPending} onChange={(e) => patch.mutate({ id: m.id, values: { can_validate_reports: e.target.checked } })} />{tx("Peut valider", "Can validate")}</label>
                    <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ id: m.id, values: { revoked_at: new Date().toISOString() } })}>{tx("Révoquer", "Revoke")}</Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
            <div className="grid gap-1">
              <label htmlFor="team-agent" className="text-sm font-medium">{tx("Ajouter un agent", "Add an agent")}</label>
              <Select id="team-agent" className="w-64" value={candidate} onChange={(e) => setCandidate(e.target.value)}>
                <option value="">—</option>
                {(agents.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </Select>
            </div>
            <Button disabled={!candidate || add.isPending} onClick={() => add.mutate()}>{tx("Rattacher", "Attach")}</Button>
          </div>
        </>
      )}
    </Container>
  )
}
