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
import { supabase } from "@/lib/supabase"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

export function TeamPage() {
  const { t, tx } = useLocale()
  const roles = [
    tx("Produit et pitch", "Product and presentation"),
    tx("Design et interface", "Design and interface"),
    tx("Développement", "Development"),
    tx("Données et déploiement", "Data and deployment"),
  ]
  return (
    <Container className="py-16 sm:py-24">
      <title>{tx("Équipe Nova Terra", "Nova Terra team")}</title>
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">{tx("À propos", "About us")}</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold sm:text-6xl"><AuroraTitle>{t("team.title")}</AuroraTitle></h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("team.intro")}</p>

      <section className="mt-14" aria-labelledby="team-title">
        <div className="mb-5 flex items-center gap-2"><Users className="size-5 text-primary" aria-hidden /><h2 id="team-title" className="text-2xl font-semibold">{tx("Les membres", "Team members")}</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.team.map((member, index) => (
            <article key={member.name + index} className="rounded-2xl border bg-card p-5">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{member.name.slice(0, 1)}</div>
              <h3 className="mt-4 font-semibold">{member.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{roles[index] ?? member.role}</p>
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
  const { tx } = useLocale()
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (data.get("website")) return
    if (!supabase) {
      toast.error(tx("Configurez Supabase et déployez la fonction contact-submit pour recevoir les messages.", "Configure Supabase and deploy the contact-submit function to receive messages."))
      return
    }
    setBusy(true)
    try {
      const { data: result, error } = await supabase.functions.invoke("contact-submit", {
        body: {
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
          website: String(data.get("website") ?? ""),
        },
      })
      if (error) throw new Error(error.message)
      if (result?.error) throw new Error(result.error)
      form.reset()
      toast.success(result?.emailSent
        ? tx("Message envoyé. Nous vous répondrons bientôt.", "Message sent. We will reply soon.")
        : tx("Message enregistré. L'e-mail de notification sera activé après la configuration de Resend.", "Message saved. Email notifications will be enabled after Resend is configured."))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tx("Le message n'a pas pu être envoyé.", "The message could not be sent."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
      <title>{tx("Contact · Nova Terra", "Contact page · Nova Terra")}</title>
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">{tx("Échangeons", "Get in touch")}</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-6xl"><AuroraTitle>{tx("Une question ?", "Have a question?")}</AuroraTitle></h1>
        <p className="mt-5 max-w-lg text-lg text-muted-foreground">{tx("Laissez un message. Le formulaire est prêt à être relié à une adresse ou à une fonction serveur.", "Leave us a message. This form can be connected to an email address or a server function.")}</p>
        <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><Mail className="size-4 text-primary" aria-hidden />{tx("Formulaire de contact", "Contact form")}</div>
      </div>
      <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-8">
        <div className="grid gap-2"><Label htmlFor="contact-name">{tx("Nom", "Name")}</Label><Input id="contact-name" name="name" autoComplete="name" required /></div>
        <div className="grid gap-2"><Label htmlFor="contact-email">{tx("Adresse e-mail", "Email address")}</Label><Input id="contact-email" name="email" type="email" autoComplete="email" required /></div>
        <div className="grid gap-2"><Label htmlFor="contact-message">{tx("Message", "Message")}</Label><Textarea id="contact-message" name="message" rows={5} required /></div>
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><Label htmlFor="contact-website">{tx("Ne pas remplir", "Do not fill in")}</Label><Input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <Button type="submit" disabled={busy}>{busy ? tx("Envoi…", "Sending…") : tx("Envoyer le message", "Send message")} <ArrowRight aria-hidden /></Button>
        <p className="text-xs text-muted-foreground">{tx("Les messages sont enregistrés côté serveur. Une notification par e-mail nécessite les secrets Resend.", "Messages are stored on the server. Email notifications require the Resend secrets.")}</p>
      </form>
    </Container>
  )
}

function LegalPage({ privacy = false }: { privacy?: boolean }) {
  const { tx } = useLocale()
  const title = privacy ? tx("Politique de confidentialité", "Privacy policy") : tx("Mentions légales et conditions", "Legal notice and terms")
  return (
    <Container className="max-w-4xl py-16 sm:py-24">
      <title>{title} · Nova Terra</title>
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck aria-hidden /></div>
      <h1 className="mt-5 text-4xl font-semibold"><AuroraTitle>{title}</AuroraTitle></h1>
      {privacy ? (
        <div className="mt-10 grid gap-6 leading-7 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">{tx("Quelles informations sont utilisées ?", "What information is used?")}</h2>
            <p className="mt-2">{tx("Le service conserve les informations de compte et de profil (nom, adresse e-mail, téléphone, date de naissance, langue et secteur de résidence), vos demandes, rendez-vous, signalements, votes et commentaires, ainsi que les notifications qui vous sont adressées. Les pièces jointes et les informations nécessaires au traitement d'une demande peuvent aussi être associées à votre compte.", "The service stores account and profile information (name, email address, phone number, date of birth, language and residential sector), your requests, appointments, reports, votes and comments, and notifications sent to you. Attachments and information needed to process a request may also be linked to your account.")}</p>
            <p className="mt-2">{tx("Les informations de santé sont facultatives. Elles ne sont conservées que si vous donnez votre accord dans les paramètres et sont utilisées pour adapter vos conseils de sécurité. Elles ne sont pas affichées publiquement ni incluses dans les alertes envoyées aux autres habitants.", "Health information is optional. It is stored only if you consent in Settings and is used to tailor safety advice. It is not shown publicly or included in alerts sent to other residents.")}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">{tx("Pourquoi ces informations sont-elles utilisées ?", "Why is this information used?")}</h2>
            <p className="mt-2">{tx("Elles servent à ouvrir et suivre vos demandes et signalements, gérer vos rendez-vous, vous informer des changements importants, protéger les comptes et produire des statistiques de participation. Les statistiques de vote destinées aux responsables sont agrégées et ne montrent pas l'identité des votants.", "This information is used to create and track your requests and reports, manage appointments, tell you about important changes, protect accounts and produce participation statistics. Voting statistics for administrators are aggregated and do not identify voters.")}</p>
            <p className="mt-2">{tx("Les agents habilités peuvent consulter les informations nécessaires au traitement des dossiers de leur service. Les signalements publiés, commentaires de projets et autres contenus indiqués comme publics peuvent être visibles par les visiteurs. N'incluez pas d'information sensible dans une contribution publique.", "Authorized staff can view the information needed to handle cases for their service. Published reports, project comments and other content marked public may be visible to visitors. Do not include sensitive information in a public contribution.")}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">{tx("Stockage, assistant et durée", "Storage, assistant and retention")}</h2>
            <p className="mt-2">{tx("Les données de compte sont stockées dans le projet Supabase configuré par la ville. Lorsque l'assistant IA est activé et que vous l'utilisez, votre question peut être envoyée au fournisseur d'IA configuré pour préparer une réponse ; n'y indiquez pas de données sensibles. Les informations de santé ne sont pas envoyées à l'assistant pour personnaliser les alertes.", "Account data is stored in the Supabase project configured by the city. When the AI assistant is enabled and you use it, your question may be sent to the configured AI provider to prepare an answer; do not include sensitive data. Health information is not sent to the assistant to personalize alerts.")}</p>
            <p className="mt-2">{tx("Si un rédacteur choisit l'outil de traduction IA, les textes du contenu en cours de rédaction sont transmis au fournisseur configuré. Les traductions doivent être relues avant publication.", "If an editor chooses the AI translation tool, the content being drafted is sent to the configured provider. Translations must be reviewed before publication.")}</p>
            <p className="mt-2">{tx("Les informations restent disponibles tant que votre compte et les dossiers associés sont conservés. La suppression d'un compte est accessible dans les paramètres. La durée de conservation des sauvegardes dépend de la configuration du projet.", "Information remains available while your account and related cases are retained. You can delete your account in Settings. Backup retention depends on the project's configuration.")}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">{tx("Vos choix", "Your choices")}</h2>
            <p className="mt-2">{tx("Depuis les paramètres, vous pouvez corriger certaines informations, retirer votre accord pour les recommandations de santé, télécharger une copie des rubriques de votre choix ou demander la suppression de votre compte. Les autorisations d'accès sont limitées par rôle et par service.", "In Settings, you can correct some information, withdraw consent for health recommendations, download a copy of selected sections or request account deletion. Access permissions are limited by role and service.")}</p>
            <Button asChild variant="link" className="mt-2 px-0"><Link to="/app/parametres">{tx("Ouvrir mes paramètres", "Open my settings")}</Link></Button>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">{tx("Responsable et contact", "Data controller and contact")}</h2>
            <p className="mt-2">{tx("Avant la mise en production, la ville doit compléter l'identité du responsable du traitement, ses coordonnées, les bases légales applicables et les durées de conservation exactes. Cette page décrit les fonctionnalités de l'application et ne remplace pas l'avis juridique du responsable.", "Before production, the city must provide the data controller's identity and contact details, the applicable legal bases and exact retention periods. This page describes the application's features and does not replace the controller's legal advice.")}</p>
            <Button asChild variant="link" className="mt-2 px-0"><Link to="/contact">{tx("Accéder au formulaire de contact", "Open the contact form")}</Link></Button>
          </section>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 leading-7 text-muted-foreground">
          <p className="rounded-lg border border-highlight/50 bg-highlight/10 p-4 text-sm">{tx("Modèle à compléter avant publication : ajoutez les informations juridiques propres à votre ville.", "Complete this template before publication with your city's legal information.")}</p>
          <section><h2 className="text-xl font-semibold text-foreground">{tx("Responsable du site", "Website owner")}</h2><p className="mt-2">{tx("Ajoutez le nom de l'équipe, les coordonnées de contact et les informations requises pour votre projet.", "Add the team name, contact details and information required for your project.")}</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">{tx("Utilisation du service", "Using the service")}</h2><p className="mt-2">{tx("Décrivez les règles applicables à l'accès, aux contributions et à l'utilisation du service.", "Describe the rules for access, contributions and use of the service.")}</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">{tx("Contact", "Contact")}</h2><p className="mt-2">{tx("Remplacez cet exemple par les coordonnées de votre équipe.", "Replace this example with your team's contact details.")}</p><Button asChild variant="link" className="mt-2 px-0"><Link to="/contact">{tx("Accéder au formulaire de contact", "Open the contact form")}</Link></Button></section>
        </div>
      )}
    </Container>
  )
}

export function LegalNoticePage() {
  return <LegalPage />
}

export function PrivacyPage() {
  return <LegalPage privacy />
}
