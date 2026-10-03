import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { StorageUploader } from "@/components/storage-uploader"
import { Container } from "@/components/layout/container"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle, MorphismPicker, PresetPicker, TypographyPicker } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProfileDetailsForm } from "@/features/profile/profile-details-form"
import { CitizenHealthForm } from "@/features/profile/citizen-health-form"
import { CitizenResidenceForm } from "@/features/profile/citizen-residence-form"
import { AccessibilityPanel } from "@/features/accessibility/accessibility-panel"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export function SettingsPage() {
  const { user, backend, updateProfile, requestEmailChange, updatePassword, deleteAccount } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await updateProfile(String(data.get("displayName") ?? ""))
      toast.success("Profil enregistré.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le profil.")
    } finally {
      setSaving(false)
    }
  }

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      await requestEmailChange(String(data.get("email") ?? ""))
      toast.success("Vérifiez votre nouvelle adresse e-mail pour confirmer le changement.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer l'adresse e-mail.")
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get("password") ?? "")
    if (password.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères.")
    if (password !== String(data.get("confirmPassword") ?? "")) return toast.error("Les deux mots de passe ne correspondent pas.")
    try {
      await updatePassword(password)
      form.reset()
      toast.success("Mot de passe modifié.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le mot de passe.")
    }
  }

  const removeAccount = async () => {
    await deleteAccount()
    toast.success("Compte supprimé.")
    await navigate("/", { replace: true })
  }

  return (
    <Container className="max-w-4xl px-4 sm:px-6">
      <title>{t("app.settings")} — {SITE.name}</title>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("app.settings")}</h1>
        <p className="mt-2 text-muted-foreground">{t("settings.description")}</p>
      </header>

      <div className="grid gap-5">
        <ProfileDetailsForm />
        <CitizenResidenceForm />
        <CitizenHealthForm />
        <AccessibilityPanel />
        <section className="rounded-xl border bg-card p-5 sm:p-7">
          <h2 className="font-semibold">Modifier le profil</h2>
          <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="profile-name">Nom affiché</Label><Input id="profile-name" name="displayName" defaultValue={user?.displayName} minLength={2} maxLength={80} required /></div>
            <div className="grid gap-2"><Label htmlFor="profile-email-current">Adresse e-mail</Label><Input id="profile-email-current" value={user?.email ?? ""} readOnly /></div>
            <p className="text-sm text-muted-foreground sm:col-span-2">Rôle : {user?.isAdmin ? "Administrateur" : "Membre"} · Connexion : {backend === "supabase" ? "Supabase" : "démo locale"}</p>
            <Button type="submit" className="w-fit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le profil"}</Button>
          </form>
          {backend === "supabase" && (
            <form onSubmit={changeEmail} className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2"><Label htmlFor="profile-email">Changer l'adresse e-mail</Label><Input id="profile-email" name="email" type="email" autoComplete="email" defaultValue={user?.email} required /></div>
              <Button type="submit" variant="outline">Envoyer la confirmation</Button>
              <p className="text-xs text-muted-foreground sm:col-span-2">Supabase enverra un e-mail de confirmation avant d'activer la nouvelle adresse.</p>
            </form>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 sm:p-7">
          <h2 className="font-semibold">Sécurité du compte</h2>
          {backend === "supabase" ? <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" name="password" type="password" minLength={6} autoComplete="new-password" required /></div>
            <div className="grid gap-2"><Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label><Input id="confirm-new-password" name="confirmPassword" type="password" minLength={6} autoComplete="new-password" required /></div>
            <Button type="submit" variant="outline" className="w-fit">Modifier le mot de passe</Button>
          </form> : <p className="mt-3 text-sm text-muted-foreground">La modification du mot de passe est disponible avec un compte Supabase connecté.</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div><p className="font-medium text-destructive">Supprimer mon compte</p><p className="mt-1 text-sm text-muted-foreground">Cette action est définitive et supprime aussi vos données associées.</p></div>
            <Button type="button" variant="destructive" shape="pill" onClick={() => setDeleteOpen(true)}>Supprimer le compte</Button>
          </div>
        </section>

        <StorageUploader />

        <section className="rounded-xl border bg-card p-5 sm:p-7">
          <h2 className="font-semibold">{t("settings.appearance")}</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><span className="text-sm">{t("settings.mode")}</span><ModeToggle /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><PresetPicker /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><TypographyPicker /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><MorphismPicker /></div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4"><span className="text-sm">{t("settings.language")}</span><LanguageSwitcher /></div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer définitivement ce compte ?"
        description="Cette action supprime le compte Supabase et les données liées. Pour votre sécurité, connectez-vous à nouveau si votre dernière connexion date de plus de 15 minutes."
        confirmLabel="Supprimer mon compte"
        onConfirm={removeAccount}
      />
    </Container>
  )
}
