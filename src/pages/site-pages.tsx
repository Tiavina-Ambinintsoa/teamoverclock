import { useState, type FormEvent } from "react"
import { ArrowRight, Mail, ShieldCheck, Users } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export function TeamPage() {
  const { t } = useLocale()
  return (
    <Container className="py-16 sm:py-24">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">À propos</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold sm:text-6xl">{t("team.title")}</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("team.intro")}</p>

      <section className="mt-14" aria-labelledby="team-title">
        <div className="mb-5 flex items-center gap-2"><Users className="size-5 text-primary" aria-hidden /><h2 id="team-title" className="text-2xl font-semibold">Les membres</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.team.map((member, index) => (
            <article key={member.name + index} className="rounded-2xl border bg-card p-5">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{member.name.slice(0, 1)}</div>
              <h3 className="mt-4 font-semibold">{member.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-muted/60 p-6 sm:p-9">
        <h2 className="text-2xl font-semibold">{t("team.method")}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{t("team.methodText")}</p>
      </section>
    </Container>
  )
}

export function ContactPage() {
  const [busy, setBusy] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (data.get("website")) return
    setBusy(true)
    window.setTimeout(() => {
      toast.success("Message prêt. Connectez ce formulaire à votre service d'envoi pour le recevoir.")
      form.reset()
      setBusy(false)
    }, 450)
  }

  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Échangeons</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-6xl">Une question ?</h1>
        <p className="mt-5 max-w-lg text-lg text-muted-foreground">Laissez un message. Le formulaire est prêt à être relié à une adresse ou à une fonction serveur.</p>
        <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><Mail className="size-4 text-primary" aria-hidden />Formulaire de contact</div>
      </div>
      <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-8">
        <div className="grid gap-2"><Label htmlFor="contact-name">Nom</Label><Input id="contact-name" name="name" autoComplete="name" required /></div>
        <div className="grid gap-2"><Label htmlFor="contact-email">Adresse e-mail</Label><Input id="contact-email" name="email" type="email" autoComplete="email" required /></div>
        <div className="grid gap-2"><Label htmlFor="contact-message">Message</Label><Textarea id="contact-message" name="message" rows={5} required /></div>
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><Label htmlFor="contact-website">Ne pas remplir</Label><Input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <Button type="submit" disabled={busy}>{busy ? "Envoi…" : "Envoyer le message"} <ArrowRight aria-hidden /></Button>
        <p className="text-xs text-muted-foreground">Le formulaire de démonstration ne transmet pas encore les messages.</p>
      </form>
    </Container>
  )
}

function LegalPage({ privacy = false }: { privacy?: boolean }) {
  const title = privacy ? "Politique de confidentialité" : "Mentions légales et conditions"
  return (
    <Container className="max-w-4xl py-16 sm:py-24">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck aria-hidden /></div>
      <h1 className="mt-5 text-4xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Modèle à compléter avant publication · TODO(webcup)</p>
      <div className="mt-10 grid gap-6 leading-7 text-muted-foreground">
        <section><h2 className="text-xl font-semibold text-foreground">Responsable du site</h2><p className="mt-2">Ajoutez le nom de l'équipe, les coordonnées de contact et les informations requises pour votre projet.</p></section>
        <section><h2 className="text-xl font-semibold text-foreground">{privacy ? "Données et finalités" : "Utilisation du service"}</h2><p className="mt-2">{privacy ? "Décrivez les données réellement collectées, leur durée de conservation, leur usage et les moyens de demander leur suppression." : "Décrivez les règles applicables à l'accès, aux contributions et à l'utilisation du service."}</p></section>
        <section><h2 className="text-xl font-semibold text-foreground">Contact</h2><p className="mt-2">Remplacez cet exemple par les coordonnées de votre équipe.</p><Button asChild variant="link" className="mt-2 px-0"><Link to="/contact">Accéder au formulaire de contact</Link></Button></section>
      </div>
    </Container>
  )
}

export function LegalNoticePage() {
  return <LegalPage />
}

export function PrivacyPage() {
  return <LegalPage privacy />
}
