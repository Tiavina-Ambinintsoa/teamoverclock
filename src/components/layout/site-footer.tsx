import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { AuroraTitle, TextAnimate } from "@/components/magic-ui"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export function SiteFooter() {
  const { tx } = useLocale()

  return (
    <footer className="mt-20 border-t bg-muted/30 py-12 text-sm text-muted-foreground">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold text-foreground">
              <AuroraTitle>{SITE.name}</AuroraTitle>
            </p>
            <TextAnimate as="p" by="word" animation="blurInUp" className="mt-3 leading-6">
              {tx(SITE.tagline, "The futuristic city: services, a hive map, reports and alerts.")}
            </TextAnimate>
            <p className="mt-5 text-xs">{tx("Simulation : toutes les données de Nova Terra sont fictives.", "Simulation: all Nova Terra data is fictional.")}</p>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{tx("À propos", "About")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/equipe">{tx("L'équipe", "Team")}</Link></li>
              <li><Link className="hover:text-foreground" to="/contact">{tx("Contact", "Contact")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{tx("Liens utiles", "Useful links")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/connexion">{tx("Se connecter", "Sign in")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{tx("Mentions légales", "Legal")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/conditions">{tx("Mentions légales", "Legal notice")}</Link></li>
              <li><Link className="hover:text-foreground" to="/confidentialite">{tx("Confidentialité", "Privacy")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. {tx("Tous droits réservés.", "All rights reserved.")}</p>
          <p>24h by Webcup Madagascar · Team Overclock</p>
        </div>
      </Container>
    </footer>
  )
}
