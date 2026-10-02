import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"

import { AuthContext, type AppUser, type AuthState, type OAuthProvider } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { safeStorage } from "@/lib/storage"
import { supabase } from "@/lib/supabase"

const LOCAL_USER_KEY = "webcup:local-user"

const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@webcup.mg",
  displayName: "Compte démo",
  role: "member",
  isDemo: true,
  isAdmin: false,
}

const DEMO_ADMIN: AppUser = {
  id: "demo-admin",
  email: "admin@demo.webcup.mg",
  displayName: "Administrateur démo",
  role: "admin",
  isDemo: true,
  isAdmin: true,
}

function fromSupabaseUser(user: User | null | undefined): AppUser | null {
  if (!user) return null
  const email = user.email ?? ""
  const displayName = String(user.user_metadata?.display_name ?? "")
  const isAdmin = user.app_metadata?.role === "admin"
  return {
    id: user.id,
    email,
    displayName: displayName || email.split("@")[0] || "Utilisateur",
    role: isAdmin ? "admin" : "member",
    isDemo: false,
    isAdmin,
  }
}

function readLocalUser(): AppUser | null {
  const raw = safeStorage.get(LOCAL_USER_KEY)
  if (!raw) return null
  try {
    const stored = JSON.parse(raw) as Partial<AppUser>
    if (typeof stored.id !== "string" || typeof stored.email !== "string") return null
    const isAdmin = stored.isAdmin === true
    return {
      id: stored.id,
      email: stored.email,
      displayName: typeof stored.displayName === "string" ? stored.displayName : stored.email,
      role: isAdmin ? "admin" : "member",
      isDemo: true,
      isAdmin,
    }
  } catch {
    return null
  }
}

function getAppRouteUrl(path: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  const appBase = new URL(basePath, window.location.origin)
  return new URL(path.replace(/^\/+/, ""), appBase).toString()
}
/** Messages d'erreur Supabase -> français clair, avec la marche à suivre. */
function translateAuthError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect."
  if (text.includes("already registered")) return "Un compte existe déjà avec cet e-mail : connectez-vous."
  if (text.includes("email not confirmed"))
    return "E-mail non confirmé. Désactivez « Confirm email » dans Supabase > Authentication > Providers > Email."
  if (text.includes("rate limit")) return "Trop de tentatives : patientez une minute avant de réessayer."
  if (text.includes("password should be")) return "Mot de passe trop court : 6 caractères minimum."
  if (text.includes("failed to fetch") || text.includes("network")) return "Connexion impossible : vérifiez votre réseau."
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => (supabase ? null : readLocalUser()))
  const [loading, setLoading] = useState<boolean>(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(fromSupabaseUser(data.session?.user))
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(fromSupabaseUser(session?.user))
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => {
    const setLocalUser = (next: AppUser | null) => {
      if (next) safeStorage.set(LOCAL_USER_KEY, JSON.stringify(next))
      else safeStorage.remove(LOCAL_USER_KEY)
      setUser(next)
    }

    const authenticate = async (email: string, password: string) => {
      if (!supabase) {
        setLocalUser({
          id: `local-${email}`,
          email,
          displayName: email.split("@")[0] || "Utilisateur",
          role: "member",
          isDemo: true,
          isAdmin: false,
        })
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(translateAuthError(error.message))
    }

    return {
      user,
      loading,
      backend: supabase ? "supabase" : "local",
      signIn: authenticate,

      async signInAdmin(email, password) {
        if (!supabase) {
          setLocalUser(DEMO_ADMIN)
          return
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(translateAuthError(error.message))
        if (data.user.app_metadata?.role !== "admin") {
          await supabase.auth.signOut()
          throw new Error("Ce compte n'a pas le rôle administrateur.")
        }
      },

      async signUp(email, password, displayName) {
        if (!supabase) {
          setLocalUser({
            id: `local-${email}`,
            email,
            displayName,
            role: "member",
            isDemo: true,
            isAdmin: false,
          })
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: getAppRouteUrl("/") },
        })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async signInWithOAuth(provider: OAuthProvider) {
        if (!supabase) throw new Error("Configurez Supabase et le fournisseur OAuth pour activer cette connexion.")
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: getAppRouteUrl("/connexion") },
        })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async requestPasswordReset(email) {
        if (!supabase) throw new Error("La récupération du mot de passe demande une connexion Supabase.")
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAppRouteUrl("/nouveau-mot-de-passe"),
        })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async updatePassword(password) {
        if (!supabase) throw new Error("La modification du mot de passe demande une connexion Supabase.")
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async updateProfile(displayName) {
        const name = displayName.trim()
        if (name.length < 2 || name.length > 80) throw new Error("Le nom doit contenir entre 2 et 80 caractères.")
        if (!supabase || user?.isDemo) {
          if (!user) throw new Error("Connexion requise.")
          setLocalUser({ ...user, displayName: name })
          return
        }
        if (!user) throw new Error("Connexion requise.")
        const { error: authError } = await supabase.auth.updateUser({ data: { display_name: name } })
        if (authError) throw new Error(translateAuthError(authError.message))
        const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: name })
        if (profileError) throw new Error("Profil Auth mis à jour, mais impossible d'enregistrer la fiche publique : " + profileError.message)
      },

      async requestEmailChange(email) {
        if (!supabase || user?.isDemo) throw new Error("Le changement d'e-mail nécessite un compte Supabase.")
        const normalized = email.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Adresse e-mail invalide.")
        const { error } = await supabase.auth.updateUser({ email: normalized })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async deleteAccount() {
        if (!user) throw new Error("Connexion requise.")
        if (!supabase || user.isDemo) {
          setLocalUser(null)
          return
        }
        const { error } = await supabase.functions.invoke("account-delete", { body: {} })
        if (error) throw new Error(error.message || "La suppression du compte a échoué.")
        await supabase.auth.signOut({ scope: "local" })
        setUser(null)
      },

      async signInDemo() {
        if (supabase && env.demoEmail && env.demoPassword) {
          const { error } = await supabase.auth.signInWithPassword({
            email: env.demoEmail,
            password: env.demoPassword,
          })
          if (error) throw new Error(translateAuthError(error.message))
          return
        }
        setLocalUser(DEMO_USER)
      },

      async signOut() {
        if (user?.isDemo) {
          setLocalUser(null)
          return
        }
        if (supabase) {
          const { error } = await supabase.auth.signOut()
          if (error) throw new Error(translateAuthError(error.message))
          return
        }
        setLocalUser(null)
      },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
