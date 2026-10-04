import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useServices } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { escapeSearch, formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import type { AccountStatus, UserRole } from "@/lib/types"

interface MemberRow {
  id: string
  service_id: string
  member_role: "agent" | "admin"
  can_validate_reports: boolean
  revoked_at: string | null
}
interface UserRow {
  id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  role: UserRole
  account_status: AccountStatus
  primary_service_id: string | null
  last_login_at: string | null
  created_at: string
  citizens: { kyc_status: string; reputation_points: number }[] | { kyc_status: string; reputation_points: number } | null
  service_members: MemberRow[]
}

const ROLES: UserRole[] = ["citizen", "agent", "service_admin", "general_admin"]
const STATUSES: AccountStatus[] = ["pending", "active", "suspended", "disabled"]

function kycOf(row: UserRow): string | null {
  const c = row.citizens
  if (!c) return null
  return Array.isArray(c) ? (c[0]?.kyc_status ?? null) : c.kyc_status
}

/** D08 — gestion des profils : rôle, statut, rattachement et appartenances aux services (modifs journalisées par trigger). */
export function AdminUsersPage() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("")
  const [editing, setEditing] = useState<UserRow | null>(null)

  const users = useQuery({
    queryKey: ["admin-users", search, role],
    queryFn: async (): Promise<UserRow[]> => {
      if (!supabase) return []
      let query = supabase
        .from("profiles")
        .select("id,display_name,first_name,last_name,role,account_status,primary_service_id,last_login_at,created_at,citizens(kyc_status,reputation_points),service_members!service_members_profile_id_fkey(id,service_id,member_role,can_validate_reports,revoked_at)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200)
      const term = escapeSearch(search)
      if (term) query = query.or(`display_name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
      if (role) query = query.eq("role", role)
      return unwrap(await query, []) as unknown as UserRow[]
    },
  })

  const serviceName = (id: string | null) => services.data?.find((s) => s.id === id)?.name ?? "—"

  const save = useMutation({
    mutationFn: async (patch: { id: string; role: UserRole; account_status: AccountStatus; primary_service_id: string | null }) => {
      if (!supabase) throw new Error("Supabase")
      const { id, ...values } = patch
      const { error } = await supabase.from("profiles").update(values).eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Profil mis à jour (action journalisée).", "Profile updated (action logged)."))
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setEditing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const addMember = useMutation({
    mutationFn: async (input: { profileId: string; serviceId: string; memberRole: "agent" | "admin"; canValidate: boolean }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("service_members").upsert(
        { profile_id: input.profileId, service_id: input.serviceId, member_role: input.memberRole, can_validate_reports: input.canValidate, revoked_at: null },
        { onConflict: "profile_id,service_id" }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Rattachement enregistré.", "Membership saved."))
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setEditing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const revokeMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.from("service_members").update({ revoked_at: new Date().toISOString() }).eq("id", memberId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Rattachement révoqué.", "Membership revoked."))
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setEditing(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-6xl">
      <title>{tx("Utilisateurs et rôles", "Users & roles")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Utilisateurs et rôles", "Users & roles")} description={tx("Gérez les profils, les droits et les rattachements aux services. Chaque modification est journalisée.", "Manage profiles, rights and service memberships. Every change is logged.")} />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label htmlFor="u-search">{tx("Rechercher", "Search")}</Label>
          <Input id="u-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tx("Nom…", "Name…")} className="w-64" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="u-role">{tx("Rôle", "Role")}</Label>
          <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value)} className="w-52">
            <option value="">{tx("Tous", "All")}</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      </div>

      <DataState data={users.data} isLoading={users.isLoading} error={users.error} onRetry={() => void users.refetch()} emptyTitle={tx("Aucun profil trouvé", "No profile found")}>
        {(rows) => (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("Nom", "Name")}</TableHead>
                  <TableHead>{tx("Rôle", "Role")}</TableHead>
                  <TableHead>{tx("Statut", "Status")}</TableHead>
                  <TableHead>{tx("Identité", "Identity")}</TableHead>
                  <TableHead>{tx("Service principal", "Main service")}</TableHead>
                  <TableHead>{tx("Dernier accès", "Last access")}</TableHead>
                  <TableHead><span className="sr-only">{tx("Actions", "Actions")}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.display_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`}</TableCell>
                    <TableCell><StatusBadge kind="role" value={row.role} /></TableCell>
                    <TableCell><StatusBadge kind="account" value={row.account_status} /></TableCell>
                    <TableCell>{kycOf(row) ? <StatusBadge kind="kyc" value={kycOf(row) as string} /> : "—"}</TableCell>
                    <TableCell>{serviceName(row.primary_service_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(row.last_login_at, tag)}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setEditing(row)}>{tx("Modifier", "Edit")}</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>

      {editing && (
        <EditUserDialog
          row={editing}
          services={services.data ?? []}
          onClose={() => setEditing(null)}
          onSave={(patch) => save.mutate({ id: editing.id, ...patch })}
          onAddMember={(input) => addMember.mutate({ profileId: editing.id, ...input })}
          onRevoke={(memberId) => revokeMember.mutate(memberId)}
          busy={save.isPending || addMember.isPending || revokeMember.isPending}
        />
      )}
    </Container>
  )
}

interface EditUserDialogProps {
  row: UserRow
  services: { id: string; name: string }[]
  busy: boolean
  onClose: () => void
  onSave: (patch: { role: UserRole; account_status: AccountStatus; primary_service_id: string | null }) => void
  onAddMember: (input: { serviceId: string; memberRole: "agent" | "admin"; canValidate: boolean }) => void
  onRevoke: (memberId: string) => void
}

function EditUserDialog({ row, services, busy, onClose, onSave, onAddMember, onRevoke }: EditUserDialogProps) {
  const { tx } = useLocale()
  const [role, setRole] = useState<UserRole>(row.role)
  const [status, setStatus] = useState<AccountStatus>(row.account_status)
  const [primary, setPrimary] = useState(row.primary_service_id ?? "")
  const [memberService, setMemberService] = useState("")
  const [memberRole, setMemberRole] = useState<"agent" | "admin">("agent")
  const [canValidate, setCanValidate] = useState(false)

  const needsService = role === "agent" || role === "service_admin"
  const activeMembers = row.service_members.filter((m) => !m.revoked_at)
  const invalid = needsService && !primary && activeMembers.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.display_name ?? tx("Profil", "Profile")}</DialogTitle>
          <DialogDescription>{tx("Un agent doit être rattaché à au moins un service. Un profil suspendu perd immédiatement ses droits.", "An agent must belong to at least one service. A suspended profile immediately loses its rights.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="e-role">{tx("Rôle", "Role")}</Label>
            <Select id="e-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-status">{tx("Statut du compte", "Account status")}</Label>
            <Select id="e-status" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-primary">{tx("Service principal", "Main service")}</Label>
            <Select id="e-primary" value={primary} onChange={(e) => setPrimary(e.target.value)}>
              <option value="">—</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {invalid && <p role="alert" className="text-sm text-destructive">{tx("Rattachez cet agent à un service avant d'enregistrer.", "Attach this agent to a service before saving.")}</p>}
          <Button disabled={busy || invalid} onClick={() => onSave({ role, account_status: status, primary_service_id: primary || null })}>{tx("Enregistrer", "Save")}</Button>

          <hr />
          <h3 className="font-semibold">{tx("Rattachements aux services", "Service memberships")}</h3>
          <ul className="grid gap-2">
            {activeMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span>{services.find((s) => s.id === m.service_id)?.name ?? m.service_id} · {m.member_role}{m.can_validate_reports ? " · valide" : ""}</span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRevoke(m.id)}>{tx("Révoquer", "Revoke")}</Button>
              </li>
            ))}
            {activeMembers.length === 0 && <li className="text-sm text-muted-foreground">{tx("Aucun rattachement actif.", "No active membership.")}</li>}
          </ul>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select aria-label={tx("Service", "Service")} value={memberService} onChange={(e) => setMemberService(e.target.value)}>
              <option value="">{tx("Service…", "Service…")}</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select aria-label={tx("Rôle dans le service", "Role in the service")} value={memberRole} onChange={(e) => setMemberRole(e.target.value as "agent" | "admin")}>
              <option value="agent">agent</option>
              <option value="admin">admin</option>
            </Select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={canValidate} onChange={(e) => setCanValidate(e.target.checked)} />{tx("Peut valider", "Can validate")}</label>
          </div>
          <Button variant="outline" disabled={busy || !memberService} onClick={() => onAddMember({ serviceId: memberService, memberRole, canValidate })}>{tx("Ajouter / mettre à jour", "Add / update")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
