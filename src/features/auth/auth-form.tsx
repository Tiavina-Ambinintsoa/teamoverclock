import { useState } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/auth-context"
import type { AuthMode } from "@/features/auth/auth-shell"
import { useLocale } from "@/lib/locale"

interface FormValues {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
}

interface AuthFormProps {
  mode: AuthMode
  onLoginStart?: () => void
  onLoginFailure?: () => void
  onLoginSuccess?: () => Promise<void>
}

export function AuthForm({ mode, onLoginStart, onLoginFailure, onLoginSuccess }: AuthFormProps) {
  const { signIn, signInAdmin, signUp, signInWithOAuth, requestPasswordReset, updatePassword, backend } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const isSignup = mode === "signup"
  const isAdmin = mode === "admin"
  const isRecovery = mode === "recover"
  const isReset = mode === "reset"
  const showsEmail = !isReset
  const showsPassword = !isRecovery
  const showsSocial = mode === "signin" || isSignup

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", termsAccepted: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    clearErrors()
    let valid = true

    if (showsEmail && !z.email().safeParse(values.email).success) {
      setError("email", { message: t("auth.error.email") })
      valid = false
    }
    if (showsPassword && values.password.length < 6) {
      setError("password", { message: t("auth.error.password") })
      valid = false
    }
    if (isSignup) {
      if (!values.firstName.trim()) {
        setError("firstName", { message: t("auth.error.firstName") })
        valid = false
      }
      if (!values.lastName.trim()) {
        setError("lastName", { message: t("auth.error.lastName") })
        valid = false
      }
      if (values.password !== values.confirmPassword) {
        setError("confirmPassword", { message: t("auth.error.mismatch") })
        valid = false
      }
      if (!values.termsAccepted) {
        setError("termsAccepted", { message: t("auth.error.terms") })
        valid = false
      }
    }
    if (isReset && values.password !== values.confirmPassword) {
      setError("confirmPassword", { message: t("auth.error.mismatch") })
      valid = false
    }
    if (!valid) return

    setBusy(true)
    let loginAttempt = false
    try {
      if (isRecovery) {
        await requestPasswordReset(values.email)
        toast.success(t("auth.toast.recovery"))
      } else if (isReset) {
        await updatePassword(values.password)
        toast.success(t("auth.toast.password"))
        await navigate("/connexion")
      } else if (isSignup) {
        await signUp(values.email, values.password, (values.firstName + " " + values.lastName).trim())
        toast.success(backend === "local" ? t("auth.toast.signupLocal") : t("auth.toast.signup"))
      } else if (isAdmin) {
        await signInAdmin(values.email, values.password)
        toast.success(t("auth.toast.admin"))
        await navigate("/admin")
      } else {
        loginAttempt = true
        onLoginStart?.()
        await signIn(values.email, values.password)
        toast.success(t("auth.toast.login"))
        await onLoginSuccess?.()
      }
    } catch (error) {
      if (loginAttempt) onLoginFailure?.()
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setBusy(false)
    }
  })

  const fieldError = (name: keyof FormValues, id: string) => {
    const message = errors[name]?.message
    return message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null
  }

  const passwordField = (name: "password" | "confirmPassword", label: string, visible: boolean, toggle: () => void) => {
    const id = name
    const errorId = id + "-error"
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            type={visible ? "text" : "password"}
            autoComplete={name === "password" ? (isSignup || isReset ? "new-password" : "current-password") : "new-password"}
            aria-invalid={errors[name] ? true : undefined}
            aria-describedby={errors[name] ? errorId : undefined}
            className="pr-11"
            {...register(name)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 motion-safe:hover:-translate-y-1/2 motion-safe:active:-translate-y-1/2"
            aria-label={visible ? t("auth.passwordHide") : t("auth.passwordShow")}
            onClick={toggle}
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {fieldError(name, errorId)}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {isSignup && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">{t("auth.firstName")}</Label>
            <Input id="firstName" autoComplete="given-name" aria-invalid={errors.firstName ? true : undefined} aria-describedby={errors.firstName ? "firstName-error" : undefined} {...register("firstName")} />
            {fieldError("firstName", "firstName-error")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">{t("auth.lastName")}</Label>
            <Input id="lastName" autoComplete="family-name" aria-invalid={errors.lastName ? true : undefined} aria-describedby={errors.lastName ? "lastName-error" : undefined} {...register("lastName")} />
            {fieldError("lastName", "lastName-error")}
          </div>
        </div>
      )}

      {showsEmail && (
        <div className="grid gap-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {fieldError("email", "email-error")}
        </div>
      )}

      {showsPassword && passwordField("password", isReset ? t("auth.password") : t("auth.password"), showPassword, () => setShowPassword(!showPassword))}

      {(isSignup || isReset) &&
        passwordField("confirmPassword", t("auth.confirmPassword"), showConfirmation, () => setShowConfirmation(!showConfirmation))}

      {isSignup && (
        <div className="grid gap-2">
          <label htmlFor="termsAccepted" className="flex items-start gap-2 text-sm text-muted-foreground">
            <input id="termsAccepted" type="checkbox" className="mt-1 size-4 accent-primary" {...register("termsAccepted")} />
            <span>
              {t("auth.terms")} <Link to="/conditions" className="font-medium text-foreground underline underline-offset-4">Conditions</Link>
            </span>
          </label>
          {fieldError("termsAccepted", "termsAccepted-error")}
        </div>
      )}

      {mode === "signin" && (
        <div className="-mt-1 flex justify-end">
          <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.forgot")}
          </Link>
        </div>
      )}

      <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? t("common.loading") : isSignup ? t("auth.signupButton") : isAdmin ? t("auth.adminButton") : isRecovery ? t("auth.recoverButton") : isReset ? t("auth.resetButton") : t("auth.loginButton")}
        {!busy && !isRecovery && !isReset && <ArrowRight aria-hidden />}
      </Button>

      {showsSocial && (
        <>
          <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{t("common.or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => void signInWithOAuth("google").catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Connexion impossible"))}>
              <GoogleMark /> {t("auth.google")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void signInWithOAuth("facebook").catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Connexion impossible"))}>
              <FacebookMark /> {t("auth.facebook")}
            </Button>
          </div>
        </>
      )}

      {mode === "signup" && (
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link to="/connexion" className="font-medium text-primary underline-offset-4 hover:underline">{t("nav.login")}</Link>
        </p>
      )}
      {mode === "signin" && (
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/inscription" className="font-medium text-primary underline-offset-4 hover:underline">{t("nav.signup")}</Link>
        </p>
      )}
    </form>
  )
}

function GoogleMark() {
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-white">
      <svg viewBox="0 0 48 48" className="size-4.5" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.75 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.94 46.98 31.76 46.98 24.55Z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.25 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      </svg>
    </span>
  )
}

function FacebookMark() {
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-white">
      <svg viewBox="0 0 24 24" className="size-4.5" focusable="false">
        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.875 11.85v-8.38H7.08V12h3.045V9.356c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.47h-2.796v8.38A12.001 12.001 0 0 0 24 12Z" />
      </svg>
    </span>
  )
}
