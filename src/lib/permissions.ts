import type { UserRole } from "@/lib/types"

/** Périmètre d'une permission : ses propres objets, ceux de son service, ou tous. */
export type PermissionScope = "own" | "service" | "all"

export type PermissionCode =
  | "service.read"
  | "request.create"
  | "request.read_service"
  | "request.update"
  | "report.create"
  | "report.validate"
  | "news.publish"
  | "user.manage"
  | "role.edit"
  | "audit.read"

/**
 * Matrice D09 (docs/PLAN.md §3.7), identique au seed `role_permissions`.
 * Cette matrice ne sert qu'à masquer l'interface : la sécurité réelle est appliquée par les policies RLS.
 */
const MATRIX: Record<UserRole, Partial<Record<PermissionCode, PermissionScope>>> = {
  citizen: { "service.read": "all", "request.create": "own", "report.create": "own" },
  agent: { "service.read": "all", "request.create": "own", "request.read_service": "service", "request.update": "service" },
  service_admin: {
    "service.read": "all",
    "request.create": "own",
    "request.read_service": "service",
    "request.update": "service",
    "report.validate": "service",
    "news.publish": "service",
  },
  general_admin: {
    "service.read": "all",
    "request.create": "own",
    "request.read_service": "all",
    "request.update": "all",
    "report.validate": "all",
    "news.publish": "all",
    "user.manage": "all",
    "role.edit": "all",
    "audit.read": "all",
  },
  system: {},
}

/** Retourne le périmètre accordé, ou null si la permission est refusée (refus par défaut). */
export function permissionScope(role: UserRole | null | undefined, code: PermissionCode): PermissionScope | null {
  if (!role) return null
  return MATRIX[role][code] ?? null
}

export function can(role: UserRole | null | undefined, code: PermissionCode): boolean {
  return permissionScope(role, code) !== null
}

/** Profils de l'espace de travail (D19). */
export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === "agent" || role === "service_admin" || role === "general_admin"
}

/** Espace vers lequel rediriger après connexion (D03). */
export function homeForRole(role: UserRole | null | undefined): string {
  if (role === "general_admin") return "/admin"
  if (isStaffRole(role)) return "/agent"
  return "/app"
}
