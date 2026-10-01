import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/auth-context"

const schema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(6, "6 caractères minimum"),
  displayName: z.string().max(40, "40 caractères maximum").optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * Formulaire partagé par les pages /connexion et /inscription (même validation, mêmes champs,
 * seul le mode change). Ne contient pas la redirection post-connexion : chaque page l'écrit
 * elle-même, pour retourner vers la bonne page (voir login-page.tsx / register-page.tsx).
 */
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { signIn, signUp } = useAuth()
  const [busy, setBusy] = useState(false)
  const isSignup = mode === "signup"

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", displayName: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    try {
      if (isSignup) {
        const name = values.displayName?.trim()
        if (!name) {
          setError("displayName", { message: "Indiquez un nom d'affichage" })
          setBusy(false)
          return
        }
        await signUp(values.email, values.password, name)
        toast.success("Compte créé")
      } else {
        await signIn(values.email, values.password)
        toast.success("Connexion réussie")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue")
      setBusy(false)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {isSignup && (
        <div className="grid gap-2">
          <Label htmlFor="displayName">Nom d'affichage</Label>
          <Input
            id="displayName"
            autoComplete="nickname"
            aria-invalid={errors.displayName ? true : undefined}
            aria-describedby={errors.displayName ? "displayName-error" : undefined}
            {...register("displayName")}
          />
          {errors.displayName && (
            <p id="displayName-error" role="alert" className="text-sm text-destructive">
              {errors.displayName.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        {isSignup ? "Créer mon compte" : "Se connecter"}
      </Button>
    </form>
  )
}
