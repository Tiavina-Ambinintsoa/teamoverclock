import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"

import { AuthContext, type AppUser, type AuthState } from "@/features/auth/auth-context"
import { env } from "@/lib/env"
import { safeStorage } from "@/lib/storage"
import { supabase } from "@/lib/supabase"

const LOCAL_USER_KEY = "webcup:local-user"

const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@webcup.mg",
  displayName: "Compte démo",
  isDemo: true,
}

function fromSupabaseUser(user: User | null | undefined): AppUser | null {
  if (!user) return null
  const email = user.email ?? ""
  const metaName = user.user_metadata?.display_name as string | undefined
  return {
    id: user.id,
    email,
    displayName: metaName || email.split("@")[0] || "Utilisateur",
    isDemo: false,
  }
}

function readLocalUser(): AppUser | null {
  const raw = safeStorage.get(LOCAL_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppUser
  } catch {
    return null
  }
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

    return {
      user,
      loading,
      backend: supabase ? "supabase" : "local",

      async signIn(email, password) {
        if (!supabase) {
          // Mode démo : pas de vérification de mot de passe, tout reste dans ce navigateur.
          setLocalUser({ id: `local-${email}`, email, displayName: email.split("@")[0] || "Utilisateur", isDemo: true })
          return
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(translateAuthError(error.message))
      },

      async signUp(email, password, displayName) {
        if (!supabase) {
          setLocalUser({ id: `local-${email}`, email, displayName, isDemo: true })
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) throw new Error(translateAuthError(error.message))
        if (!data.session) {
          throw new Error("Compte créé. Confirmez votre e-mail avant de vous connecter (voir docs/03-backend-supabase.md).")
        }
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
          await supabase.auth.signOut()
          return
        }
        setLocalUser(null)
      },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
