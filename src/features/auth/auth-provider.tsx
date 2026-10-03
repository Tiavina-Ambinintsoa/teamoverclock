import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"

import { useTheme } from "@/components/theme-context"
import { AuthContext, type AppUser, type AuthState, type OAuthProvider } from "@/features/auth/auth-context"
import {
  baseExtras,
  blockedAccountMessage,
  fetchProfileExtras,
  isBlockedAccount,
  type ProfileExtras,
} from "@/features/auth/profile-api"
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
  ...baseExtras(false, true),
}

const DEMO_ADMIN: AppUser = {
  id: "demo-admin",
  email: "admin@demo.webcup.mg",
  displayName: "Administrateur démo",
  role: "admin",
  isDemo: true,
  isAdmin: true,
  ...baseExtras(true, true),
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
    ...baseExtras(isAdmin, false),
  }
}

/** Fusionne les données de profil dans l'utilisateur ; admin = claim JWT OU profil general_admin. */
function withExtras(user: AppUser, extras: ProfileExtras): AppUser {
  const isAdmin = user.role === "admin" || extras.profileRole === "general_admin"
  return {
    ...user,
    ...extras,
    isAdmin,
    role: isAdmin ? "admin" : "member",
    displayName: user.displayName,
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
      ...baseExtras(isAdmin, true),
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
    return "E-mail non confirmé : ouvrez le lien de confirmation reçu par e-mail avant de vous connecter."
  if (text.includes("rate limit")) return "Trop de tentatives : patientez une minute avant de réessayer."
  if (text.includes("password should be")) return "Mot de passe trop court : 6 caractères minimum."
  if (text.includes("failed to fetch") || text.includes("network")) return "Connexion impossible : vérifiez votre réseau."
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { resetTheme } = useTheme()
  const [user, setUser] = useState<AppUser | null>(() => (supabase ? null : readLocalUser()))
  const [loading, setLoading] = useState<boolean>(supabase !== null)
  const authenticatedUserId = useRef(user?.id ?? null)

  /** Charge le profil ; un compte suspendu/désactivé est déconnecté immédiatement (D03, D08). */
  const loadExtras = useCallback(async (base: AppUser): Promise<boolean> => {
    if (!supabase) return true
    try {
      const extras = await fetchProfileExtras(supabase, base.id)
      if (isBlockedAccount(extras.accountStatus)) {
        toast.error(blockedAccountMessage(extras.accountStatus))
        await supabase.auth.signOut()
        setUser(null)
        return false
      }
      setUser((current) => (current?.id === base.id ? withExtras(current, extras) : current))
      return true
    } catch {
      // Profil illisible : on garde un citoyen de base plutôt que de bloquer l'accès aux pages publiques.
      setUser((current) => (current?.id === base.id ? { ...current, profileLoaded: true } : current))
      return true
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true

    const apply = (supabaseUser: User | null | undefined) => {
      const base = fromSupabaseUser(supabaseUser)
      if (!base && authenticatedUserId.current) resetTheme()
      authenticatedUserId.current = base?.id ?? null
      setUser(base)
      setLoading(false)
      if (base) void loadExtras(base)
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (active) apply(data.session?.user)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Appel différé : ne jamais appeler Supabase de façon synchrone dans ce callback.
      setTimeout(() => {
        if (active) apply(session?.user)
      }, 0)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadExtras, resetTheme])

  const value = useMemo<AuthState>(() => {
    const setLocalUser = (next: AppUser | null) => {
      if (next) safeStorage.set(LOCAL_USER_KEY, JSON.stringify(next))
      else safeStorage.remove(LOCAL_USER_KEY)
      setUser(next)
    }

    /** Vérifie le statut du compte juste après la connexion ; déconnecte et lève une erreur si bloqué. */
    const assertAccountAllowed = async (userId: string) => {
      if (!supabase) return
      const extras = await fetchProfileExtras(supabase, userId)
      if (isBlockedAccount(extras.accountStatus)) {
        await supabase.auth.signOut()
        throw new Error(blockedAccountMessage(extras.accountStatus))
      }
      void supabase.rpc("touch_last_login")
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
          ...baseExtras(false, true),
        })
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(translateAuthError(error.message))
      await assertAccountAllowed(data.user.id)
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
        await assertAccountAllowed(data.user.id)
        const extras = await fetchProfileExtras(supabase, data.user.id)
        if (data.user.app_metadata?.role !== "admin" && extras.profileRole !== "general_admin") {
          await supabase.auth.signOut()
          throw new Error("Ce compte n'a pas le rôle administrateur.")
        }
      },

      async signUp(email, password, displayName, details) {
        if (!supabase) {
          setLocalUser({
            id: `local-${email}`,
            email,
            displayName,
            role: "member",
            isDemo: true,
            isAdmin: false,
            ...baseExtras(false, true),
          })
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              ...(details
                ? {
                    first_name: details.firstName,
                    last_name: details.lastName,
                    birth_date: details.birthDate,
                    sector_id: details.sectorId,
                  }
                : {}),
            },
            emailRedirectTo: getAppRouteUrl("/connexion"),
          },
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
        setUser((current) => (current ? { ...current, displayName: name } : current))
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
          resetTheme()
          return
        }
        const { error } = await supabase.functions.invoke("account-delete", { body: {} })
        if (error) throw new Error(error.message || "La suppression du compte a échoué.")
        await supabase.auth.signOut({ scope: "local" })
        setUser(null)
        resetTheme()
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
          resetTheme()
          return
        }
        if (supabase) {
          const { error } = await supabase.auth.signOut()
          if (error) throw new Error(translateAuthError(error.message))
          resetTheme()
          return
        }
        setLocalUser(null)
        resetTheme()
      },

      async refreshProfile() {
        if (user && supabase && !user.isDemo) await loadExtras(user)
      },
    }
  }, [user, loading, loadExtras, resetTheme])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
