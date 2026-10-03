import { Phone } from "lucide-react"
import { Link, Navigate } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"

/**
 * Contacter la mairie : décision du plan (n° 4) — un compte est nécessaire pour envoyer une demande, afin de pouvoir la suivre.
 * Un habitant connecté est envoyé directement vers le formulaire ; un visiteur voit comment faire et les numéros d'urgence.
 */
export function ContactPage() {
  const { user, loading } = useAuth()
  const { tx } = useLocale()

  if (!loading && user) return <Navigate to="/app/requests/new?service=citizen-relations" replace />

  return (
    <Container className="max-w-3xl py-12">
      <title>{tx("Contacter la mairie", "Contact city hall")}</title>
      <PageHeader
        eyebrow={tx("Contact", "Contact")}
        title={tx("Contacter la mairie", "Contact city hall")}
        description={tx("Pour suivre votre demande de bout en bout, un compte habitant est nécessaire.", "To follow your request from start to finish, a resident account is needed.")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border bg-card p-5" aria-labelledby="c-account">
          <h2 id="c-account" className="font-semibold">{tx("Envoyer une demande", "Send a request")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tx("Connectez-vous ou créez un compte : vous recevrez un numéro de suivi et serez notifié à chaque étape.", "Log in or create an account: you will get a tracking number and be notified at every step.")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/connexion">{tx("Se connecter", "Log in")}</Link></Button>
            <Button asChild variant="outline"><Link to="/inscription">{tx("Créer un compte", "Create an account")}</Link></Button>
          </div>
        </section>
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5" aria-labelledby="c-emergency">
          <h2 id="c-emergency" className="font-semibold">{tx("Urgence ?", "Emergency?")}</h2>
          <ul className="mt-2 grid gap-2">
            {[["Police", "+999 112"], ["Pompiers", "+999 118"], ["Urgences médicales", "+999 115"]].map(([name, phone]) => (
              <li key={phone}><Button asChild variant="outline" size="sm"><a href={`tel:${phone.replace(/\s/g, "")}`}><Phone aria-hidden />{name} · {phone}</a></Button></li>
            ))}
          </ul>
        </section>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {tx("Vous cherchez un service précis ? ", "Looking for a specific service? ")}<Link to="/services" className="underline underline-offset-4">{tx("Consultez la liste des services", "Browse the list of services")}</Link>.
      </p>
    </Container>
  )
}
