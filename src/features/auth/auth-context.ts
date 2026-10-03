import { createContext, useContext } from "react"

import type { ProfileExtras } from "@/features/auth/profile-api"

export interface AppUser extends Omit<ProfileExtras, "profileLoaded"> {
  id: string
  email: string
  displayName: string
  /** Le rôle vient de app_metadata, champ réservé aux opérations de confiance côté Supabase. */
  role: "admin" | "member"
  /** true pour l'utilisateur fictif du mode démo local. */
  isDemo: boolean
  /** Administrateur général : claim JWT `admin` OU profil `general_admin`. */
  isAdmin: boolean
  /** false tant que profiles / citizens / service_members ne sont pas chargés. */
  profileLoaded: boolean
}

export type OAuthProvider = "google" | "facebook"

/** Informations d'identité demandées à l'inscription (D01). */
export interface SignUpDetails {
  firstName: string
  lastName: string
  birthDate: string
  sectorId: string
}

export interface AuthState {
  user: AppUser | null
  loading: boolean
  /** "supabase" = vraie base ; "local" = mode démo dans le navigateur. */
  backend: "supabase" | "local"
  signIn: (email: string, password: string) => Promise<void>
  signInAdmin: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, details?: SignUpDetails) => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateProfile: (displayName: string) => Promise<void>
  requestEmailChange: (email: string) => Promise<void>
  deleteAccount: () => Promise<void>
  /** Connexion en un clic pour le jury (compte VITE_DEMO_* ou utilisateur local fictif). */
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  /** Recharge profil, fiche citoyenne et rattachements (après vérification d'identité, par exemple). */
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>")
  return context
}
