import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { AuroraTitle, TextAnimate } from "@/components/magic-ui"
import { useLocale } from "@/lib/locale"
import { SITE } from "@/lib/site"

export function SiteFooter() {
  const { t } = useLocale()

  return (
    <footer className="mt-20 border-t bg-muted/30 py-12 text-sm text-muted-foreground">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold text-foreground">
              <AuroraTitle>{SITE.name}</AuroraTitle>
            </p>
            <TextAnimate as="p" by="word" animation="blurInUp" className="mt-3 leading-6">
              {SITE.tagline}
            </TextAnimate>
            <p className="mt-5 text-xs">Simulation : toutes les données de Nova Terra sont fictives.</p>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("footer.about")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/equipe">{t("nav.team")}</Link></li>
              <li><Link className="hover:text-foreground" to="/contact">{t("nav.contact")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("footer.links")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/connexion">{t("nav.login")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("footer.legal")}</h2>
            <ul className="mt-3 grid gap-2">
              <li><Link className="hover:text-foreground" to="/conditions">{t("footer.legal")}</Link></li>
              <li><Link className="hover:text-foreground" to="/confidentialite">{t("footer.privacy")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. {t("footer.rights")}</p>
          <p>24h by Webcup Madagascar · Team Overclock</p>
        </div>
      </Container>
    </footer>
  )
}
