import type { SupabaseClient } from "@supabase/supabase-js"

import type { AccountStatus, KycStatus, UserRole } from "@/lib/types"

/** Données de profil Nova Terra chargées après la connexion (profiles + citizens + service_members). */
export interface ProfileExtras {
  profileRole: UserRole
  accountStatus: AccountStatus
  kycStatus: KycStatus | null
  citizenId: string | null
  isMinor: boolean
  sectorId: string | null
  serviceIds: string[]
  /** Services où l'utilisateur peut valider des signalements (admin du service ou droit de validation). */
  validatorServiceIds: string[]
  firstName: string | null
  lastName: string | null
  phone: string | null
  profileLoaded: true
}

interface ProfileRow {
  role?: UserRole | null
  account_status?: AccountStatus | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
}
interface CitizenRow {
  id?: string | null
  kyc_status?: KycStatus | null
  is_minor?: boolean | null
  sector_id?: string | null
}
interface MemberRow {
  service_id: string
  member_role?: "agent" | "admin" | null
  can_validate_reports?: boolean | null
}

const ROLES: readonly UserRole[] = ["citizen", "agent", "service_admin", "general_admin", "system"]
const STATUSES: readonly AccountStatus[] = ["pending", "active", "suspended", "disabled"]

export function mapProfileExtras(
  profile: ProfileRow | null,
  citizen: CitizenRow | null,
  members: MemberRow[] | null
): ProfileExtras {
  return {
    profileRole: profile?.role && ROLES.includes(profile.role) ? profile.role : "citizen",
    accountStatus: profile?.account_status && STATUSES.includes(profile.account_status) ? profile.account_status : "active",
    kycStatus: citizen?.kyc_status ?? null,
    citizenId: citizen?.id ?? null,
    isMinor: citizen?.is_minor === true,
    sectorId: citizen?.sector_id ?? null,
    serviceIds: (members ?? []).map((member) => member.service_id),
    validatorServiceIds: (members ?? [])
      .filter((member) => member.member_role === "admin" || member.can_validate_reports === true)
      .map((member) => member.service_id),
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    phone: profile?.phone ?? null,
    profileLoaded: true,
  }
}

/** Valeurs par défaut (mode démo local, ou avant la fin du chargement du profil). */
export function baseExtras(isAdmin: boolean, loaded: boolean): Omit<ProfileExtras, "profileLoaded"> & { profileLoaded: boolean } {
  return {
    profileRole: isAdmin ? "general_admin" : "citizen",
    accountStatus: "active",
    kycStatus: null,
    citizenId: null,
    isMinor: false,
    sectorId: null,
    serviceIds: [],
    validatorServiceIds: [],
    firstName: null,
    lastName: null,
    phone: null,
    profileLoaded: loaded,
  }
}

/** Charge le profil, la fiche citoyenne et les rattachements de service de l'utilisateur. */
export async function fetchProfileExtras(client: SupabaseClient, userId: string): Promise<ProfileExtras> {
  const [profile, citizen, members] = await Promise.all([
    client.from("profiles").select("role,account_status,first_name,last_name,phone").eq("id", userId).maybeSingle(),
    client.from("citizens").select("id,kyc_status,is_minor,sector_id").eq("profile_id", userId).maybeSingle(),
    client.from("service_members").select("service_id,member_role,can_validate_reports").eq("profile_id", userId).is("revoked_at", null),
  ])
  return mapProfileExtras(profile.data as ProfileRow | null, citizen.data as CitizenRow | null, members.data as MemberRow[] | null)
}

/** true si le compte n'a pas le droit de se connecter (D03). */
export function isBlockedAccount(status: AccountStatus): boolean {
  return status === "suspended" || status === "disabled"
}

export function blockedAccountMessage(status: AccountStatus): string {
  return status === "suspended"
    ? "Ce compte est suspendu. Contactez le service Relations citoyennes."
    : "Ce compte est désactivé."
}
