import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { AccessibilityPanel } from "@/features/accessibility/accessibility-panel"
import { useLocale } from "@/lib/locale"

/** Page dédiée aux réglages d'accessibilité (profils vision / voix, thème contrasté, taille du texte). */
export function AccessibilityPage() {
  const { tx } = useLocale()
  return (
    <Container className="max-w-3xl">
      <title>{tx("Accessibilité", "Accessibility")}</title>
      <PageHeader
        eyebrow={tx("Mon espace", "My space")}
        title={tx("Accessibilité", "Accessibility")}
        description={tx("Contraste, taille du texte, lecture de l'écran et navigation vocale.", "Contrast, text size, screen reading and voice navigation.")}
      />
      <AccessibilityPanel />
    </Container>
  )
}
