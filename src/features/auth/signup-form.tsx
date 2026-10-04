import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { isMinorBirthDate, passwordStrength, signupSchema, type SignupValues } from "@/features/auth/schema"
import { useSectors } from "@/features/city/city-queries"
import { isLocale, LOCALE_OPTIONS, useLocale } from "@/lib/locale"

const STRENGTH_LABELS = [
  ["Très faible", "Very weak"],
  ["Faible", "Weak"],
  ["Moyen", "Fair"],
  ["Fort", "Strong"],
  ["Très fort", "Very strong"],
] as const

/** D01 — inscription : identité, secteur de résidence, mot de passe robuste et consentements. */
export function SignupForm() {
  const { signUp, backend } = useAuth()
  const { tx, t, locale, setLocale } = useLocale()
  const sectors = useSectors()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      birthDate: "",
      sectorId: "",
      locale,
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      dataConsent: false,
    },
  })

  const password = useWatch({ control, name: "password" }) ?? ""
  const birthDate = useWatch({ control, name: "birthDate" }) ?? ""
  const strength = passwordStrength(password)
  const minor = isMinorBirthDate(birthDate)

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    try {
      await signUp(values.email, values.password, `${values.firstName} ${values.lastName}`.trim(), {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        sectorId: values.sectorId,
        locale: values.locale,
      })
      toast.success(backend === "local" ? tx("Compte démo créé", "Demo account created") : tx("Compte créé.", "Account created."))
      void navigate("/connexion")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Une erreur est survenue", "Something went wrong"))
    } finally {
      setBusy(false)
    }
  })

  const fieldError = (name: keyof SignupValues) => {
    const message = errors[name]?.message
    return message ? <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{message}</p> : null
  }
  const describedBy = (name: keyof SignupValues) => (errors[name] ? `${name}-error` : undefined)

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" data-tour="signup-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">{tx("Prénom", "First name")}</Label>
          <Input id="firstName" autoComplete="given-name" aria-invalid={errors.firstName ? true : undefined} aria-describedby={describedBy("firstName")} {...register("firstName")} />
          {fieldError("firstName")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">{tx("Nom", "Last name")}</Label>
          <Input id="lastName" autoComplete="family-name" aria-invalid={errors.lastName ? true : undefined} aria-describedby={describedBy("lastName")} {...register("lastName")} />
          {fieldError("lastName")}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">{tx("Adresse e-mail", "Email address")}</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={errors.email ? true : undefined} aria-describedby={describedBy("email")} {...register("email")} />
        {fieldError("email")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="birthDate">{tx("Date de naissance", "Date of birth")}</Label>
          <Input id="birthDate" type="date" autoComplete="bday" aria-invalid={errors.birthDate ? true : undefined} aria-describedby={describedBy("birthDate")} {...register("birthDate")} />
          {fieldError("birthDate")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sectorId">{tx("Secteur de résidence", "Home sector")}</Label>
          <Select id="sectorId" aria-invalid={errors.sectorId ? true : undefined} aria-describedby={describedBy("sectorId")} {...register("sectorId")}>
            <option value="">{tx("Choisissez votre secteur…", "Choose your sector…")}</option>
            {(sectors.data ?? []).map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.code} — {sector.name}</option>
            ))}
          </Select>
          {fieldError("sectorId")}
          {sectors.isError && <p role="alert" className="text-sm text-destructive">{sectors.error.message}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="locale">{t("auth.languagePreference")}</Label>
        <Select
          id="locale"
          {...register("locale", {
            onChange: (event) => {
              const next = event.currentTarget.value
              if (isLocale(next)) setLocale(next)
            },
          })}
        >
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        {fieldError("locale")}
      </div>

      {minor && (
        <p role="note" className="rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
          {tx(
            "Vous êtes mineur : après la création du compte, indiquez le CIN d'un parrain majeur vérifié dans « Vérification d'identité ».",
            "You are a minor: after creating your account, enter the CIN of a verified adult sponsor in “Identity verification”."
          )}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="password">{tx("Mot de passe", "Password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={`password-strength${errors.password ? " password-error" : ""}`}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 motion-safe:hover:-translate-y-1/2 motion-safe:active:-translate-y-1/2"
            aria-label={showPassword ? tx("Masquer le mot de passe", "Hide password") : tx("Afficher le mot de passe", "Show password")}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        <p id="password-strength" className="text-xs text-muted-foreground" aria-live="polite">
          {password
            ? `${tx("Robustesse", "Strength")} : ${STRENGTH_LABELS[strength.score][locale === "en" ? 1 : 0]}${strength.missing.length ? ` — ${tx("manque", "missing")} : ${strength.missing.join(", ")}` : ""}`
            : tx("8 caractères minimum, avec minuscule, majuscule et chiffre.", "At least 8 characters with a lowercase letter, an uppercase letter and a digit.")}
        </p>
        {fieldError("password")}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">{tx("Confirmer le mot de passe", "Confirm password")}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-11"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={describedBy("confirmPassword")}
            {...register("confirmPassword")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 motion-safe:hover:-translate-y-1/2 motion-safe:active:-translate-y-1/2"
            aria-label={showConfirmPassword ? tx("Masquer", "Hide") : tx("Afficher", "Show")}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {fieldError("confirmPassword")}
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <label htmlFor="termsAccepted" className="flex items-start gap-2 text-sm text-muted-foreground">
            <input id="termsAccepted" type="checkbox" className="mt-1 size-4 accent-primary" aria-describedby={describedBy("termsAccepted")} {...register("termsAccepted")} />
            <span>
              {tx("J'accepte les ", "I accept the ")}
              <Link to="/conditions" className="font-medium text-foreground underline underline-offset-4">{tx("conditions d'utilisation", "terms of use")}</Link>.
            </span>
          </label>
          {fieldError("termsAccepted")}
        </div>
        <div className="grid gap-1">
          <label htmlFor="dataConsent" className="flex items-start gap-2 text-sm text-muted-foreground">
            <input id="dataConsent" type="checkbox" className="mt-1 size-4 accent-primary" aria-describedby={describedBy("dataConsent")} {...register("dataConsent")} />
            <span>
              {tx("Je consens au traitement de mes données personnelles décrit dans la ", "I consent to the processing of my personal data described in the ")}
              <Link to="/confidentialite" className="font-medium text-foreground underline underline-offset-4">{tx("politique de confidentialité", "privacy policy")}</Link>.
            </span>
          </label>
          {fieldError("dataConsent")}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? tx("Chargement…", "Loading…") : tx("Créer mon compte", "Create my account")}
        {!busy && <ArrowRight aria-hidden />}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {tx("Vous avez déjà un compte ?", "Already have an account?")}{" "}
        <Link to="/connexion" className="font-medium text-primary underline-offset-4 hover:underline">{tx("Se connecter", "Log in")}</Link>
      </p>
    </form>
  )
}
