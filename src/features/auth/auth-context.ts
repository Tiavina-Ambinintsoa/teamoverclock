import { createContext, useContext } from "react"

export interface AppUser {
  id: string
  email: string
  displayName: string
  /** true pour l'utilisateur fictif du mode démo local. */
  isDemo: boolean
}

export interface AuthState {
  user: AppUser | null
  loading: boolean
  /** "supabase" = vraie base ; "local" = mode démo dans le navigateur. */
  backend: "supabase" | "local"
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  /** Connexion en un clic pour le jury (compte VITE_DEMO_* ou utilisateur local fictif). */
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>")
  return context
}
