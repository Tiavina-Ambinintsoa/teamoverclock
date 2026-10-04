import {
  Accessibility,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardList,
  Code2,
  FileWarning,
  Gauge,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Map as MapIcon,
  Megaphone,
  Newspaper,
  Phone,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react"

import type { UserRole } from "@/lib/types"

export interface NavItem {
  to: string
  fr: string
  en: string
  icon: LucideIcon
  /** Contenu actif aussi pour les sous-routes (par défaut : oui, sauf `exact`). */
  exact?: boolean
}

export interface NavGroup {
  id: string
  fr: string
  en: string
  items: NavItem[]
}

const citizenGroup: NavGroup = {
  id: "citizen",
  fr: "Mon espace",
  en: "My space",
  items: [
    { to: "/app", fr: "Tableau de bord", en: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/app/requests", fr: "Mes demandes", en: "My requests", icon: ClipboardList },
    { to: "/app/reports", fr: "Mes signalements", en: "My reports", icon: FileWarning },
    { to: "/app/support", fr: "Appeler un conseiller", en: "Call an agent", icon: Phone },
    { to: "/app/verification", fr: "Vérification d'identité", en: "Identity verification", icon: UserCheck },
    { to: "/app/accessibility", fr: "Accessibilité", en: "Accessibility", icon: Accessibility },
    { to: "/app/newsletter", fr: "Lettres d'information", en: "Newsletters", icon: Bell },
    { to: "/app/reputation", fr: "Réputation et votes", en: "Reputation & votes", icon: Star },
    { to: "/app/parametres", fr: "Paramètres", en: "Settings", icon: Settings },
  ],
}

const cityGroup: NavGroup = {
  id: "city",
  fr: "La ville",
  en: "The city",
  items: [
    { to: "/services", fr: "Services", en: "Services", icon: Building2 },
    { to: "/news", fr: "Actualités", en: "News", icon: Newspaper },
    { to: "/projects", fr: "Projets de la ville", en: "City projects", icon: Vote },
    { to: "/map", fr: "Carte", en: "Map", icon: MapIcon },
    { to: "/dangers", fr: "Dangers et alertes", en: "Dangers & alerts", icon: AlertTriangle },
    { to: "/guide", fr: "Guide", en: "Guide", icon: HelpCircle },
    { to: "/developers", fr: "API développeurs", en: "Developer API", icon: Code2 },
  ],
}

const agentGroup: NavGroup = {
  id: "agent",
  fr: "Espace agent",
  en: "Agent workspace",
  items: [
    { to: "/agent", fr: "Tableau de bord", en: "Dashboard", icon: Gauge, exact: true },
    { to: "/agent/requests", fr: "Demandes", en: "Requests", icon: Inbox },
    { to: "/agent/reports", fr: "Signalements", en: "Reports", icon: FileWarning },
    { to: "/agent/dangers", fr: "Alertes et dangers", en: "Alerts & dangers", icon: AlertTriangle },
    { to: "/agent/analytics", fr: "Analyses", en: "Analytics", icon: BarChart3 },
    { to: "/agent/calls", fr: "Appels", en: "Calls", icon: Phone },
    { to: "/agent/news", fr: "Actualités du service", en: "Service news", icon: Megaphone },
    { to: "/agent/services", fr: "Mes services", en: "My services", icon: Building2 },
    { to: "/agent/projects", fr: "Votes sur les projets", en: "Project voting", icon: Vote },
    { to: "/agent/team", fr: "Mon équipe", en: "My team", icon: Users },
    { to: "/agent/sync", fr: "Synchronisation API", en: "API sync", icon: RefreshCw },
  ],
}

const adminGroup: NavGroup = {
  id: "admin",
  fr: "Administration",
  en: "Administration",
  items: [
    { to: "/admin", fr: "Vue d'ensemble", en: "Overview", icon: ShieldCheck, exact: true },
    { to: "/admin/users", fr: "Utilisateurs et rôles", en: "Users & roles", icon: Users },
    { to: "/admin/verifications", fr: "Vérifications CIN", en: "CIN checks", icon: UserCheck },
    { to: "/admin/services", fr: "Services", en: "Services", icon: Building2 },
    { to: "/admin/projects", fr: "Projets de la ville", en: "City projects", icon: Vote },
    { to: "/admin/map", fr: "Éditeur de carte", en: "Map editor", icon: MapIcon },
    { to: "/admin/news", fr: "Modération des actualités", en: "News moderation", icon: Newspaper },
    { to: "/admin/dangers", fr: "Dangers", en: "Dangers", icon: AlertTriangle },
    { to: "/admin/reports", fr: "Tous les signalements", en: "All reports", icon: FileWarning },
    { to: "/admin/analytics", fr: "Analyses", en: "Analytics", icon: BarChart3 },
    { to: "/admin/ai-content", fr: "Contenu généré par IA", en: "AI-generated content", icon: Bot },
    { to: "/admin/audit", fr: "Journal d'audit", en: "Audit log", icon: ScrollText },
  ],
}

/** Groupes de navigation affichés dans la barre latérale selon le profil (D08 / D09). */
export function navForRole(role: UserRole | null | undefined, isAdmin: boolean): NavGroup[] {
  const groups: NavGroup[] = [citizenGroup]
  if (isAdmin || role === "agent" || role === "service_admin" || role === "general_admin") groups.push(agentGroup)
  if (isAdmin || role === "general_admin") groups.push(adminGroup)
  groups.push(cityGroup)
  return groups
}
